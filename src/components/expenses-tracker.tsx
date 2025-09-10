
"use client";

import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense } from '@/lib/types';

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

function AddOrEditExpenseDialog({
  open,
  onOpenChange,
  onSave,
  existingExpense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, 'id'> & { id?: string }) => void;
  existingExpense: Expense | null;
}) {
  const [date, setDate] = useState<Date | undefined>(existingExpense?.date || new Date());
  const [category, setCategory] = useState(existingExpense?.category || '');
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [amount, setAmount] = useState(existingExpense?.amount.toString() || '');
  
  useState(() => {
    if (existingExpense) {
      setDate(existingExpense.date);
      setCategory(existingExpense.category);
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
    } else {
      setDate(new Date());
      setCategory('');
      setDescription('');
      setAmount('');
    }
  });

  const handleSave = () => {
    if (date && category && description && amount) {
      onSave({
        id: existingExpense?.id,
        date,
        category,
        description,
        amount: parseFloat(amount),
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleSaveExpense = async (expense: Omit<Expense, 'id'> & { id?: string }) => {
    if (expense.id) {
        const { id, ...expenseData } = expense;
        try {
            await updateDoc(doc(db, "expenses", id), expenseData);
            toast({ title: "Expense updated successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating expense", description: "Could not update the expense in the database." });
            console.error("Error updating expense: ", error);
        }
    } else {
        try {
            await addDoc(collection(db, "expenses"), expense);
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

  const openDialog = (expense: Expense | null) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  }
  
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Tracker</CardTitle>
            <CardDescription>Monitor and record all your business expenses.</CardDescription>
          </div>
          <Button onClick={() => openDialog(null)}>
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
                    <TableCell className="text-right font-mono">
                      {expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(expense)}>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="text-right font-bold text-lg mt-4 pr-4">
              Total Expenses: ₹{totalExpenses.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <AddOrEditExpenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveExpense}
        existingExpense={editingExpense}
      />
    </div>
  );
}
