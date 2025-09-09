

"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogDescription } from "@/components/ui/alert-dialog";
import type { Table, TableStatus, Order, OrderItem, Bill } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, LayoutTemplate, Sparkles, Users, CheckCircle2, Bookmark, Armchair, ClipboardList, LogOut, UserCheck, BookmarkX, BookmarkPlus, Printer, Repeat, Edit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const statusColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-amber-300 hover:bg-amber-400',
};

const statusIcons: Record<TableStatus, React.ElementType> = {
  Available: CheckCircle2,
  Occupied: Users,
  Reserved: Bookmark,
  Cleaning: Sparkles,
};

interface TableManagementProps {
  tables: Table[];
  orders: Order[];
  billHistory: Bill[];
  updateTableStatus: (tableIds: number[], status: TableStatus) => void;
  addTable: () => void;
  removeLastTable: () => void;
  occupancyCount: Record<number, number>;
  onEditOrder: (order: Order) => void;
}

export default function TableManagement({ tables, orders, billHistory, updateTableStatus, addTable, removeLastTable, occupancyCount, onEditOrder }: TableManagementProps) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isLayoutManagerOpen, setIsLayoutManagerOpen] = useState(false);
  const [filter, setFilter] = useState<TableStatus | 'All'>('All');
  const [hoveredStatus, setHoveredStatus] = useState<TableStatus | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [tableForPrint, setTableForPrint] = useState<Table | null>(null);

  const filteredTables = tables.filter(table => filter === 'All' || table.status === filter);

  const localUpdateTableStatus = (tableId: number, status: TableStatus) => {
    updateTableStatus([tableId], status);
    setSelectedTable(null);
  };

  const handleDoubleClick = (table: Table) => {
    if (table.status === 'Available') {
      updateTableStatus([table.id], 'Occupied');
    } else if (table.status === 'Occupied') {
      const order = orders.find(o => o.tableId === table.id && o.status !== 'Completed');
      if (order) {
        onEditOrder(order);
      }
    }
  };
  
  const handleSelectTable = (tableId: number) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  }

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
  
  const handleOpenPrintDialog = (e: React.MouseEvent, table: Table) => {
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


  const renderActions = (table: Table) => {
    switch (table.status) {
      case 'Available':
        return (
          <>
            <Button onClick={() => localUpdateTableStatus(table.id, 'Occupied')}><Users className="mr-2 h-4 w-4" />Seat Guests</Button>
            <Button variant="outline" onClick={() => localUpdateTableStatus(table.id, 'Reserved')}><Bookmark className="mr-2 h-4 w-4" />Reserve Table</Button>
          </>
        );
      case 'Occupied':
        const order = orders.find(o => o.tableId === table.id && o.status !== 'Completed');
        return (
          <>
            <Button onClick={() => order && onEditOrder(order)} disabled={!order}><Edit className="mr-2 h-4 w-4" />Modify Order</Button>
            <Button variant="destructive" onClick={() => localUpdateTableStatus(table.id, 'Cleaning')}><Sparkles className="mr-2 h-4 w-4" />Customer Left</Button>
          </>
        );
      case 'Reserved':
        return (
          <>
            <Button onClick={() => localUpdateTableStatus(table.id, 'Occupied')}><Users className="mr-2 h-4 w-4" />Guest Arrived</Button>
            <Button variant="outline" onClick={() => localUpdateTableStatus(table.id, 'Available')}><CheckCircle2 className="mr-2 h-4 w-4" />Cancel Reservation</Button>
          </>
        );
      case 'Cleaning':
        return <Button onClick={() => localUpdateTableStatus(table.id, 'Available')}><CheckCircle2 className="mr-2 h-4 w-4" />Mark as Available</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
            <div>
              <CardTitle>Table Layout</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setIsLayoutManagerOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> 
                <span className="font-bold">ADD OR REMOVE TABLE</span>
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  onCheckedChange={(checked) => handleSelectAllTables(Boolean(checked))}
                  checked={selectedTables.length === filteredTables.length && filteredTables.length > 0}
                  disabled={filteredTables.length === 0}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap p-4 border-t border-b">
              <Button 
                variant={'ghost'}
                onClick={() => handleStatusButtonClick('All')}
                className={cn('font-bold uppercase', filter === 'All' && 'ring-2 ring-offset-2 ring-black dark:ring-white')}
              >
                TOTAL TABLES ({tables.length})
              </Button>
              <Separator orientation="vertical" className="h-8 bg-foreground/50" />
              {(Object.keys(statusColors) as TableStatus[]).map(status => {
                  const Icon = statusIcons[status];
                  return (
                    <Button
                      key={status}
                      onClick={() => handleStatusButtonClick(status)}
                      onMouseEnter={() => setHoveredStatus(status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      className={cn(
                        status === 'Available' || status === 'Occupied' ? 'text-white' : 'text-black',
                        statusColors[status],
                        'transition-all',
                        filter === status && 'ring-2 ring-offset-2 ring-ring'
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
              return (
              <div
                key={table.id}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl relative border-2 border-black',
                  statusColors[table.status],
                  selectedTables.includes(table.id) && 'ring-4 ring-offset-2 ring-primary',
                  hoveredStatus === table.status && 'scale-110 z-10'
                )}
                onClick={() => setSelectedTable(table)}
                onDoubleClick={() => handleDoubleClick(table)}
              >
                <div className="absolute top-1 right-1">
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
                 {(occupancyCount[table.id] > 0) &&
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 text-white text-xs font-bold p-1 rounded-md">
                        <Repeat className="h-3 w-3" />
                        <span>{occupancyCount[table.id]}</span>
                    </div>
                }
                <div className="absolute top-1 left-1">
                  <Checkbox 
                    className="bg-white/50 border-gray-500"
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={() => handleSelectTable(table.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <span className={cn("text-6xl font-bold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.id}</span>
                <div className="flex items-center gap-1">
                  <Icon className={cn("h-4 w-4", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')} />
                  <span className={cn("text-base font-semibold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.status}</span>
                </div>
              </div>
            )})}
             {filteredTables.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">
                No tables match the current filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <DialogContent>
          {selectedTable && (
            <>
              <DialogHeader>
                <DialogTitle>Table {selectedTable.id} - {selectedTable.status}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Select an action for this table.</p>
              </div>
              <DialogFooter className="gap-2">
                {renderActions(selectedTable)}
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLayoutManagerOpen} onOpenChange={setIsLayoutManagerOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Table Layout</DialogTitle>
              <DialogDescription>
                Add or remove tables to match your restaurant's layout.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button variant="outline" onClick={addTable}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add a New Table
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={tables.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Last Table
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
                        <div className="py-4 space-y-2">
                           {order.items.map(item => (
                               <div key={item.name} className="flex justify-between">
                                   <span>{item.quantity}x {item.name}</span>
                                   <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                               </div>
                           ))}
                           <Separator />
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
    </div>
  );
}
