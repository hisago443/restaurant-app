

"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogDescription } from "@/components/ui/alert-dialog";
import type { Table as TableType, TableStatus, Order, Bill } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, LayoutTemplate, Sparkles, Users, CheckCircle2, Bookmark, Printer, Repeat, Edit, SparklesIcon, UserCheck, BookmarkX, Eye, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

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
  updateTableStatus: (tableIds: number[], status: TableStatus) => void;
  addTable: () => void;
  removeLastTable: () => void;
  occupancyCount: Record<number, number>;
  onEditOrder: (order: Order) => void;
  showOccupancy: boolean;
  setShowOccupancy: React.Dispatch<React.SetStateAction<boolean>>;
  initialSelectedTableId?: number | null;
  onCreateOrder: (tableId: number) => void;
}

export default function TableManagement({ tables, orders, billHistory, updateTableStatus, addTable, removeLastTable, occupancyCount, onEditOrder, showOccupancy, setShowOccupancy, initialSelectedTableId, onCreateOrder }: TableManagementProps) {
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isLayoutManagerOpen, setIsLayoutManagerOpen] = useState(false);
  const [filter, setFilter] = useState<TableStatus | 'All'>('All');
  const [hoveredStatus, setHoveredStatus] = useState<TableStatus | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [tableForPrint, setTableForPrint] = useState<TableType | null>(null);

  useEffect(() => {
    if (initialSelectedTableId) {
        const table = tables.find(t => t.id === initialSelectedTableId);
        if (table) {
            setSelectedTable(table);
        }
    }
  }, [initialSelectedTableId, tables]);

  const filteredTables = tables.filter(table => filter === 'All' || table.status === filter);
  
  const tableBillHistory = React.useMemo(() => {
    if (!selectedTable) return [];
    return billHistory
        .filter(bill => bill.tableId === selectedTable.id)
        .sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [billHistory, selectedTable]);

  const handleTableClick = (table: TableType) => {
    if (selectedTables.length > 0) {
      // If in bulk selection mode, a click should toggle selection
      handleCheckboxChange(table.id, !selectedTables.includes(table.id));
      return;
    }
    
    // If not in bulk mode, clicking a table shows its details.
    setSelectedTable(table.id === selectedTable?.id ? null : table);
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


  const renderActionsForSelectedTable = () => {
    if (!selectedTable) return null;

    const orderForTable = orders.find(o => o.tableId === selectedTable.id && o.status !== 'Completed');
    let actions: React.ReactNode[] = [];

    switch (selectedTable.status) {
      case 'Available':
        actions = [
          <Button key="create" onClick={() => { onCreateOrder(selectedTable.id); setSelectedTable(null); }}><Users className="mr-2 h-4 w-4" />Create Order</Button>,
          <Button key="reserve" variant="outline" onClick={() => { updateTableStatus([selectedTable.id], 'Reserved'); setSelectedTable(null); }}><Bookmark className="mr-2 h-4 w-4" />Reserve Table</Button>
        ];
        break;
      case 'Occupied':
        actions = [
          <Button key="update" onClick={() => { orderForTable && onEditOrder(orderForTable); setSelectedTable(null);}} disabled={!orderForTable}><Edit className="mr-2 h-4 w-4" />Update Order</Button>,
          <Button key="print" variant="outline" onClick={(e) => { handleOpenPrintDialog(e, selectedTable); setSelectedTable(null); }} disabled={!orderForTable}><Printer className="mr-2 h-4 w-4" />Print Bill</Button>,
          <Button key="clean" variant="destructive" onClick={() => { updateTableStatus([selectedTable.id], 'Cleaning'); setSelectedTable(null); }}><SparklesIcon className="mr-2 h-4 w-4" />Mark as Cleaning</Button>
        ];
        break;
      case 'Reserved':
         actions = [
          <Button key="arrive" onClick={() => { updateTableStatus([selectedTable.id], 'Occupied'); setSelectedTable(null); }}><UserCheck className="mr-2 h-4 w-4" />Guest Arrived</Button>,
          <Button key="cancel" variant="outline" onClick={() => { updateTableStatus([selectedTable.id], 'Available'); setSelectedTable(null); }}><BookmarkX className="mr-2 h-4 w-4" />Cancel Reservation</Button>
        ];
        break;
      case 'Cleaning':
        actions = [<Button key="available" onClick={() => { updateTableStatus([selectedTable.id], 'Available'); setSelectedTable(null); }}><CheckCircle2 className="mr-2 h-4 w-4" />Mark as Available</Button>];
        break;
    }
    
    return (
      <div className="mt-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Details for Table {selectedTable.id}</h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedTable(null)}><X className="h-4 w-4"/></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
            {actions}
        </div>
        <Separator />
        <div className="mt-4">
            <h4 className="font-semibold mb-2">Recent Bill History</h4>
             <div className="max-h-60 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bill ID</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableBillHistory.length > 0 ? (
                            tableBillHistory.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell>{bill.id}</TableCell>
                                    <TableCell>{format(bill.timestamp, 'PPP p')}</TableCell>
                                    <TableCell className="text-right font-mono">₹{bill.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedBill(bill)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No bill history for this table.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </div>
    );
  };


  return (
    <div className="p-4">
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
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  onCheckedChange={(checked) => handleSelectAllTables(Boolean(checked))}
                  checked={selectedTables.length === filteredTables.length && filteredTables.length > 0}
                  disabled={filteredTables.length === 0}
                />
                <Label htmlFor="select-all">Select All ({selectedTables.length})</Label>
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
            {filteredTables.map(table => {
              const Icon = statusIcons[table.status];
              const turnover = occupancyCount[table.id] || 0;
              return (
              <div
                key={table.id}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl relative border-2',
                  getDynamicColor(table.status),
                  selectedTables.includes(table.id) && 'ring-4 ring-offset-2 ring-primary border-primary',
                  selectedTable?.id === table.id && 'ring-4 ring-offset-2 ring-foreground border-foreground',
                  !selectedTables.includes(table.id) && 'border-black/50',
                  hoveredStatus === table.status && 'scale-110 z-10'
                )}
                onClick={() => handleTableClick(table)}
                onDoubleClick={() => handleDoubleClick(table)}
              >
                <div className="absolute top-1 left-1">
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
                </div>
                 {showOccupancy && turnover > 0 &&
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/50 text-white text-xs font-bold p-1 rounded-md">
                        <Repeat className="h-3 w-3" />
                        <span>{turnover}</span>
                    </div>
                }
                <div className="absolute top-1 right-1">
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
                      <span className={cn("text-base font-semibold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.status}</span>
                    </div>
                </div>
              </div>
            )})}
             {filteredTables.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-16">
                No tables with status "{filter}".
              </div>
            )}
          </div>
           {renderActionsForSelectedTable()}
        </CardContent>
      </Card>
      
      <Dialog open={isLayoutManagerOpen} onOpenChange={setIsLayoutManagerOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tables</DialogTitle>
              <DialogDescription>
                Add or remove tables and manage display settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="show-occupancy">Show Occupancy Counter</Label>
                <Switch
                  id="show-occupancy"
                  checked={showOccupancy}
                  onCheckedChange={setShowOccupancy}
                />
              </div>
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
    </div>
  );
}







