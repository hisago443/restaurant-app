
"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, LayoutGrid, Book, BarChart, Users } from 'lucide-react';

import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import type { Table, TableStatus } from '@/lib/types';

const initialTables: Table[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  status: ['Available', 'Occupied', 'Reserved', 'Cleaning'][Math.floor(Math.random() * 4)] as TableStatus,
}));

export default function MainLayout() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>(initialTables);

  const updateTableStatus = (tableId: number, status: TableStatus) => {
    setTables(tables.map(t => (t.id === tableId ? { ...t, status } : t)));
  };

  const addTable = () => {
    const newTableId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1;
    const newTable: Table = { id: newTableId, status: 'Available' };
    setTables([...tables, newTable]);
  };

  const removeLastTable = () => {
    if (tables.length > 0) {
      setTables(prevTables => {
        if (prevTables.length === 0) return [];
        const tableToRemove = prevTables.reduce((last, current) => (current.id > last.id ? current : last));
        return prevTables.filter(t => t.id !== tableToRemove.id);
      });
    }
  };

  useEffect(() => {
    setCurrentDateTime(new Date());
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime
    ? currentDateTime.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formattedTime = currentDateTime
    ? currentDateTime.toLocaleTimeString()
    : '';

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="text-lg">Up & Above Assistant</span>
        </div>
        <div className="text-sm text-foreground text-center font-semibold">
          <div>{formattedDate}</div>
          <div>{formattedTime}</div>
        </div>
      </header>
      <main className="flex-1">
        <Tabs defaultValue="pos" className="h-full flex flex-col">
          <TabsList className="m-4 self-start">
            <TabsTrigger value="pos">
              <Coffee className="mr-2 h-4 w-4" />
              POS
            </TabsTrigger>
            <TabsTrigger value="tables">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="kitchen">
              <Book className="mr-2 h-4 w-4" />
              Kitchen
            </TabsTrigger>
             <TabsTrigger value="staff">
              <Users className="mr-2 h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="admin">
              <BarChart className="mr-2 h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="pos" className="m-0 p-0 h-full">
                <PosSystem />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement 
                tables={tables}
                updateTableStatus={updateTableStatus}
                addTable={addTable}
                removeLastTable={removeLastTable}
              />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <KitchenOrders />
            </TabsContent>
            <TabsContent value="staff" className="m-0 p-0">
              <StaffManagement />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
