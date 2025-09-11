
"use client"

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/lib/types';

interface InventoryManagementProps {
  inventory: InventoryItem[];
}

function AddOrEditItemDialog({
  open,
  onOpenChange,
  onSave,
  existingItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: Omit<InventoryItem, 'id'> & { id?: string }) => void;
  existingItem: InventoryItem | null;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [capacity, setCapacity] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (existingItem) {
      setName(existingItem.name);
      setCategory(existingItem.category || '');
      setStock(String(existingItem.stock));
      setCapacity(String(existingItem.capacity));
      setUnit(existingItem.unit);
    } else {
      setName('');
      setCategory('');
      setStock('');
      setCapacity('');
      setUnit('');
    }
  }, [existingItem, open]);

  const handleSave = () => {
    if (name && stock && capacity && unit) {
      onSave({
        id: existingItem?.id,
        name,
        category,
        stock: parseFloat(stock),
        capacity: parseFloat(capacity),
        unit,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
          <DialogDescription>Manage your stock items.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input id="item-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Coffee Beans" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <Input id="item-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Beverages" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-stock">Current Stock</Label>
            <Input id="item-stock" type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="e.g., 50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-capacity">Total Capacity</Label>
            <Input id="item-capacity" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g., 100" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="item-unit">Unit</Label>
            <Input id="item-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g., kg, liters, units" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryManagement({ inventory }: InventoryManagementProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleSaveItem = async (itemData: Omit<InventoryItem, 'id'> & { id?: string }) => {
    const { id, ...data } = itemData;
    if (id) {
      try {
        await updateDoc(doc(db, "inventory", id), data);
        toast({ title: "Item updated successfully" });
      } catch (error) {
        toast({ variant: "destructive", title: "Error updating item" });
      }
    } else {
      try {
        await addDoc(collection(db, "inventory"), data);
        toast({ title: "Item added successfully" });
      } catch (error) {
        toast({ variant: "destructive", title: "Error adding item" });
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "inventory", itemId));
      toast({ title: "Item deleted successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error deleting item" });
    }
  };

  const handleOpenDialog = (item: InventoryItem | null) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const handleStockChange = async (id: string, newStock: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    const stock = Math.max(0, Math.min(item.capacity, newStock));

    try {
        await updateDoc(doc(db, "inventory", id), { stock });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error updating stock' });
    }
  }

  return (
    <div className="p-4">
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>Track and manage your stock levels.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Adjust Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(item.stock / item.capacity) * 100}
                      className="w-40 h-3"
                    />
                    <span>{item.stock} / {item.capacity} {item.unit}</span>
                  </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleStockChange(item.id, item.stock - 1)}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input 
                            type="number"
                            value={item.stock}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                    handleStockChange(item.id, 0);
                                } else {
                                    handleStockChange(item.id, parseInt(value));
                                }
                            }}
                             onBlur={(e) => {
                                if (e.target.value === '') {
                                    handleStockChange(item.id, 0);
                                }
                             }}
                            className="w-20 h-9 text-center"
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleStockChange(item.id, item.stock + 1)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
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
                        <AlertDialogDescription>This will permanently delete the item "{item.name}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <AddOrEditItemDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      onSave={handleSaveItem}
      existingItem={editingItem}
    />
    </div>
  );
}
