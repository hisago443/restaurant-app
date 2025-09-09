
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import type { Table, TableStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, LayoutTemplate } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const statusColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-yellow-400 hover:bg-yellow-500',
};

interface TableManagementProps {
  tables: Table[];
  updateTableStatus: (tableIds: number[], status: TableStatus) => void;
  addTable: () => void;
  removeLastTable: () => void;
}

export default function TableManagement({ tables, updateTableStatus, addTable, removeLastTable }: TableManagementProps) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isLayoutManagerOpen, setIsLayoutManagerOpen] = useState(false);
  const [filter, setFilter] = useState<TableStatus | 'All'>('All');
  const [hoveredStatus, setHoveredStatus] = useState<TableStatus | null>(null);


  const filteredTables = tables.filter(table => filter === 'All' || table.status === filter);

  const localUpdateTableStatus = (tableId: number, status: TableStatus) => {
    updateTableStatus([tableId], status);
    setSelectedTable(null);
  };

  const handleDoubleClick = (table: Table) => {
    if (table.status === 'Available') {
      updateTableStatus([table.id], 'Occupied');
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

  const renderActions = (table: Table) => {
    switch (table.status) {
      case 'Available':
        return (
          <>
            <Button onClick={() => localUpdateTableStatus(table.id, 'Occupied')}>Seat Guests</Button>
            <Button variant="outline" onClick={() => localUpdateTableStatus(table.id, 'Reserved')}>Reserve Table</Button>
          </>
        );
      case 'Occupied':
        return (
          <>
            <Button>View Order</Button>
            <Button variant="destructive" onClick={() => localUpdateTableStatus(table.id, 'Cleaning')}>Customer Left</Button>
          </>
        );
      case 'Reserved':
        return (
          <>
            <Button onClick={() => localUpdateTableStatus(table.id, 'Occupied')}>Guest Arrived</Button>
            <Button variant="outline" onClick={() => localUpdateTableStatus(table.id, 'Available')}>Cancel Reservation</Button>
          </>
        );
      case 'Cleaning':
        return <Button onClick={() => localUpdateTableStatus(table.id, 'Available')}>Mark as Available</Button>;
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
              <Button variant="outline" className="font-bold" onClick={() => setIsLayoutManagerOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> ADD OR REMOVE TABLE
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
                className={cn('font-bold uppercase', filter === 'All' && 'ring-2 ring-offset-2 ring-ring')}
              >
                TOTAL TABLES ({tables.length})
              </Button>
              <Separator orientation="vertical" className="h-8" />
              {(Object.keys(statusColors) as TableStatus[]).map(status => (
                  <Button
                    key={status}
                    onClick={() => handleStatusButtonClick(status)}
                    onMouseEnter={() => setHoveredStatus(status)}
                    onMouseLeave={() => setHoveredStatus(null)}
                    className={cn(
                      'text-black',
                      statusColors[status],
                      'transition-all',
                      filter === status && 'ring-2 ring-offset-2 ring-ring'
                    )}
                  >
                      {status} ({tables.filter(t => t.status === status).length})
                  </Button>
              ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
            {filteredTables.map(table => (
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
                <div className="absolute top-1 left-1">
                  <Checkbox 
                    className="bg-white/50 border-gray-500"
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={() => handleSelectTable(table.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <span className="text-2xl font-bold text-black">{table.id}</span>
                <span className="text-xs font-semibold text-black">{table.status}</span>
              </div>
            ))}
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
    </div>
  );
}
