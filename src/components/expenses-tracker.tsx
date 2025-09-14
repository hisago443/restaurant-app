
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
import type { Expense, Vendor } from '@/lib/types';
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
    return () => {
        unsubVendors();
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
  
  const now = new Date();
  const dailyExpenses = expenses.filter(e => isSameDay(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyExpenses = expenses.filter(e => isSameMonth(e.date, now) && isSameYear(e.date, now)).reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const getVendorDetails = (vendorId: string | undefined | null) => vendorId ? vendors.find(v => v.id === vendorId) || null : null;

  return (
    <div className="p-4 space-y-6">
       <Card>
          <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Record a new business expense.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-2 lg:col-span-1">
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
    </div>
  );
}
