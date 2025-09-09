
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MenuItem } from '@/lib/types';
import { Plus, Minus } from 'lucide-react';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onConfirm: (item: MenuItem, quantity: number) => void;
}

export function AddItemDialog({ isOpen, onOpenChange, item, onConfirm }: AddItemDialogProps) {
  const [quantity, setQuantity] = useState<number | string>(1);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1); // Reset quantity when dialog opens
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const numericQuantity = Number(quantity);
    if (item && numericQuantity > 0) {
      onConfirm(item, numericQuantity);
      onOpenChange(false);
    }
  };

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => Math.max(1, Number(prev) + amount));
  };
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Price: <span className="font-bold text-foreground">Rs.{item.price.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <div className="col-span-3 flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(-1)}><Minus className="h-4 w-4" /></Button>
                <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => {
                    const value = e.target.value;
                    setQuantity(value);
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || Number(e.target.value) < 1) {
                    setQuantity(1);
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-16 text-center"
                />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(1)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Add to Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
