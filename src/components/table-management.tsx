
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Table, TableStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, LayoutTemplate } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const statusColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500 text-black',
  Occupied: 'bg-red-400 hover:bg-red-500 text-black',
  Reserved: 'bg-blue-400 hover:bg-blue-500 text-black',
  Cleaning: 'bg-yellow-400 hover:bg-yellow-500 text-black',
};

interface TableManagementProps {
  tables: Table[];
  updateTableStatus: (tableId: number, status: TableStatus) => void;
  addTable: () => void;
  removeLastTable: () => void;
}

export default function TableManagement({ tables, updateTableStatus, addTable, removeLastTable }: TableManagementProps) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);
  const [isLayoutManagerOpen, setIsLayoutManagerOpen] = useState(false);
  const [filter, setFilter] = useState<TableStatus | 'All'>('All');

  const filteredTables = tables.filter(table => filter === 'All' || table.status === filter);

  const localUpdateTableStatus = (tableId: number, status: TableStatus) => {
    updateTableStatus(tableId, status);
    setSelectedTable(null);
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
    selectedTables.forEach(tableId => {
      updateTableStatus(tableId, status);
    });
    setSelectedTables([]);
    setIsBulkManageOpen(false);
  }

  const handleStatusButtonClick = (status: TableStatus | 'All') => {
    if (status !== 'All' && selectedTables.length > 0) {
      handleBulkUpdate(status);
    } else {
      setFilter(status);
    }
  };

  const handleRemoveLastTable = () => {
    if (tables.length > 0) {
      const lastTableId = tables[tables.length - 1].id;
      removeLastTable();
      setSelectedTables(selectedTables.filter(id => id !== lastTableId));
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
              <CardDescription>Manage your restaurant's table configuration and status.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setIsLayoutManagerOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> Manage Layout
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
              <Button onClick={() => setIsBulkManageOpen(true)} disabled={selectedTables.length === 0}>
                Manage Selected ({selectedTables.length})
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap p-4 border-t border-b">
              <Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => handleStatusButtonClick('All')}>All Tables ({tables.length})</Button>
              {(Object.keys(statusColors) as TableStatus[]).map(status => (
                  <Button
                    key={status}
                    onClick={() => handleStatusButtonClick(status)}
                    className={cn(
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
                  'aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 relative',
                  statusColors[table.status],
                  selectedTables.includes(table.id) && 'ring-4 ring-offset-2 ring-primary'
                )}
                onClick={() => setSelectedTable(table)}
              >
                <div className="absolute top-1 left-1">
                  <Checkbox 
                    className="bg-white/50 border-gray-500"
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={() => handleSelectTable(table.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <span className="text-2xl font-bold">{table.id}</span>
                <span className="text-xs font-semibold">{table.status}</span>
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
      
      <Dialog open={isBulkManageOpen} onOpenChange={setIsBulkManageOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Manage Tables</DialogTitle>
              <DialogDescription>
                Update status for {selectedTables.length} selected tables.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="bulk-status">New Status</Label>
              <Select onValueChange={(value: TableStatus) => handleBulkUpdate(value)}>
                <SelectTrigger id="bulk-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Reserved">Reserved</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkManageOpen(false)}>Cancel</Button>
            </DialogFooter>
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
