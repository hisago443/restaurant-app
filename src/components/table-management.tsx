

"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogDescription } from "@/components/ui/alert-dialog";
import type { Table as TableType, TableStatus, Order, Bill, OrderItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, LayoutTemplate, Sparkles, Users, CheckCircle2, Bookmark, Printer, Repeat, Edit, SparklesIcon, UserCheck, BookmarkX, Eye, X, BookMarked, Armchair } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { format, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const statusBaseColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-amber-300 hover:bg-amber-400',
};

const getDynamicColor = (status: TableStatus) => {
  return statusBaseColors[status];
};



const statusIcons: Record<TableStatus, React.ElementType> = {
  Available: CheckCircle2,
  Occupied: Users,
  Reserved: Bookmark,
  Cleaning: Sparkles,
};

interface TableManagementProps {
  tables: TableType[];
  orders: Order[];
  billHistory: Bill[];
  updateTableStatus: (tableIds: number[], status: TableStatus, reservationDetails?: TableType['reservationDetails']) => void;
  updateTableDetails: (tableId: number, details: { name?: string, seats?: number }) => void;
  addTable: () => void;
  removeLastTable: () => void;
  occupancyCount: Record<number, number>;
  onEditOrder: (order: Order) => void;
  showOccupancy: boolean;
  setShowOccupancy: React.Dispatch<React.SetStateAction<boolean>>;
  initialSelectedTableId?: number | null;
  onCreateOrder: (tableId: number) => void;
}

