
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
import { QrCode, Wallet, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendEmailReceipt, type SendEmailReceiptInput } from '@/ai/flows/send-email-receipt';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  receiptPreview: string;
  onPaymentSuccess: () => void;
}

export function PaymentDialog({ isOpen, onOpenChange, total, receiptPreview, onPaymentSuccess }: PaymentDialogProps) {
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const change = cashReceived !== null ? cashReceived - total : null;

  const handleEmailReceipt = async () => {
    if (!customerEmail) {
      toast({
        variant: "destructive",
        title: "Missing Email",
        description: "Please enter a customer email to send the receipt.",
      });
      return;
    }
    
    const input: SendEmailReceiptInput = {
      customerEmail,
      receiptContent: receiptPreview,
      totalAmount: total,
    };

    try {
      const result = await sendEmailReceipt(input);
      if (result.success) {
        toast({
          title: "Receipt Sent",
          description: `A copy of the receipt has been sent to ${customerEmail}.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
        toast({
          variant: "destructive",
          title: "Email Failed",
          description: "Could not send the email receipt. Please try again.",
      });
    }
  };

  const processPayment = () => {
    onPaymentSuccess();
    if (customerEmail) {
      handleEmailReceipt();
    }
  }

  const handleCashConfirm = () => {
    if (cashReceived === null || cashReceived < total) {
      setError('Cash received must be equal to or greater than the total amount.');
      return;
    }
    setError('');
    processPayment();
  };
  
  const handleOnlineConfirm = () => {
    processPayment();
  };

  const handleClose = () => {
    setCashReceived(null);
    setCustomerEmail('');
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

        <div className="space-y-2 py-4">
            <Label htmlFor="customer-email">Customer Email (Optional)</Label>
            <div className="flex items-center gap-2">
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <Button variant="outline" size="icon" onClick={handleEmailReceipt} disabled={!customerEmail}>
                    <Mail className="h-4 w-4" />
                </Button>
            </div>
             <p className="text-xs text-muted-foreground">Enter an email to send the receipt after payment.</p>
        </div>

        <Tabs defaultValue="cash" className="w-full">
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
