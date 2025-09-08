"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { Table, TableStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  const updateTableStatus = (tableId: number, status: TableStatus) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, status } : t));
    setSelectedTable(null);
  };

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
          <CardTitle>Table Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105',
                  statusColors[table.status]
                )}
                onClick={() => setSelectedTable(table)}
              >
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
    </div>
  );
}
