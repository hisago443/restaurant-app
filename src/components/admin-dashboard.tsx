

"use client";

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Book, Download, TrendingUp, Settings, Package, User, ShoppingCart, History, Mail, Receipt, Edit, Trash2, Building, Users, CreditCard, PlusCircle, Eye, Repeat, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SalesReport from './sales-report';
import InventoryManagement from './inventory-management';
import BillHistory from './bill-history';
import type { Bill, Employee, OrderItem, Expense, Vendor, InventoryItem, KOTPreference, MenuCategory } from '@/lib/types';
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDocs, collection, writeBatch, onSnapshot, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import StaffManagement from './staff-management';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';


const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

interface AdminDashboardProps {
  billHistory: Bill[];
  employees: Employee[];
  expenses: Expense[];
  inventory: InventoryItem[];
  customerCreditLimit: number;
  setCustomerCreditLimit: (limit: number) => void;
  vendorCreditLimit: number;
  setVendorCreditLimit: (limit: number) => void;
  onRerunSetup: () => void;
  kotPreference: KOTPreference;
  setKotPreference: (preference: KOTPreference) => void;
  menu: MenuCategory[];
}

export default function AdminDashboard({ 
    billHistory, 
    employees, 
    expenses,
    inventory,
    customerCreditLimit,
    setCustomerCreditLimit,
    vendorCreditLimit,
    setVendorCreditLimit,
    onRerunSetup,
    kotPreference,
    setKotPreference,
    menu,
}: AdminDashboardProps) {
  const { toast } = useToast();
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [autoSendDaily, setAutoSendDaily] = useState(false);
  const [autoSendMonthly, setAutoSendMonthly] = useState(false);
  
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const menuCategories = useMemo(() => menu.map(cat => cat.category), [menu]);

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

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Summary Section
    csvContent += "Summary\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Revenue (Today),${totalRevenue.toFixed(2)}\n`;
    csvContent += `Total Orders (Today),${totalOrders}\n`;
    csvContent += `Average Order Value (Today),${averageOrderValue.toFixed(2)}\n`;
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

  const generateNewEmployeeId = () => {
    const existingIds = employees.map(e => parseInt(e.id.replace('UA', ''), 10)).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `UA${(maxId + 1).toString().padStart(3, '0')}`;
  }

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      const newId = generateNewEmployeeId();
      const employeeRef = doc(db, "employees", newId);
      await setDoc(employeeRef, {...employee, id: newId});
      toast({ title: 'Employee Added', description: `${employee.name} saved with ID ${newId}.` });
    } catch (error) {
      console.error("Error adding employee: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the employee.' });
    }
  };

  const handleAddEmployee = (employee: Omit<Employee, 'id' | 'color'>) => {
    const newEmployee: Omit<Employee, 'id'> = {
      ...employee,
      color: colors[employees.length % colors.length]
    };
    addEmployee(newEmployee);
  }
  
  const updateEmployee = async (employee: Employee) => {
    try {
      const employeeRef = doc(db, "employees", employee.id);
      await setDoc(employeeRef, {
        name: employee.name,
        role: employee.role,
        salary: employee.salary,
        color: employee.color,
      }, { merge: true });
      toast({ title: 'Employee Updated', description: 'Employee information has been updated.' });
    } catch (error) {
      console.error("Error updating employee: ", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update employee details.' });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
      updateEmployee(employee);
      setEditingEmployee(null);
  }

  const deleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, "employees", employeeId));
      toast({ title: 'Employee Deleted', description: 'Employee has been removed from the database.' });
    } catch (error) {
      console.error("Error deleting employee: ", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the employee.' });
    }
  };

  const handleDeleteEmployee = (employeeId: string) => {
      deleteEmployee(employeeId);
  }
  
  const openEditEmployeeDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  }
  
  const handleKotCategoryChange = (category: string, checked: boolean) => {
    const currentCategories = kotPreference.categories || [];
    let newCategories: string[];

    if (checked) {
        newCategories = [...currentCategories, category];
    } else {
        newCategories = currentCategories.filter(c => c !== category);
    }
    
    setKotPreference({
        ...kotPreference,
        categories: newCategories,
    });
  };


  return (
    <div className="p-6 space-y-6 bg-muted/30">
      {/* Daily Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Revenue (Today)</CardTitle>
            <span className="text-green-600 font-bold">Rs.</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Orders (Today)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">Rs. {averageOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Active Staff</CardTitle>
            <User className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{employees.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardContent className="p-2">
                   <SalesReport bills={billHistory} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Action Center</CardTitle>
                    <CardDescription>Quick access to management tasks.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2">
                          <History className="h-6 w-6" />
                          <span>View Bills</span>
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
                    <Dialog open={isStaffManagerOpen} onOpenChange={setIsStaffManagerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2">
                                <Users className="h-6 w-6" />
                                <span>Manage Staff</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Staff Management</DialogTitle>
                                <DialogDescription>Add, edit, or remove staff members.</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                                <Button onClick={() => { setEditingEmployee(null); setIsAddEmployeeDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                                </Button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Salary (Rs.)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{employee.id}</TableCell>
                                            <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                                                {employee.name}
                                            </div>
                                            </TableCell>
                                            <TableCell>{employee.role}</TableCell>
                                            <TableCell>{employee.salary.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditEmployeeDialog(employee)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Eye className="h-4 w-4" />
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
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete {employee.name}'s record.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2">
                                <Package className="h-6 w-6" />
                                <span>Inventory</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl">
                            <DialogHeader>
                                <DialogTitle>Inventory Management</DialogTitle>
                            </DialogHeader>
                            <InventoryManagement inventory={inventory} menu={menu} setMenu={() => {}} />
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2" onClick={handleExportCSV}>
                        <Download className="h-6 w-6" />
                        <span>Export Data</span>
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Separator />
                     <div className="space-y-4 pt-4">
                        <CardTitle className="text-base flex items-center gap-2"><Printer /> KOT Preferences</CardTitle>
                        <RadioGroup 
                          value={kotPreference.type} 
                          onValueChange={(type) => setKotPreference({ ...kotPreference, type: type as any, categories: type !== 'category' ? [] : kotPreference.categories })}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="single" id="kot-single" />
                            <Label htmlFor="kot-single">Single Combined KOT</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="separate" id="kot-separate" />
                            <Label htmlFor="kot-separate">Separate Kitchen & Bar KOTs</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="category" id="kot-category" />
                            <Label htmlFor="kot-category">Separate KOT for Specific Categories</Label>
                          </div>
                        </RadioGroup>

                        {kotPreference.type === 'category' && (
                            <div className="pl-6 pt-2 space-y-2 max-h-48 overflow-y-auto">
                                <Label className="font-semibold">Select categories for separate KOTs:</Label>
                                {menuCategories.filter(cat => cat !== 'Beverages').map(category => (
                                    <div key={category} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${category}`}
                                            checked={(kotPreference.categories || []).includes(category)}
                                            onCheckedChange={(checked) => handleKotCategoryChange(category, !!checked)}
                                        />
                                        <Label htmlFor={`cat-${category}`} className="font-normal cursor-pointer">{category}</Label>
                                    </div>
                                ))}
                            </div>
                        )}
                     </div>
                     <Separator />
                     <div className="space-y-4 pt-4">
                        <CardTitle className="text-base flex items-center gap-2"><Mail /> Email Reports</CardTitle>
                        <div className='flex flex-wrap gap-2'>
                            <Button variant="secondary" onClick={() => handleSendReport('daily')} disabled={isReportLoading}>
                                Send Daily
                            </Button>
                            <Button variant="secondary" onClick={() => handleSendReport('monthly')} disabled={isReportLoading}>
                                Send Monthly
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                            <Switch id="auto-daily" checked={autoSendDaily} onCheckedChange={setAutoSendDaily} />
                            <Label htmlFor="auto-daily">Auto-send Daily Report</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                            <Switch id="auto-monthly" checked={autoSendMonthly} onCheckedChange={setAutoSendMonthly} />
                            <Label htmlFor="auto-monthly">Auto-send Monthly Report</Label>
                            </div>
                        </div>
                     </div>
                     <Separator />
                     <div className="space-y-4 pt-4">
                        <CardTitle className="text-base flex items-center gap-2"><CreditCard /> Financial Settings</CardTitle>
                        <div className="space-y-2">
                            <Label htmlFor="customer-limit">Customer Credit Limit (Rs.)</Label>
                            <Input
                                id="customer-limit"
                                type="number"
                                value={customerCreditLimit}
                                onChange={(e) => setCustomerCreditLimit(Number(e.target.value))}
                                placeholder="e.g., 10000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor-limit">Vendor Credit Limit (Rs.)</Label>
                            <Input
                                id="vendor-limit"
                                type="number"
                                value={vendorCreditLimit}
                                onChange={(e) => setVendorCreditLimit(Number(e.target.value))}
                                placeholder="e.g., 50000"
                            />
                        </div>
                     </div>
                     <Separator />
                     <div className="space-y-4 pt-4">
                        <CardTitle className="text-base flex items-center gap-2"><Settings /> System Settings</CardTitle>
                        <Button variant="outline" className="w-full" onClick={onRerunSetup}>
                          <Repeat className="mr-2 h-4 w-4" /> Rerun Setup Wizard
                        </Button>
                     </div>
                </CardContent>
            </Card>
        </div>
      </div>

       <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isAddEmployeeDialogOpen || isEditEmployeeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEmployee(null);
            setIsAddEmployeeDialogOpen(false);
            setIsEditEmployeeDialogOpen(false);
          } else if (editingEmployee) {
            setIsEditEmployeeDialogOpen(true);
          } else {
            setIsAddEmployeeDialogOpen(true);
          }
        }}
        employee={editingEmployee}
        onSave={(employeeData) => {
            if (editingEmployee) {
                handleEditEmployee({ ...editingEmployee, ...employeeData });
            } else {
                handleAddEmployee(employeeData as Omit<Employee, 'id' | 'color'>);
            }
        }}
      />
    </div>
  );
}


function EmployeeDialog({ open, onOpenChange, employee, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null; onSave: (data: Omit<Employee, 'id' | 'color'> & {id?: string}) => void;}) {
    
    const [name, setName] = useState(employee?.name || '');
    const [role, setRole] = useState(employee?.role || '');
    const [salary, setSalary] = useState(employee?.salary?.toString() || '');
    
    useEffect(() => {
        if (open) {
            setName(employee?.name || '');
            setRole(employee?.role || '');
            setSalary(employee?.salary?.toString() || '');
        }
    }, [open, employee]);
    
    const handleSave = () => {
        const data: Omit<Employee, 'color' | 'id'> & {id?: string} = { name, role, salary: parseFloat(salary) };
        if (employee) {
            data.id = employee.id;
        }
        onSave(data);
        onOpenChange(false);
    }

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <DialogHeader>
                    <DialogTitle>{employee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                    <Label htmlFor="name">Employee Name</Label>
                    <Input id="name" placeholder="e.g., John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole} required>
                        <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Head Chef">Head Chef</SelectItem>
                        <SelectItem value="Chef">Chef</SelectItem>
                        <SelectItem value="Waiter">Waiter</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                        <SelectItem value="Helper">Helper</SelectItem>
                        <SelectItem value="Bar Tender">Bar Tender</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input id="salary" type="number" placeholder="e.g., 30000" value={salary} onChange={(e) => setSalary(e.target.value)} required/>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Employee</Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}

    

    

    

