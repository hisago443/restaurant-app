
"use client";

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, CalendarIcon, Building } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import type { Expense, Vendor } from '@/lib/types';

interface ExpensesTrackerProps {
  expenses: Expense[];
}

const expenseCategories = [
  "Groceries",
  "Utilities",
  "Rent",
  "Maintenance",
  "Marketing",
  "Salaries",
  "Miscellaneous"
];

const vendorCategories = [
    "Food & Beverage",
    "Cleaning Supplies",
    "Maintenance Services",
    "Marketing & Advertising",
    "Office Supplies",
    "Utilities",
    "Other"
];

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

  useEffect(() => {
    if (existingVendor) {
        setName(existingVendor.name);
        setCategory(existingVendor.category);
    } else {
        setName('');
        setCategory('');
    }
  }, [existingVendor]);

  const handleSave = () => {
    if (name && category) {
      onSave({
        id: existingVendor?.id,
        name,
        category,
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
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger id="vendor-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {vendorCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
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


function AddOrEditExpenseDialog({
  open,
  onOpenChange,
  onSave,
  existingExpense,
  vendors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, 'id'> & { id?: string }) => void;
  existingExpense: Expense | null;
  vendors: Vendor[];
}) {
  const [date, setDate] = useState<Date | undefined>(existingExpense?.date || new Date());
  const [category, setCategory] = useState(existingExpense?.category || '');
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [amount, setAmount] = useState(existingExpense?.amount.toString() || '');
  const [vendorId, setVendorId] = useState<string | null | undefined>(existingExpense?.vendorId);
  
  useEffect(() => {
    if (existingExpense) {
      setDate(existingExpense.date);
      setCategory(existingExpense.category);
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setVendorId(existingExpense.vendorId || null);
    } else {
      setDate(new Date());
      setCategory('');
      setDescription('');
      setAmount('');
      setVendorId(null);
    }
  }, [existingExpense]);

  const handleSave = () => {
    if (date && category && description && amount) {
      onSave({
        id: existingExpense?.id,
        date,
        category,
        description,
        amount: parseFloat(amount),
        vendorId,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
          <DialogDescription>
            Record a business expense. Fill in all the details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="vendor">Vendor (Optional)</Label>
            <Select onValueChange={(value) => setVendorId(value)} value={vendorId ?? undefined}>
              <SelectTrigger id="vendor">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                 {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="e.g., Weekly vegetable purchase" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
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

export default function ExpensesTracker({ expenses }: ExpensesTrackerProps) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    const unsubVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor));
        setVendors(data);
    });
    return () => unsubVendors();
  }, []);

  const handleSaveExpense = async (expense: Omit<Expense, 'id'> & { id?: string }) => {
    const expenseData = {
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        vendorId: expense.vendorId || null,
    };

    if (expense.id) {
        try {
            await updateDoc(doc(db, "expenses", expense.id), expenseData);
            toast({ title: "Expense updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating expense", description: "Could not update the expense in the database." });
            console.error("Error updating expense: ", error);
        }
    } else {
        try {
            await addDoc(collection(db, "expenses"), expenseData);
            toast({ title: "Expense added successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error adding expense", description: "Could not add the expense to the database." });
            console.error("Error adding expense: ", error);
        }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
        await deleteDoc(doc(db, "expenses", expenseId));
        toast({ title: "Expense deleted successfully" });
    } catch (error) {
        toast({ variant: "destructive", title: "Error deleting expense" });
        console.error("Error deleting expense: ", error);
    }
  };

  const openExpenseDialog = (expense: Expense | null) => {
    setEditingExpense(expense);
    setIsExpenseDialogOpen(true);
  }

  const handleSaveVendor = async (vendor: Omit<Vendor, 'id'> & { id?: string }) => {
    if (vendor.id) {
        const { id, ...vendorData } = vendor;
        try {
            await updateDoc(doc(db, "vendors", id), vendorData);
            toast({ title: "Vendor updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating vendor" });
        }
    } else {
        try {
            await addDoc(collection(db, "vendors"), vendor);
            toast({ title: "Vendor added successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error adding vendor" });
        }
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
        await deleteDoc(doc(db, "vendors", vendorId));
        toast({ title: "Vendor deleted successfully" });
    } catch (error) {
        toast({ variant: "destructive", title: "Error deleting vendor" });
    }
  };

  const openVendorDialog = (vendor: Vendor | null) => {
    setEditingVendor(vendor);
    setIsVendorDialogOpen(true);
  }
  
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getVendorName = (vendorId: string | undefined | null) => {
    if (!vendorId) return 'N/A';
    return vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor';
  }

  return (
    <div className="p-4 space-y-4">
       <Card>
          <CardHeader className="flex flex-row items-center justify-between">
          <div>
              <CardTitle>Expense Tracker</CardTitle>
              <CardDescription>Monitor and record all your business expenses.</CardDescription>
          </div>
          <Button onClick={() => openExpenseDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {expenses.length > 0 ? (
                  expenses.map((expense) => (
                  <TableRow key={expense.id}>
                      <TableCell>{format(expense.date, 'PPP')}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{getVendorName(expense.vendorId)}</TableCell>
                      <TableCell className="text-right font-mono">
                      {expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openExpenseDialog(expense)}>
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
                                      This action cannot be undone. This will permanently delete this expense record.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No expenses recorded yet.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
          <div className="text-right font-bold text-lg mt-4 pr-4">
              Total Expenses: Rs. {totalExpenses.toFixed(2)}
          </div>
          </CardContent>
      </Card>
      
      <AddOrEditExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        onSave={handleSaveExpense}
        existingExpense={editingExpense}
        vendors={vendors}
      />

       <AddOrEditVendorDialog
        open={isVendorDialogOpen}
        onOpenChange={setIsVendorDialogOpen}
        onSave={handleSaveVendor}
        existingVendor={editingVendor}
      />
    </div>
  );
}
