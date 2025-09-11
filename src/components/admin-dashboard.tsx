

"use client";

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Book, Download, TrendingUp, Settings, Package, User, ShoppingCart, History, Mail, Receipt, Edit, Trash2, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SalesReport from './sales-report';
import ActivityLog from './activity-log';
import InventoryManagement from './inventory-management';
import SystemSettings from './system-settings';
import BillHistory from './bill-history';
import type { Bill, Employee, OrderItem, Expense, Vendor } from '@/lib/types';
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDocs, collection, writeBatch, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';


const topItems: { name: string; count: number }[] = [];

// Mock data for CSV export
const salesData = [
    { date: '2024-07-27', orderId: 'K001', amount: 11.00, items: '2x Latte, 1x Croissant' },
    { date: '2024-07-27', orderId: 'K002', amount: 11.50, items: '1x Turkey Club, 1x Iced Tea' },
    { date: '2024-07-27', orderId: 'K003', amount: 2.50, items: '1x Espresso' },
];

interface AdminDashboardProps {
  billHistory: Bill[];
  employees: Employee[];
  expenses: Expense[];
}

export default function AdminDashboard({ billHistory, employees, expenses }: AdminDashboardProps) {
  const { toast } = useToast();
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [autoSendDaily, setAutoSendDaily] = useState(false);
  const [autoSendMonthly, setAutoSendMonthly] = useState(false);
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const unsubVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor));
        setVendors(data);
    });
    return () => unsubVendors();
  }, []);

  const todaysBills = useMemo(() => billHistory.filter(bill => format(bill.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')), [billHistory]);
  
  const totalRevenue = useMemo(() => todaysBills.reduce((sum, bill) => sum + bill.total, 0), [todaysBills]);
  const totalOrders = useMemo(() => todaysBills.length, [todaysBills]);
  const averageOrderValue = useMemo(() => (totalOrders > 0 ? totalRevenue / totalOrders : 0), [totalRevenue, totalOrders]);

  const allTimeItemCounts = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    billHistory.forEach(bill => {
      bill.orderItems.forEach((item: OrderItem) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [billHistory]);

  const topSellingItems = useMemo(() => allTimeItemCounts.slice(0, 5), [allTimeItemCounts]);
  const leastSellingItems = useMemo(() => allTimeItemCounts.slice(-5).reverse(), [allTimeItemCounts]);


  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Summary Section
    csvContent += "Summary\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Revenue (Today),${totalRevenue.toFixed(2)}\n`;
    csvContent += `Total Orders (Today),${totalOrders}\n`;
    csvContent += `Average Order Value (Today),${averageOrderValue.toFixed(2)}\n`;
    csvContent += "\n";

    // Top Selling Items
    csvContent += "Top Selling Items (All Time)\n";
    csvContent += "Item,Quantity Sold\n";
    topSellingItems.forEach(item => {
      csvContent += `${item.name},${item.count}\n`;
    });
    csvContent += "\n";

    // Least Selling Items
    csvContent += "Least Selling Items (All Time)\n";
    csvContent += "Item,Quantity Sold\n";
    leastSellingItems.forEach(item => {
      csvContent += `${item.name},${item.count}\n`;
    });
    csvContent += "\n";

    // Expenses
    csvContent += "Expenses\n";
    csvContent += "Date,Category,Description,Amount\n";
    expenses.forEach(expense => {
      csvContent += `${format(expense.date, 'yyyy-MM-dd')},${expense.category},"${expense.description || ''}",${expense.amount}\n`;
    });
    csvContent += "\n";
    
    // Bills
    csvContent += "Bill History\n";
    csvContent += 'id,tableId,total,timestamp,items\n';
    billHistory.forEach(bill => {
        const items = bill.orderItems.map(item => `${item.quantity}x ${item.name}`).join('; ');
        csvContent += `${bill.id},${bill.tableId},${bill.total},"${new Date(bill.timestamp).toISOString()}","${items}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'all_data_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSendReport = async (reportType: 'daily' | 'monthly' | 'yearly') => {
    setIsReportLoading(true);
    toast({
      title: 'Generating Report...',
      description: `Please wait while we generate the ${reportType} report. This may take a moment.`,
    });

    const input = {
      reportType,
      recipientEmail: 'upandabove.bir@gmail.com',
    };

    try {
      const result = await generateAndSendReport(input);
      if (result.success) {
        toast({
          title: 'Report Sent!',
          description: `The ${reportType} report has been sent successfully.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      console.error(`Failed to send ${reportType} report:`, e);
      toast({
        variant: 'destructive',
        title: 'Report Failed',
        description: e.message || `Could not send the ${reportType} report. Please try again.`,
      });
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseDialogOpen(true);
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
        await deleteDoc(doc(db, "expenses", expenseId));
        toast({ title: "Expense deleted successfully" });
    } catch (error) {
        toast({ variant: "destructive", title: "Error deleting expense" });
        console.error("Error deleting expense: ", error);
    }
  };
  
    const handleClearAllBills = async () => {
    try {
      const billsCollection = collection(db, "bills");
      const billsSnapshot = await getDocs(billsCollection);
      const batch = writeBatch(db);
      billsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({
        title: "All Bills Cleared",
        description: "The entire bill history has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error clearing all bills:", error);
      toast({
        variant: "destructive",
        title: "Clearing Failed",
        description: "There was an error clearing the bill history. Please try again.",
      });
    }
  };


  return (
    <div className="p-4 space-y-4">
      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Revenue</CardTitle>
            <span className="text-green-600 font-bold">Rs.</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-700 dark:text-green-300">Today's total sales</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalOrders}</div>
            <p className="text-xs text-blue-700 dark:text-blue-300">Today's total orders</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">Rs. {averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Average per order</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-800 dark:text-violet-200">Active Staff</CardTitle>
            <User className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">{employees.length}</div>
            <p className="text-xs text-violet-700 dark:text-violet-300">Total employees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Selling Items */}
        <Card className="lg:col-span-3 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-gray-200">Top Selling Items</CardTitle>
            <CardDescription>Today's most popular items.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSellingItems.length > 0 ? (
                  topSellingItems.map(item => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No items sold yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reports & Settings */}
        <Card className="lg:col-span-4 bg-muted/30">
          <CardHeader>
            <CardTitle>Reports & Settings</CardTitle>
            <CardDescription>Manage system data and configurations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <BarChart className="h-5 w-5" />
                  <span>View Sales Reports</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Sales Reports</DialogTitle>
                    <DialogDescription>A summary of sales activity across different periods.</DialogDescription>
                  </DialogHeader>
                  <SalesReport bills={billHistory} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <History className="h-5 w-5" />
                  <span>View Bill History</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Bill History</DialogTitle>
                  <DialogDescription>A log of all completed transactions.</DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                  <BillHistory bills={billHistory} onClearAll={handleClearAllBills} />
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="lg" className="justify-start gap-2" onClick={handleExportCSV}>
              <Download className="h-5 w-5" />
              <span>Export All Data (CSV)</span>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <Book className="h-5 w-5" />
                  <span>View Activity Logs</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activity Log</DialogTitle>
                  <DialogDescription>Recent activities across the system.</DialogDescription>
                </DialogHeader>
                <ActivityLog />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <Receipt className="h-5 w-5" />
                  <span>Manage Expenses</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Manage Expenses</DialogTitle>
                    <DialogDescription>Review and manage all business expenses.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Vendor Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length > 0 ? (
                            expenses.map(expense => {
                              const vendor = vendors.find(v => v.id === expense.vendorId);
                              return (
                                <TableRow key={expense.id}>
                                  <TableCell>{format(expense.date, 'PPP')}</TableCell>
                                  <TableCell>{vendor?.name || "N/A"}</TableCell>
                                  <TableCell>{expense.description}</TableCell>
                                  <TableCell className="text-right font-mono text-red-600 dark:text-red-400">Rs. {expense.amount.toFixed(2)}</TableCell>
                                  <TableCell className="text-center space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>This will permanently delete this expense. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">No expenses recorded.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <Package className="h-5 w-5" />
                  <span>Inventory Management</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Inventory Management</DialogTitle>
                    <DialogDescription>Track and manage your stock levels.</DialogDescription>
                  </DialogHeader>
                  <InventoryManagement />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                 <Button variant="outline" size="lg" className="justify-start gap-2">
                    <Settings className="h-5 w-5" />
                    <span>System Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                    <DialogTitle>System Settings</DialogTitle>
                    <DialogDescription>Manage general application settings.</DialogDescription>
                  </DialogHeader>
                  <SystemSettings />
              </DialogContent>
            </Dialog>
             <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Email Reports</CardTitle>
                <CardDescription>Send summary reports to the administrator.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                  <div className='flex flex-wrap gap-2'>
                    <Button variant="secondary" onClick={() => handleSendReport('daily')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Daily Report
                    </Button>
                    <Button variant="secondary" onClick={() => handleSendReport('monthly')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Monthly Report
                    </Button>
                    <Button variant="secondary" onClick={() => handleSendReport('yearly')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Yearly Report
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-daily" checked={autoSendDaily} onCheckedChange={setAutoSendDaily} />
                      <Label htmlFor="auto-daily">Auto-send Daily Report</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                      <Switch id="auto-monthly" checked={autoSendMonthly} onCheckedChange={setAutoSendMonthly} />
                      <Label htmlFor="auto-monthly">Auto-send Monthly Report</Label>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <ExpenseDialog 
        key={editingExpense ? editingExpense.id : 'add-expense'}
        isOpen={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        expense={editingExpense}
        vendors={vendors}
        onSave={(data) => {
            if (editingExpense) {
                updateDoc(doc(db, "expenses", editingExpense.id), data);
            } else {
                addDoc(collection(db, "expenses"), data);
            }
            setIsExpenseDialogOpen(false);
            setEditingExpense(null);
        }}
      />
    </div>
  );
}


function ExpenseDialog({
  isOpen,
  onOpenChange,
  expense,
  vendors,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  vendors: Vendor[];
  onSave: (data: any) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(expense?.date || new Date());
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [vendorId, setVendorId] = useState<string | undefined>(expense?.vendorId || undefined);

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const expenseCategory = selectedVendor?.category || 'Miscellaneous';

  useEffect(() => {
    if (expense) {
        setDate(expense.date);
        setDescription(expense.description);
        setAmount(String(expense.amount));
        setVendorId(expense.vendorId || undefined);
    } else {
        // Reset form for new expense
        setDate(new Date());
        setDescription('');
        setAmount('');
        setVendorId(undefined);
    }
  }, [expense, isOpen]);

  const handleSave = () => {
    const expenseData = {
      date,
      category: expenseCategory,
      description,
      amount: parseFloat(amount),
      vendorId: vendorId || null,
    };
    onSave(expenseData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit' : 'Add'} Expense</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Select onValueChange={(value) => setVendorId(value === 'none' ? undefined : value)} value={vendorId || 'none'}>
              <SelectTrigger id="vendor">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vendor Category</Label>
            <Input value={expenseCategory} readOnly className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" placeholder="e.g., Weekly vegetable purchase" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="amount">Amount (Rs.)</Label>
            <Input id="amount" type="number" placeholder="e.g., 5000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