function CancelReservationDialog({
  isOpen,
  onOpenChange,
  tables,
  updateTableStatus,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tables: TableType[];
  updateTableStatus: (tableIds: number[], status: TableStatus, reservationDetails?: TableType['reservationDetails']) => void;
}) {
  const { toast } = useToast();
  const [selectedTableToCancel, setSelectedTableToCancel] = useState<string>('');
  
  const reservedTables = tables.filter(t => t.status === 'Reserved');

  const handleCancelReservation = () => {
    if (!selectedTableToCancel) {
      toast({
        variant: 'destructive',
        title: 'No Table Selected',
        description: 'Please select a reservation to cancel.',
      });
      return;
    }

    const tableId = parseInt(selectedTableToCancel, 10);
    updateTableStatus([tableId], 'Available', undefined);

    toast({
      title: 'Reservation Cancelled',
      description: `The reservation for Table ${tableId} has been cancelled.`,
    });
    
    setSelectedTableToCancel('');
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel a Reservation</DialogTitle>
          <DialogDescription>
            Select a reserved table to cancel its booking.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Label htmlFor="cancel-reservation-select">Select Reservation</Label>
            <Select value={selectedTableToCancel} onValueChange={setSelectedTableToCancel}>
              <SelectTrigger id="cancel-reservation-select">
                <SelectValue placeholder="Select a reserved table..." />
              </SelectTrigger>
              <SelectContent>
                {reservedTables.length > 0 ? (
                  reservedTables.map(table => (
                    <SelectItem key={table.id} value={String(table.id)}>
                      Table {table.id} - {table.reservationDetails?.name} at {table.reservationDetails?.time}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No tables are currently reserved.
                  </div>
                )}
              </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="destructive" onClick={handleCancelReservation} disabled={!selectedTableToCancel}>
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditTableDialog({ 
    isOpen, 
    onOpenChange, 
    table, 
    onSave 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    table: TableType | null; 
    onSave: (tableId: number, details: { name: string, seats: number }) => void;
}) {
    const [name, setName] = useState('');
    const [seats, setSeats] = useState('');

    useEffect(() => {
        if (table) {
            setName(table.name || '');
            setSeats(table.seats ? String(table.seats) : '');
        }
    }, [table]);

    const handleSave = () => {
        if (table) {
            onSave(table.id, { name, seats: Number(seats) || 0 });
            onOpenChange(false);
        }
    };

    if (!table) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Table {table.id}</DialogTitle>
                    <DialogDescription>
                        Set a custom name and seat count for this table.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="table-name">Table Name (Optional)</Label>
                        <Input
                            id="table-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Window Seat, Couple's Corner"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="table-seats">Number of Seats (Optional)</Label>
                        <Input
                            id="table-seats"
                            type="number"
                            value={seats}
                            onChange={(e) => setSeats(e.target.value)}
                            placeholder="e.g., 4"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TableManagement({ tables, orders, billHistory, updateTableStatus, updateTableDetails, addTable, removeLastTable, occupancyCount, onEditOrder, showOccupancy, setShowOccupancy, initialSelectedTableId, onCreateOrder }: TableManagementProps) {
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isLayoutManagerOpen, setIsLayoutManagerOpen] = useState(false);
  const [filter, setFilter] = useState<TableStatus | 'All'>('All');
  const [hoveredStatus, setHoveredStatus] = useState<TableStatus | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [tableForPrint, setTableForPrint] = useState<TableType | null>(null);
  const [isBillHistoryDialogOpen, setIsBillHistoryDialogOpen] = useState(false);
  const [billsForDialog, setBillsForDialog] = useState<Bill[]>([]);
  const { toast } = useToast();
  const [reservedTableAction, setReservedTableAction] = useState<TableType | null>(null);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);

  const [reservationName, setReservationName] = useState('');
  const [reservationMobile, setReservationMobile] = useState('');
  const [reservationTime, setReservationTime] = useState({ hour: '12', minute: '00', period: 'PM' });
  const [reservationTableId, setReservationTableId] = useState<string>('');
  const [isCancelReservationDialogOpen, setIsCancelReservationDialogOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedTableId) {
        const table = tables.find(t => t.id === initialSelectedTableId);
        if (table) {
            setSelectedTable(table);
        }
    }
  }, [initialSelectedTableId, tables]);

  const filteredTables = tables.filter(table => filter === 'All' || table.status === filter);
  const availableTables = useMemo(() => tables.filter(t => t.status === 'Available'), [tables]);
  
  const tablePerformanceData = useMemo(() => {
    const todaysBills = billHistory.filter(bill => bill.timestamp && isSameDay(bill.timestamp, new Date()));
    return tables.map(table => {
      const turnover = occupancyCount[table.id] || 0;
      const revenue = todaysBills.filter(bill => bill.tableId === table.id).reduce((sum, bill) => sum + bill.total, 0);
      const bills = todaysBills.filter(bill => bill.tableId === table.id);
      return { id: table.id, turnover, revenue, bills };
    });
  }, [tables, billHistory, occupancyCount]);

  const handleTableClick = (table: TableType) => {
    if (selectedTables.length > 0) {
      handleCheckboxChange(table.id, !selectedTables.includes(table.id));
      return;
    }
    
    if (table.status === 'Available') {
      updateTableStatus([table.id], 'Occupied');
    } else if (table.status === 'Occupied') {
        toast({
            title: 'Payment Required',
            description: 'Please process the payment for this table first.',
            variant: 'default',
        });
    } else if (table.status === 'Reserved') {
        setReservedTableAction(table);
    } else {
        // For 'Cleaning'
        updateTableStatus([table.id], 'Available', undefined);
    }
  };


  const handleDoubleClick = (table: TableType) => {
    const order = orders.find(o => o.tableId === table.id && o.status !== 'Completed');
    if (order) {
      onEditOrder(order);
    } else {
      onCreateOrder(table.id);
    }
  };
  
  const handleCheckboxChange = (tableId: number, checked: boolean) => {
    setSelectedTables(prev => 
      checked
        ? [...prev, tableId]
        : prev.filter(id => id !== tableId)
    );
  };

  const handleSelectAllTables = (checked: boolean) => {
    if (checked) {
      setSelectedTables(filteredTables.map(t => t.id));
    } else {
      setSelectedTables([]);
    }
  }
  
  const handleBulkUpdate = (status: TableStatus) => {
    updateTableStatus(selectedTables, status);
    setSelectedTables([]);
  }

  const handleStatusButtonClick = (status: TableStatus | 'All') => {
    if (status !== 'All' && selectedTables.length > 0) {
      handleBulkUpdate(status);
    } else {
      setFilter(status);
      setSelectedTables([]);
    }
  };

  const handleRemoveLastTable = () => {
    if (tables.length > 0) {
      removeLastTable();
      const lastTable = tables.reduce((prev, current) => (prev.id > current.id) ? prev : current);
      setSelectedTables(prev => prev.filter(id => id !== lastTable.id));
    }
  };
  
  const handleOpenPrintDialog = (e: React.MouseEvent, table: TableType) => {
    e.stopPropagation();
    setTableForPrint(table);
    setIsPrintDialogOpen(true);
  };

  const handlePrintReceipt = (bill: Bill) => {
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
  
  const handlePrint = (order: Order) => {
     const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
     const receiptContent = order.items.map(item => `${item.quantity}x ${item.name} @ ₹${item.price.toFixed(2)}`).join('\n') + `\n\nSubtotal: ₹${subtotal.toFixed(2)}`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Provisional Bill for Table #${order.tableId}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <h2>Provisional Bill - Table ${order.tableId}</h2>
            <pre>${receiptContent}</pre>
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
      setIsPrintDialogOpen(false);
    }
  };

  const openBillsDialog = (bills: Bill[]) => {
    setBillsForDialog(bills);
    setIsBillHistoryDialogOpen(true);
  };
  
  const handleReserveTable = () => {
    const { hour, minute, period } = reservationTime;
    if (!reservationName || !hour || !minute || !period || !reservationTableId) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide guest name, a valid arrival time, and select a table.',
      });
      return;
    }

    const formattedTime = `${hour}:${minute} ${period}`;
    const reservationDetails = {
      name: reservationName,
      mobile: reservationMobile,
      time: formattedTime,
    };
    
    updateTableStatus([parseInt(reservationTableId)], 'Reserved', reservationDetails);
    
    toast({
      title: 'Table Reserved!',
      description: `Table ${reservationTableId} is now reserved for ${reservationName}.`,
    });

    // Reset form
    setReservationName('');
    setReservationMobile('');
    setReservationTime({ hour: '12', minute: '00', period: 'PM' });
    setReservationTableId('');
  };


  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
            <div>
              <CardTitle>Table Management</CardTitle>
              <CardDescription>Oversee and manage all tables in your restaurant.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => setIsLayoutManagerOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> 
                <span>Manage Tables</span>
              </Button>
              {selectedTables.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    onCheckedChange={(checked) => handleSelectAllTables(Boolean(checked))}
                    checked={selectedTables.length === filteredTables.length && filteredTables.length > 0}
                    disabled={filteredTables.length === 0}
                  />
                  <Label htmlFor="select-all">Select All ({selectedTables.length})</Label>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap p-4 border-t border-b">
              <span className="text-sm font-semibold text-muted-foreground mr-2">{selectedTables.length > 0 ? 'Change selected to:' : 'Filter by:'}</span>
              <Button 
                variant={filter === 'All' ? 'default' : 'outline'}
                onClick={() => handleStatusButtonClick('All')}
              >
                All ({tables.length})
              </Button>
              {(Object.keys(statusBaseColors) as TableStatus[]).map(status => {
                  const Icon = statusIcons[status];
                  return (
                    <Button
                      key={status}
                      onClick={() => handleStatusButtonClick(status)}
                      onMouseEnter={() => setHoveredStatus(status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      variant={filter === status ? 'default' : 'outline'}
                        className={cn(
                        'transition-all',
                          filter !== status && getDynamicColor(status),
                          filter !== status && (status === 'Available' || status === 'Occupied' ? 'text-white' : 'text-black'),
                      )}
                    >
                        <Icon className="mr-2 h-4 w-4" />
                        {status} ({tables.filter(t => t.status === status).length})
                    </Button>
                  );
              })}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
            {filteredTables.map(table => {
              const Icon = statusIcons[table.status];
              const turnover = occupancyCount[table.id] || 0;
              return (
              <div
                key={table.id}
                className={cn(
                  'group aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl relative border-2 p-1',
                  getDynamicColor(table.status),
                  selectedTables.includes(table.id) && 'ring-4 ring-offset-2 ring-primary border-primary',
                  !selectedTables.includes(table.id) && 'border-black/50',
                  hoveredStatus === table.status && 'scale-110 z-10'
                )}
                onClick={() => handleTableClick(table)}
                onDoubleClick={() => handleDoubleClick(table)}
              >
                <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {table.status === 'Occupied' && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 bg-white/30 hover:bg-white/50"
                            onClick={(e) => handleOpenPrintDialog(e, table)}
                        >
                            <Printer className="h-4 w-4 text-black" />
                        </Button>
                    )}
                     {table.status === 'Reserved' && (
                        <>
                          <Button variant="secondary" size="icon" className="h-7 w-7 bg-green-500 hover:bg-green-600" onClick={(e) => { e.stopPropagation(); updateTableStatus([table.id], 'Occupied'); }}>
                            <UserCheck className="h-4 w-4 text-white" />
                          </Button>
                           <Button variant="secondary" size="icon" className="h-7 w-7 bg-red-500 hover:bg-red-600" onClick={(e) => { e.stopPropagation(); updateTableStatus([table.id], 'Available', undefined); }}>
                            <BookmarkX className="h-4 w-4 text-white" />
                          </Button>
                        </>
                    )}
                    <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/30 hover:bg-white/50" onClick={(e) => { e.stopPropagation(); setEditingTable(table); }}>
                        <Edit className="h-4 w-4 text-black" />
                    </Button>
                </div>
                  {showOccupancy && turnover > 0 &&
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/50 text-white text-xs font-bold p-1 rounded-md">
                        <Repeat className="h-3 w-3" />
                        <span>{turnover}</span>
                    </div>
                }
                <div className={cn("absolute top-1 right-1 transition-opacity", (selectedTables.length > 0 || table.status === 'Reserved' || hoveredStatus) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                  <Checkbox 
                    className="bg-white/50 border-gray-500 data-[state=checked]:bg-primary"
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={(checked) => handleCheckboxChange(table.id, Boolean(checked))}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="text-center">
                    <span className={cn("text-6xl font-bold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.id}</span>
                    <div className="flex items-center justify-center gap-1">
                      {React.createElement(Icon, { className: cn("h-4 w-4", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black') })}
                      <span className={cn("text-base font-semibold leading-tight", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.status}</span>
                    </div>
                    {table.name && <div className="text-xs font-bold text-white mt-1 max-w-full truncate">{table.name}</div>}
                    {table.seats && <div className="text-xs text-white flex items-center justify-center gap-1"><Armchair className="h-3 w-3" /> {table.seats}</div>}
                    {table.status === 'Reserved' && table.reservationDetails && (
                      <div className="text-xs text-black font-bold mt-1 max-w-full truncate">
                        for {table.reservationDetails.name} at {table.reservationDetails.time}
                      </div>
                    )}
                </div>
              </div>
            )})}
              {filteredTables.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-16">
                No tables with status "{filter}".
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-6">
        <Card className="lg:col-span-7">
            <CardHeader>
                <CardTitle>Table Performance (Today)</CardTitle>
                <CardDescription>Review daily turnover and revenue for each table.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Table No.</TableHead>
                                <TableHead>Turnover</TableHead>
                                <TableHead>Total Revenue</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tablePerformanceData.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-bold text-lg">{p.id}</TableCell>
                                    <TableCell className="font-semibold">{p.turnover}</TableCell>
                                    <TableCell className="font-semibold text-green-600">Rs. {p.revenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => openBillsDialog(p.bills)} disabled={p.bills.length === 0}>
                                            <Eye className="mr-2 h-4 w-4" /> View Bills
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookMarked /> Reserve a Table</CardTitle>
            <CardDescription>Book a table for a future date or time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Guest Name</Label>
              <Input id="guest-name" value={reservationName} onChange={(e) => setReservationName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-mobile">Mobile No. (Optional)</Label>
              <Input id="guest-mobile" value={reservationMobile} onChange={(e) => setReservationMobile(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Time of Arrival</Label>
                <div className="flex items-center gap-1">
                  <Select value={reservationTime.hour} onValueChange={(v) => setReservationTime(p => ({...p, hour: v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-bold">:</span>
                  <Select value={reservationTime.minute} onValueChange={(v) => setReservationTime(p => ({...p, minute: v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 60}, (_, i) => (
                        <SelectItem key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={reservationTime.period} onValueChange={(v) => setReservationTime(p => ({...p, period: v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-no">Table No.</Label>
                <Select value={reservationTableId} onValueChange={setReservationTableId}>
                  <SelectTrigger id="table-no">
                    <SelectValue placeholder="Select Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map(table => (
                      <SelectItem key={table.id} value={String(table.id)}>
                        Table {table.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleReserveTable}>Reserve Table</Button>
            <Button variant="destructive" className="w-full" onClick={() => setIsCancelReservationDialogOpen(true)}>Cancel Reservation</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLayoutManagerOpen} onOpenChange={setIsLayoutManagerOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tables</DialogTitle>
              <DialogDescription>
                Add or remove tables and manage display settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={addTable}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add a New Table
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={tables.length === 0}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Table
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the last table. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveLastTable}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="show-occupancy">Show Occupancy Counter</Label>
                <Switch
                  id="show-occupancy"
                  checked={showOccupancy}
                  onCheckedChange={setShowOccupancy}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsLayoutManagerOpen(false)}>Done</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
            {tableForPrint && (() => {
                const order = orders.find(o => o.tableId === tableForPrint.id && o.status !== 'Completed');
                if (!order) {
                    return (
                        <>
                            <DialogHeader>
                                <DialogTitle>Error</DialogTitle>
                                <DialogDescription>No active order found for Table {tableForPrint.id}.</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button onClick={() => setIsPrintDialogOpen(false)}>Close</Button>
                            </DialogFooter>
                        </>
                    )
                }
                const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                return (
                    <>
                        <DialogHeader>
                            <DialogTitle>Print Provisional Bill for Table {tableForPrint.id}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-2 font-mono">
                           {order.items.map(item => (
                               <div key={item.name} className="flex justify-between">
                                   <span>{item.quantity}x {item.name}</span>
                                   <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                               </div>
                           ))}
                           <Separator className="my-2" />
                           <div className="flex justify-between font-bold">
                               <span>Subtotal</span>
                               <span>₹{subtotal.toFixed(2)}</span>
                           </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Cancel</Button>
                            <Button onClick={() => handlePrint(order)}>
                                <Printer className="mr-2 h-4 w-4" /> Print Bill
                            </Button>
                        </DialogFooter>
                    </>
                )
            })()}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBillHistoryDialogOpen} onOpenChange={setIsBillHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill History for Table {billsForDialog[0]?.tableId}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billsForDialog.map(bill => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.id}</TableCell>
                    <TableCell>{format(bill.timestamp, 'Pp')}</TableCell>
                    <TableCell>Rs. {bill.total.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedBill(bill)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(bill)}><Printer className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={!!reservedTableAction} onOpenChange={() => setReservedTableAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reservation for Table {reservedTableAction?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Guest: {reservedTableAction?.reservationDetails?.name || 'N/A'} at {reservedTableAction?.reservationDetails?.time || 'N/A'}.
              <br/>
              What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
             <Button
              variant="destructive"
              onClick={() => {
                if(reservedTableAction) {
                  updateTableStatus([reservedTableAction.id], 'Available', undefined);
                  setReservedTableAction(null);
                }
              }}
            >
              <BookmarkX className="mr-2 h-4 w-4" />
              Cancel Reservation
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (reservedTableAction) {
                  updateTableStatus([reservedTableAction.id], 'Occupied');
                  setReservedTableAction(null);
                }
              }}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Guest Has Arrived
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancelReservationDialog 
        isOpen={isCancelReservationDialogOpen}
        onOpenChange={setIsCancelReservationDialogOpen}
        tables={tables}
        updateTableStatus={updateTableStatus}
      />
      
      <EditTableDialog
          isOpen={!!editingTable}
          onOpenChange={() => setEditingTable(null)}
          table={editingTable}
          onSave={(tableId, details) => updateTableDetails(tableId, details)}
      />

    </div>
  );
}
