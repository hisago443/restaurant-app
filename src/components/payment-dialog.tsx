
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Wallet } from 'lucide-react';

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

  const handleCashConfirm = () => {
    if (cashReceived === null || cashReceived < total) {
      setError('Cash received must be equal to or greater than the total amount.');
      return;
    }
    setError('');
    onPaymentSuccess();
  };
  
  const handleOnlineConfirm = () => {
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
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Total Amount to be Paid: <span className="font-bold text-foreground">Rs.{total.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="cash" className="w-full pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash"><Wallet className="mr-2 h-4 w-4" />Cash</TabsTrigger>
            <TabsTrigger value="online"><QrCode className="mr-2 h-4 w-4" />Online</TabsTrigger>
          </TabsList>
          <TabsContent value="cash">
            <div className="grid gap-4 py-4">
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
                  Change Due: Rs.{change.toFixed(2)}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCashConfirm}>Confirm Payment</Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="online">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <QrCode className="h-24 w-24 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                    Scan the QR code or use the button below to simulate a successful online payment.
                </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleOnlineConfirm}>Simulate Successful Payment</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
