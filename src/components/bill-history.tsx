
"use client";

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Printer, Trash2, Calendar as CalendarIcon, X } from 'lucide-react';
import type { Bill } from '@/lib/types';
import { format, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface BillHistoryProps {
  bills: Bill[];
  onClearAll?: () => void;
}

type FilterType = 'all' | 'month' | 'year';

export default function BillHistory({ bills, onClearAll }: BillHistoryProps) {
  const { toast } = useToast();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [date, setDate] = useState<Date | undefined>();

  const filteredBills = useMemo(() => {
    const now = new Date();
    
    if (date) {
        return bills.filter(bill => isSameDay(bill.timestamp, date));
    }

    switch (filter) {
      case 'month':
        return bills.filter(bill => isSameMonth(bill.timestamp, now) && isSameYear(bill.timestamp, now));
      case 'year':
        return bills.filter(bill => isSameYear(bill.timestamp, now));
      case 'all':
      default:
        return bills;
    }
  }, [bills, filter, date]);

  const handlePrintBill = (bill: Bill) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt for Bill #${bill.id}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${bill.receiptPreview}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      await deleteDoc(doc(db, "bills", billId));
      toast({
        title: "Bill Deleted",
        description: `Bill #${billId} has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "There was an error deleting the bill. Please try again.",
      });
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    // When a date is picked, we might want to clear the tab filter to avoid confusion
    // but for now, we'll let the date filter take precedence.
  }

  return (
    <>
      <div className="flex justify-between items-center w-full mb-4 flex-wrap gap-4">
        <div className='flex items-center gap-2 flex-wrap'>
          <Tabs value={filter} onValueChange={(value) => { setDate(undefined); setFilter(value as FilterType); }} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Filter by date...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {date && (
            <Button variant="ghost" onClick={() => setDate(undefined)} className="h-10 px-3">
              <X className="h-4 w-4 mr-2"/>
              Clear
            </Button>
          )}
        </div>
        {onClearAll && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={bills.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear All Bills
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the entire bill history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
      </div>
      <ScrollArea className="h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.id}</TableCell>
                  <TableCell>{bill.tableId}</TableCell>
                  <TableCell>
                    {format(bill.timestamp, 'PPP p')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{bill.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedBill(bill)}
                      title="View Bill"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrintBill(bill)}
                      title="Print Bill"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" title="Delete Bill">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete bill #{bill.id}. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBill(bill.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No bills found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt for Bill #{selectedBill?.id}</DialogTitle>
            <DialogDescription>
              Table: {selectedBill?.tableId} | Date: {selectedBill ? format(selectedBill.timestamp, 'PPP p') : ''}
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-4 text-sm font-mono whitespace-pre-wrap break-words bg-muted p-4 rounded-md max-h-[50vh] overflow-auto">
            {selectedBill?.receiptPreview}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
