
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, CalendarIcon, Building, Repeat, List, ChevronsUpDown, Check, AlertTriangle, HandCoins, Landmark, Settings, ChevronDown } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, isSameMonth, isSameYear, startOfDay, isAfter } from 'date-fns';
import type { Expense, Vendor, PendingBill } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExpensesTrackerProps {
  expenses: Expense[];
}

function AddOrEditVendorDialog({
  open,
  onOpenChange,
  onSave,
  existingVendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vendor: Omit<Vendor, 'id'> & { id?: string }) => void;
  existingVendor: Vendor | null;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  
  useEffect(() => {
    if (existingVendor) {
        setName(existingVendor.name);
        setCategory(existingVendor.category);
        setPhone(existingVendor.phone || '');
    } else {
        setName('');
        setCategory('');
        setPhone('');
    }
  }, [existingVendor, open]);

  const handleSave = () => {
    if (name && category) {
      onSave({
        id: existingVendor?.id,
        name,
        category,
        phone,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingVendor ? 'Edit' : 'Add'} Vendor</DialogTitle>
          <DialogDescription>
            Manage your suppliers and service providers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Vendor Name</Label>
            <Input id="vendor-name" placeholder="e.g., Local Farm Produce" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-category">Category</Label>
            <Input id="vendor-category" placeholder="e.g., Food & Beverage" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="vendor-phone">Mobile No. (Optional)</Label>
            <Input id="vendor-phone" placeholder="e.g., 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Vendor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ManageVendorsDialog({
  open,
  onOpenChange,
  vendors,
  onEditVendor,
  onDeleteVendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  onEditVendor: (vendor: Vendor) => void;
  onDeleteVendor: (vendorId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Vendors</DialogTitle>
          <DialogDescription>View, edit, or delete your vendors.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Mobile No.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.category}</TableCell>
                    <TableCell>{vendor.phone || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => onEditVendor(vendor)}>
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
                                  <AlertDialogDescription>
                                      This will permanently delete the vendor "{vendor.name}". This action cannot be undone.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteVendor(vendor.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No vendors found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function ExpensesTracker({ expenses }: ExpensesTrackerProps) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [isVendorAddDialogOpen, setIsVendorAddDialogOpen] = useState(false);
  const [isVendorManageDialogOpen, setIsVendorManageDialogOpen] = useState(false);
  const [isPendingBillDialogOpen, setIsPendingBillDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingPendingBill, setEditingPendingBill] = useState<PendingBill | null>(null);
  const [pendingBillType, setPendingBillType] = useState<'receivable' | 'payable'>('receivable');

  // Form state for Expenses
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorId, setVendorId] = useState<string | undefined>(undefined);
  
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const expenseCategory = selectedVendor?.category || 'Miscellaneous';

  const [customerPendingLimit, setCustomerPendingLimit] = useState(2000);
  const [vendorPendingLimit, setVendorPendingLimit] = useState(10000);
  
  useEffect(() => {
    const unsubVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
        setVendors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor)));
    });
    const unsubPendingBills = onSnapshot(collection(db, "pendingBills"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, dueDate: doc.data().dueDate?.toDate() } as PendingBill));
        setPendingBills(data);
    });
    return () => {
        unsubVendors();
        unsubPendingBills();
    };
  }, []);

  const totalReceivable = useMemo(() => pendingBills.filter(b => b.type === 'receivable').reduce((sum, b) => sum + b.amount, 0), [pendingBills]);
  const totalPayable = useMemo(() => pendingBills.filter(b => b.type === 'payable').reduce((sum, b) => sum + b.amount, 0), [pendingBills]);

  useEffect(() => {
    if (totalReceivable > customerPendingLimit) {
        toast({
            variant: "destructive",
            title: "Customer Pending Limit Exceeded",
            description: `Total amount to collect (Rs. ${totalReceivable.toFixed(2)}) has exceeded the Rs. ${customerPendingLimit.toFixed(2)} limit.`,
            duration: 10000,
        });
    }
  }, [totalReceivable, customerPendingLimit, toast]);

  useEffect(() => {
    if (totalPayable > vendorPendingLimit) {
        toast({
            variant: "destructive",
            title: "Vendor Payment Limit Exceeded",
            description: `Total amount to pay (Rs. ${totalPayable.toFixed(2)}) has exceeded the Rs. ${vendorPendingLimit.toFixed(2)} limit.`,
            duration: 10000,
        });
    }
  }, [totalPayable, vendorPendingLimit, toast]);


  const resetForm = () => {
    setEditingExpense(null);
    setDate(new Date());
    setDescription('');
    setAmount('');
    setVendorId(undefined);
  }

  const handleSetEditingExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setDate(expense.date);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setVendorId(expense.vendorId || undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleSaveExpense = async () => {
    if (!date || !amount) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill out date and amount." });
      return;
    }
    
    const categoryToSave = selectedVendor ? selectedVendor.category : 'Miscellaneous';
    
    const expenseData = {
        date,
        category: categoryToSave,
        description,
        amount: parseFloat(amount),
        vendorId: vendorId || null,
    };

    if (editingExpense?.id) {
        try {
            await updateDoc(doc(db, "expenses", editingExpense.id), expenseData);
            toast({ title: "Expense updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating expense" });
        }
    } else {
        try {
            await addDoc(collection(db, "expenses"), expenseData);
            toast({ title: "Expense added successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error adding expense" });
        }
    }
    resetForm();
  };

  const handleSaveVendor = async (vendor: Omit<Vendor, 'id'> & { id?: string }) => {
    const { id, ...vendorData } = vendor;
    if (id) {
        try {
            await updateDoc(doc(db, "vendors", id), vendorData);
            toast({ title: "Vendor updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating vendor" });
        }
    } else {
        try {
            await addDoc(collection(db, "vendors"), vendorData);
            toast({ title: "Vendor added successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error adding vendor" });
        }
    }
    setIsVendorAddDialogOpen(false);
  };
  
  const handleDeleteVendor = async (vendorId: string) => {
    try {
        await deleteDoc(doc(db, "vendors", vendorId));
        toast({ title: "Vendor deleted successfully" });
    } catch (error) {
        toast({ variant: "destructive", title: "Error deleting vendor" });
    }
  }

  const openAddVendorDialog = (vendor: Vendor | null) => {
    setEditingVendor(vendor);
    setIsVendorAddDialogOpen(true);
  }
  
  const openPendingBillDialog = (type: 'receivable' | 'payable', bill: PendingBill | null) => {
    setPendingBillType(type);
    setEditingPendingBill(bill);
    setIsPendingBillDialogOpen(true);
  }
  
  const handleSavePendingBill = async (billData: Omit<PendingBill, 'id'>) => {
    try {
        if (editingPendingBill?.id) {
            await updateDoc(doc(db, "pendingBills", editingPendingBill.id), billData);
            toast({ title: "Pending bill updated." });
        } else {
            await addDoc(collection(db, "pendingBills"), billData);
            toast({ title: "Pending bill added." });
        }
    } catch(e) {
        toast({ variant: "destructive", title: "Save failed." });
    }
  }
  
  const handleMarkAsPaid = async (billId: string) => {
    try {
        await deleteDoc(doc(db, "pendingBills", billId));
        toast({ title: "Bill marked as paid." });
    } catch(e) {
        toast({ variant: "destructive", title: "Operation failed." });
    }
  }

  const now = new Date();
  const dailyExpenses = expenses.filter(e => isSameDay(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyExpenses = expenses.filter(e => isSameMonth(e.date, now) && isSameYear(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const getVendorDetails = (vendorId: string | undefined | null) => vendorId ? vendors.find(v => v.id === vendorId) || null : null;

  return (
    <div className="p-4 space-y-6">
       <Card>
          <CardHeader>
              <CardTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
              <CardDescription>{editingExpense ? `Updating expense record for ${format(editingExpense.date, 'PPP')}` : 'Record a new business expense.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Select onValueChange={(value) => setVendorId(value === 'none' ? undefined : value)} value={vendorId || 'none'}>
                      <SelectTrigger id="vendor"><SelectValue placeholder="None" /></SelectTrigger>
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
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount (Rs.)</Label>
                    <Input id="amount" type="number" placeholder="e.g., 5000" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                {editingExpense && <Button variant="outline" onClick={resetForm}><Repeat className="mr-2 h-4 w-4" />Cancel Edit</Button>}
                <Button onClick={handleSaveExpense}><PlusCircle className="mr-2 h-4 w-4" /> {editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
                <Button variant="secondary" onClick={() => openAddVendorDialog(null)}><Building className="mr-2 h-4 w-4" /> Add Vendor</Button>
                <Button variant="secondary" onClick={() => setIsVendorManageDialogOpen(true)}><List className="mr-2 h-4 w-4" /> Show Vendors</Button>
            </div>
          </CardContent>
      </Card>
      
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingBillsCard 
            title="Pending to Collect from Customers"
            type="receivable"
            bills={pendingBills.filter(b => b.type === 'receivable')}
            onAdd={() => openPendingBillDialog('receivable', null)}
            onEdit={(bill) => openPendingBillDialog('receivable', bill)}
            onMarkPaid={handleMarkAsPaid}
            totalAmount={totalReceivable}
            limit={customerPendingLimit}
            setLimit={setCustomerPendingLimit}
            icon={<HandCoins className="h-6 w-6 text-green-600" />}
            amountColor="text-green-600"
        />
        <PendingBillsCard 
            title="Pending to Pay to Vendors"
            type="payable"
            bills={pendingBills.filter(b => b.type === 'payable')}
            onAdd={() => openPendingBillDialog('payable', null)}
            onEdit={(bill) => openPendingBillDialog('payable', bill)}
            onMarkPaid={handleMarkAsPaid}
            totalAmount={totalPayable}
            limit={vendorPendingLimit}
            setLimit={setVendorPendingLimit}
            icon={<Landmark className="h-6 w-6 text-red-600" />}
            amountColor="text-red-600"
        />
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>A log of all recorded business expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Vendor Mobile</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {expenses.length > 0 ? (
                    expenses.map((expense, index) => {
                      const vendor = getVendorDetails(expense.vendorId);
                      return (
                        <TableRow key={expense.id} className={cn(index % 2 === 0 ? 'bg-muted/50' : 'bg-background')}>
                            <TableCell>{format(expense.date, 'PPP')}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{vendor?.name || 'N/A'}</TableCell>
                            <TableCell>{vendor?.phone || 'N/A'}</TableCell>
                            <TableCell className="text-right font-mono text-red-600 dark:text-red-400">Rs. {expense.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })
                ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No expenses recorded yet.</TableCell></TableRow>
                )}
                </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">Today's Expenses</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-red-900 dark:text-red-100">Rs. {dailyExpenses.toFixed(2)}</p></CardContent>
              </Card>
              <Card className="bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">This Month's Expenses</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-orange-900 dark:text-orange-100">Rs. {monthlyExpenses.toFixed(2)}</p></CardContent>
              </Card>
              <Card className="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Overall Expenses</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">Rs. {totalExpenses.toFixed(2)}</p></CardContent>
              </Card>
          </div>
        </CardContent>
      </Card>
      
       <AddOrEditVendorDialog open={isVendorAddDialogOpen} onOpenChange={setIsVendorAddDialogOpen} onSave={handleSaveVendor} existingVendor={editingVendor}/>
       <ManageVendorsDialog open={isVendorManageDialogOpen} onOpenChange={setIsVendorManageDialogOpen} vendors={vendors} onEditVendor={(v) => { setIsVendorManageDialogOpen(false); setTimeout(() => openAddVendorDialog(v), 150)}} onDeleteVendor={handleDeleteVendor}/>
       <AddOrEditPendingBillDialog 
          key={editingPendingBill ? editingPendingBill.id : 'add-bill'}
          open={isPendingBillDialogOpen} 
          onOpenChange={(open) => {
            if (!open) {
                setEditingPendingBill(null);
            }
            setIsPendingBillDialogOpen(open);
          }}
          onSave={handleSavePendingBill} 
          bill={editingPendingBill} 
          type={pendingBillType} 
          vendors={vendors} 
        />
    </div>
  );
}

function PendingBillsCard({ title, type, bills, onAdd, onEdit, onMarkPaid, totalAmount, limit, setLimit, icon, amountColor }: {
  title: string;
  type: 'receivable' | 'payable';
  bills: PendingBill[];
  onAdd: () => void;
  onEdit: (bill: PendingBill) => void;
  onMarkPaid: (billId: string) => void;
  totalAmount: number;
  limit: number;
  setLimit: (limit: number) => void;
  icon: React.ReactNode;
  amountColor: string;
}) {
  const isOverLimit = totalAmount > limit;
  const progressValue = limit > 0 ? Math.min((totalAmount / limit) * 100, 100) : 0;
  const [isEditingLimit, setIsEditingLimit] = useState(false);

  const groupedBills = useMemo(() => {
    return bills.reduce((acc, bill) => {
      if (!acc[bill.name]) {
        acc[bill.name] = [];
      }
      acc[bill.name].push(bill);
      return acc;
    }, {} as Record<string, PendingBill[]>);
  }, [bills]);

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        {icon}
                        <CardTitle>{title}</CardTitle>
                    </div>
                    <CardDescription>Track and manage unsettled amounts.</CardDescription>
                </div>
                <Button onClick={onAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add New</Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                        Total Pending: Rs. {totalAmount.toFixed(2)} / Rs. 
                        {isEditingLimit ? (
                            <Input 
                                type="number" 
                                value={limit} 
                                onChange={(e) => setLimit(Number(e.target.value))}
                                onBlur={() => setIsEditingLimit(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingLimit(false); }}
                                className="inline-block w-24 h-7 ml-1"
                                autoFocus
                            />
                        ) : (
                            <span onClick={() => setIsEditingLimit(true)} className="cursor-pointer font-semibold underline decoration-dashed">{limit.toFixed(2)}</span>
                        )}
                    </span>
                    {isOverLimit && <AlertTriangle className="h-5 w-5 text-destructive" />}
                </div>
                <Progress value={progressValue} indicatorClassName={cn(isOverLimit ? "bg-destructive" : "bg-primary")} />
            </div>

            <div className="max-h-60 overflow-y-auto pr-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.keys(groupedBills).length > 0 ? (
                           Object.entries(groupedBills).map(([name, billGroup]) => {
                                const totalForGroup = billGroup.reduce((sum, b) => sum + b.amount, 0);
                                return (
                                <Collapsible key={name} asChild>
                                  <React.Fragment>
                                    <TableRow className="bg-muted/30">
                                        <TableCell>
                                          <CollapsibleTrigger className="flex items-center gap-2 font-medium w-full text-left">
                                            {name}
                                            <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                                          </CollapsibleTrigger>
                                        </TableCell>
                                        <TableCell className={cn("font-semibold", amountColor)}>Rs. {totalForGroup.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            {/* Actions for the whole group could go here */}
                                        </TableCell>
                                    </TableRow>
                                    <CollapsibleContent asChild>
                                      <React.Fragment>
                                        {billGroup.map(bill => {
                                          const isOverdue = bill.dueDate ? isAfter(new Date(), bill.dueDate) : false;
                                          return (
                                            <TableRow key={bill.id}>
                                              <TableCell className="pl-12 text-sm text-muted-foreground">{bill.dueDate ? format(bill.dueDate, 'PPP') : 'No due date'}</TableCell>
                                              <TableCell className={cn("text-sm", amountColor)}>Rs. {bill.amount.toFixed(2)}</TableCell>
                                              <TableCell className="text-right">
                                                  <Button variant="ghost" size="icon" onClick={() => onEdit(bill)}><Edit className="h-4 w-4" /></Button>
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Check className="h-4 w-4 text-green-600"/></Button></AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
                                                              <AlertDialogDescription>This will remove the pending bill of Rs. {bill.amount.toFixed(2)} for {bill.name}. This action cannot be undone.</AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => onMarkPaid(bill.id)}>Mark as Paid</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })}
                                      </React.Fragment>
                                    </CollapsibleContent>
                                  </React.Fragment>
                                </Collapsible>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending bills.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  )
}

function AddOrEditPendingBillDialog({ open, onOpenChange, onSave, bill, type, vendors }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bill: Omit<PendingBill, 'id'>) => void;
  bill: PendingBill | null;
  type: 'receivable' | 'payable';
  vendors: Vendor[];
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [vendorId, setVendorId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setAmount(String(bill.amount));
      setDueDate(bill.dueDate);
      if (type === 'payable') {
        const vendor = vendors.find(v => v.name === bill.name);
        setVendorId(vendor?.id);
      }
    } else {
      setName('');
      setAmount('');
      setDueDate(undefined);
      setVendorId(undefined);
    }
  }, [bill, open, type, vendors]);

  const handleSave = () => {
    if (!name || !amount) {
        toast({ variant: "destructive", title: "Name and Amount are required." });
        return;
    }
    onSave({ name, amount: parseFloat(amount), type, dueDate: dueDate || null });
    onOpenChange(false);
  };
  
  const handleVendorChange = (id: string) => {
    setVendorId(id);
    const vendor = vendors.find(v => v.id === id);
    if(vendor) setName(vendor.name);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bill ? 'Edit' : 'Add'} Pending Bill</DialogTitle>
          <DialogDescription>
            {type === 'receivable' ? 'Record a pending payment from a customer.' : 'Record a pending payment to a vendor.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{type === 'receivable' ? 'Customer Name' : 'Vendor Name'}</Label>
            {type === 'payable' ? (
                <Select onValueChange={handleVendorChange} value={vendorId}>
                    <SelectTrigger><SelectValue placeholder="Select a vendor..." /></SelectTrigger>
                    <SelectContent>
                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            ) : (
                <Input placeholder="e.g., John Doe" value={name} onChange={e => setName(e.target.value)} />
            )}
          </div>
          <div className="space-y-2">
            <Label>Amount (Rs.)</Label>
            <Input type="number" placeholder="e.g., 500" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Bill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
    