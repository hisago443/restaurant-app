"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Table, TableStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const initialTables: Table[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  status: ['Available', 'Occupied', 'Reserved', 'Cleaning'][Math.floor(Math.random() * 4)] as TableStatus,
}));

const statusColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500 text-white',
  Occupied: 'bg-orange-400 hover:bg-orange-500 text-white',
  Reserved: 'bg-blue-400 hover:bg-blue-500 text-white',
  Cleaning: 'bg-yellow-400 hover:bg-yellow-500 text-black',
};

export default function TableManagement() {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);

  const updateTableStatus = (tableId: number, status: TableStatus) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, status } : t));
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
      setSelectedTables(tables.map(t => t.id));
    } else {
      setSelectedTables([]);
    }
  }
  
  const handleBulkUpdate = (status: TableStatus) => {
    setTables(tables.map(t => selectedTables.includes(t.id) ? { ...t, status } : t));
    setSelectedTables([]);
    setIsBulkManageOpen(false);
  }

  const renderActions = (table: Table) => {
    switch (table.status) {
      case 'Available':
        return (
          <>
            <Button onClick={() => updateTableStatus(table.id, 'Occupied')}>Seat Guests</Button>
            <Button variant="outline" onClick={() => updateTableStatus(table.id, 'Reserved')}>Reserve Table</Button>
          </>
        );
      case 'Occupied':
        return (
          <>
            <Button>View Order</Button>
            <Button variant="destructive" onClick={() => updateTableStatus(table.id, 'Cleaning')}>Customer Left</Button>
          </>
        );
      case 'Reserved':
        return (
          <>
            <Button onClick={() => updateTableStatus(table.id, 'Occupied')}>Guest Arrived</Button>
            <Button variant="outline" onClick={() => updateTableStatus(table.id, 'Available')}>Cancel Reservation</Button>
          </>
        );
      case 'Cleaning':
        return <Button onClick={() => updateTableStatus(table.id, 'Available')}>Mark as Available</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Table Layout</CardTitle>
              <CardDescription>Click on a table to manage it, or select multiple tables to manage them at once.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  onCheckedChange={handleSelectAllTables}
                  checked={selectedTables.length === tables.length && tables.length > 0}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
              <Button onClick={() => setIsBulkManageOpen(true)} disabled={selectedTables.length === 0}>
                Manage Selected ({selectedTables.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
            {tables.map(table => (
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
    </div>
  );
}
