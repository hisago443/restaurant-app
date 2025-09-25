
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch, getDocs, query, where, documentId, setDoc, getDoc } from 'firebase/firestore';
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
import type { Expense, Vendor, PendingBill, PendingBillTransaction, Customer } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExpensesTrackerProps {
  expenses: Expense[];
  customerCreditLimit: number;
  vendorCreditLimit: number;
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

function AddOrEditPendingBillDialog({
  open,
  onOpenChange,
  onSave,
  existingNames,
  type,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, amount: number, mobile?: string, dueDate?: Date) => void;
  existingNames: string[];
  type: 'customer' | 'vendor';
}) {
  const [isNew, setIsNew] = useState(true);
  const [selectedName, setSelectedName] = useState('');
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [mobile, setMobile] = useState('');

  useEffect(() => {
    if (open) {
      setIsNew(true);
      setSelectedName('');
      setNewName('');
      setAmount('');
      setDueDate(undefined);
      setMobile('');
    }
  }, [open]);

  const handleSave = () => {
    const finalName = isNew ? newName : selectedName;
    if (!finalName || !amount) {
      alert('Please provide a name and amount.');
      return;
    }
    onSave(finalName, parseFloat(amount), mobile, dueDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Pending Bill</DialogTitle>
          <DialogDescription>
            Record a new transaction for a {type}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select or Add {type === 'customer' ? 'Customer' : 'Vendor'}</Label>
            <div className="flex items-center gap-4">
              <Button 
                variant={!isNew ? "default" : "outline"} 
                onClick={() => setIsNew(false)}
                className={cn(!isNew && "bg-primary text-primary-foreground")}
              >
                Existing
              </Button>
              <Button 
                variant={isNew ? "default" : "outline"} 
                onClick={() => setIsNew(true)}
                className={cn(isNew && "bg-primary text-primary-foreground")}
              >
                New
              </Button>
            </div>
            {isNew ? (
              <Input
                placeholder={`New ${type} name`}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            ) : (
              <Select onValueChange={setSelectedName} value={selectedName}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select existing ${type}`} />
                </SelectTrigger>
                <SelectContent>
                  {existingNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile No. (Optional)</Label>
              <Input id="mobile" placeholder="e.g., 9876543210" value={mobile} onChange={e => setMobile(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Rs.)</Label>
            <Input id="amount" type="number" placeholder="e.g., 500" value={amount} onChange={e => setAmount(e.target.value)} />
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
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
              </PopoverContent>
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


function PendingBillsCard({
  title,
  icon,
  bills,
  type,
  onAddTransaction,
  onClearAll,
  onSettleTransaction,
  totalLimit,
  allNames = [],
}: {
  title: string;
  icon: React.ElementType;
  bills: PendingBill[];
  type: 'customer' | 'vendor';
  onAddTransaction: (name: string, amount: number, mobile?: string, dueDate?: Date) => void;
  onClearAll: (billId: string) => void;
  onSettleTransaction: (billId: string, transactionId: string, amount: number) => void;
  totalLimit: number;
  allNames?: string[];
}) {
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  
  const totalPending = useMemo(() => bills.reduce((total, bill) => {
    return total + bill.transactions.reduce((sum, t) => sum + t.amount, 0);
  }, 0), [bills]);
  
  const totalProgress = totalLimit > 0 ? (totalPending / totalLimit) * 100 : 0;
  
  const existingNames = useMemo(() => {
    const billNames = new Set(bills.map(b => b.name));
    allNames.forEach(name => billNames.add(name));
    return Array.from(billNames);
  }, [bills, allNames]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            {React.createElement(icon, { className: "h-6 w-6" })}
            {title}
          </CardTitle>
          <Button onClick={() => setIsAddBillOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        </div>
        <CardDescription>
          Total Pending: <span className={cn("font-bold", type === 'customer' ? 'text-green-600' : 'text-red-600')}>Rs. {totalPending.toFixed(2)}</span>
        </CardDescription>
         <div className="space-y-1 mt-2">
            <div className="flex justify-between items-center text-sm">
                <span className={cn("font-bold", type === 'customer' ? 'text-green-600' : 'text-red-600')}>
                  Rs. {totalPending.toFixed(2)}
                </span>
                <span className="text-muted-foreground">Overall Limit: Rs. {totalLimit.toLocaleString()}</span>
            </div>
            <Progress value={totalProgress} indicatorClassName={totalProgress > 100 ? "bg-red-500" : (type === 'customer' ? 'bg-green-500' : 'bg-red-500')} />
          </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {bills.map((bill) => {
            const totalForName = bill.transactions.reduce((sum, t) => sum + t.amount, 0);
            return (
              <Collapsible key={bill.id} className="p-2 border rounded-lg">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex flex-grow items-center gap-2 text-left">
                     <ChevronsUpDown className="h-4 w-4" />
                     <span className="font-medium">{bill.name}</span>
                     <span className={cn("font-semibold text-sm", type === 'customer' ? 'text-green-600' : 'text-red-600')}>
                        (Rs. {totalForName.toFixed(2)})
                      </span>
                  </CollapsibleTrigger>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">Clear All</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will mark all pending bills for {bill.name} as paid and clear their balance. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onClearAll(bill.id)}>Confirm</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <CollapsibleContent className="mt-2 space-y-1 pr-2 max-h-48 overflow-y-auto">
                  {bill.transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-1.5 bg-muted/50 rounded-md text-sm group">
                      <div>
                        <span>{format(tx.date, 'PPP')}</span>
                        <span className={cn("font-semibold ml-4", type === 'customer' ? 'text-green-700' : 'text-red-700')}>Rs. {tx.amount.toFixed(2)}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7">Settle</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Settle this transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will settle the transaction of Rs. {tx.amount.toFixed(2)} for {bill.name}. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onSettleTransaction(bill.id, tx.id, tx.amount)}>Settle</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
        <AddOrEditPendingBillDialog
            open={isAddBillOpen}
            onOpenChange={setIsAddBillOpen}
            onSave={onAddTransaction}
            existingNames={existingNames}
            type={type}
        />
      </CardContent>
    </Card>
  );
}


export default function ExpensesTracker({ expenses, customerCreditLimit, vendorCreditLimit }: ExpensesTrackerProps) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isVendorAddDialogOpen, setIsVendorAddDialogOpen] = useState(false);
  const [isVendorManageDialogOpen, setIsVendorManageDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form state for Expenses
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorId, setVendorId] = useState<string | undefined>(undefined);
  
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const expenseCategory = selectedVendor?.category || 'Miscellaneous';
  
  useEffect(() => {
    const unsubVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
        setVendors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor)));
    });
     const unsubPendingBills = onSnapshot(collection(db, 'pendingBills'), (snapshot) => {
      const bills = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          transactions: (data.transactions || []).map((tx: any) => ({...tx, date: tx.date.toDate()})),
        } as PendingBill;
      });
      setPendingBills(bills);
    });
    
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
        const custs = snapshot.docs.map(doc => doc.data() as Customer);
        setCustomers(custs);
    });

    return () => {
        unsubVendors();
        unsubPendingBills();
        unsubCustomers();
    };
  }, []);


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
  
  const handleAddPendingTransaction = async (name: string, amount: number, type: 'customer' | 'vendor', mobile?: string, dueDate?: Date) => {
    const existingBillQuery = query(collection(db, 'pendingBills'), where('name', '==', name), where('type', '==', type));
    const querySnapshot = await getDocs(existingBillQuery);
    
    const newTransaction: PendingBillTransaction = {
      id: doc(collection(db, 'some-subcollection')).id, // Firestore auto-ID
      amount,
      date: new Date(),
      description: '',
    };

    if (!querySnapshot.empty) {
      const existingBillDoc = querySnapshot.docs[0];
      const existingBill = existingBillDoc.data() as PendingBill;
      await updateDoc(existingBillDoc.ref, {
        transactions: [...existingBill.transactions, newTransaction]
      });
    } else {
      const newBill: Omit<PendingBill, 'id'> = {
        name,
        type,
        transactions: [newTransaction],
        ...(mobile && { mobile }),
      };
      await addDoc(collection(db, 'pendingBills'), newBill);
    }
    toast({ title: 'Pending bill added.' });
  };
  
  const handleClearAllPendingBillsForPerson = async (billId: string) => {
    const billDocRef = doc(db, 'pendingBills', billId);
    const billSnapshot = await getDoc(billDocRef);

    if (!billSnapshot.exists()) {
      toast({ variant: "destructive", title: "Error", description: "Bill not found." });
      return;
    }

    const bill = billSnapshot.data() as PendingBill;

    if (bill.type === 'vendor') {
      const totalPaid = bill.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const vendor = vendors.find(v => v.name.toLowerCase() === bill.name.toLowerCase());
      
      const expenseData = {
          date: new Date(),
          category: vendor?.category || 'Vendor Payment',
          description: `Cleared all pending bills for ${bill.name}.`,
          amount: totalPaid,
          vendorId: vendor?.id || null,
      };

      try {
        await addDoc(collection(db, "expenses"), expenseData);
        toast({ title: "Expense Recorded", description: `An expense of Rs. ${totalPaid.toFixed(2)} for ${bill.name} has been recorded.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Error recording expense" });
        return; 
      }
    }

    try {
      await deleteDoc(billDocRef);
      toast({ title: `${bill.name}'s pending bills have been cleared.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error clearing bill" });
    }
  };

  const handleSettleTransaction = async (billId: string, transactionId: string, amount: number) => {
    const billDocRef = doc(db, 'pendingBills', billId);
    const billSnapshot = await getDoc(billDocRef);
    if (!billSnapshot.exists()) {
      toast({ variant: "destructive", title: "Error", description: "Bill not found." });
      return;
    }

    const bill = billSnapshot.data() as PendingBill;
    const updatedTransactions = bill.transactions.filter(tx => tx.id !== transactionId);

    if (bill.type === 'vendor') {
      const vendor = vendors.find(v => v.name.toLowerCase() === bill.name.toLowerCase());
      const expenseData = {
        date: new Date(),
        category: vendor?.category || 'Vendor Payment',
        description: `Settled transaction for ${bill.name}.`,
        amount: amount,
        vendorId: vendor?.id || null,
      };
      try {
        await addDoc(collection(db, "expenses"), expenseData);
        toast({ title: "Expense Recorded", description: `An expense of Rs. ${amount.toFixed(2)} has been recorded.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Error recording expense" });
        return;
      }
    }

    try {
      if (updatedTransactions.length === 0) {
        await deleteDoc(billDocRef);
        toast({ title: "Transaction Settled", description: `${bill.name}'s final pending bill has been cleared.` });
      } else {
        await updateDoc(billDocRef, { transactions: updatedTransactions });
        toast({ title: "Transaction Settled" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error settling transaction" });
    }
  };


  const now = new Date();
  const dailyExpenses = expenses.filter(e => isSameDay(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyExpenses = expenses.filter(e => isSameMonth(e.date, now) && isSameYear(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const getVendorDetails = (vendorId: string | undefined | null) => vendorId ? vendors.find(v => v.id === vendorId) || null : null;

  return (
    <div className="p-4 space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PendingBillsCard
          title="To Collect from Customers"
          icon={HandCoins}
          bills={pendingBills.filter(b => b.type === 'customer')}
          type="customer"
          onAddTransaction={(name, amount, mobile, dueDate) => handleAddPendingTransaction(name, amount, 'customer', mobile, dueDate)}
          onClearAll={(billId) => handleClearAllPendingBillsForPerson(billId)}
          onSettleTransaction={(billId, txId, amount) => handleSettleTransaction(billId, txId, amount)}
          totalLimit={customerCreditLimit}
          allNames={customers.map(c => c.name)}
        />
        <PendingBillsCard
          title="To Pay to Vendors"
          icon={Landmark}
          bills={pendingBills.filter(b => b.type === 'vendor')}
          type="vendor"
          onAddTransaction={(name, amount, mobile, dueDate) => handleAddPendingTransaction(name, amount, 'vendor', mobile, dueDate)}
          onClearAll={(billId) => handleClearAllPendingBillsForPerson(billId)}
          onSettleTransaction={(billId, txId, amount) => handleSettleTransaction(billId, txId, amount)}
          totalLimit={vendorCreditLimit}
          allNames={vendors.map(v => v.name)}
        />
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Add New Expense</CardTitle>
                <CardDescription>Record a new business expense.</CardDescription>
              </div>
              <div className="flex gap-2">
                  <Button onClick={() => openAddVendorDialog(null)} variant="default"><Building className="mr-2 h-4 w-4" /> Add Vendor</Button>
                  <Button variant="default" onClick={() => setIsVendorManageDialogOpen(true)}><List className="mr-2 h-4 w-4" /> Manage Vendors</Button>
              </div>
            </div>
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
            <div className="flex justify-end gap-2 pt-4">
                {editingExpense && <Button variant="outline" onClick={resetForm}><Repeat className="mr-2 h-4 w-4" />Cancel Edit</Button>}
                <Button onClick={handleSaveExpense}><PlusCircle className="mr-2 h-4 w-4" /> {editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
            </div>
          </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>A log of all recorded business expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto mb-6">
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
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
}

    