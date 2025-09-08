"use client";

import { useState } from 'react';
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

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onPaymentSuccess: () => void;
}

export function PaymentDialog({ isOpen, onOpenChange, total, onPaymentSuccess }: PaymentDialogProps) {
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [error, setError] = useState('');

  const change = cashReceived !== null ? cashReceived - total : null;

  const handleConfirm = () => {
    if (cashReceived === null || cashReceived < total) {
      setError('Cash received must be equal to or greater than the total amount.');
      return;
    }
    setError('');
    onPaymentSuccess();
  };

  const handleClose = () => {
    setCashReceived(null);
    setError('');
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Cash Payment</DialogTitle>
          <DialogDescription>Enter the amount of cash received from the customer.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-4xl font-bold text-center">
            Total: ${total.toFixed(2)}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cash-received" className="text-right">
              Cash Received
            </Label>
            <Input
              id="cash-received"
              type="number"
              value={cashReceived === null ? '' : cashReceived}
              onChange={(e) => setCashReceived(e.target.value ? parseFloat(e.target.value) : null)}
              className="col-span-3"
              placeholder="e.g., 50.00"
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {change !== null && change >= 0 && (
            <div className="text-center text-xl font-medium text-primary">
              Change Due: ${change.toFixed(2)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
