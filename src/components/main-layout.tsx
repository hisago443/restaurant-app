

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, LayoutGrid, Book, BarChart, Users } from 'lucide-react';
import { isSameDay } from 'date-fns';

import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import type { Table, TableStatus, Order, Bill, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MainLayout() {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    // Fetch initial tables with default status
    const initialTables: Table[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      status: 'Available',
    }));
    setTables(initialTables);
  }, []);

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

  const updateTableStatus = (tableIds: number[], status: TableStatus) => {
    setTables(tables.map(t => (tableIds.includes(t.id) ? { ...t, status } : t)));
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

  const occupancyCount = useMemo(() => {
    const counts: Record<number, number> = {};
    const todaysBills = billHistory.filter(bill => bill.timestamp && isSameDay(bill.timestamp, new Date()));
    
    todaysBills.forEach(bill => {
      counts[bill.tableId] = (counts[bill.tableId] || 0) + 1;
    });

    return counts;
  }, [billHistory]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="text-lg">Up & Above Assistant</span>
        </div>
        <div className="text-sm text-foreground text-center font-semibold bg-muted p-2 rounded-lg shadow-inner border border-black">
          <div>{formattedDate}</div>
          <div>{formattedTime}</div>
        </div>
      </header>
      <main className="flex-1">
        <Tabs value={activeTab} onValueChange={(tab) => {
          if (tab !== 'pos') setActiveOrder(null);
          setActiveTab(tab)
        }} className="h-full flex flex-col">
          <TabsList className="m-2 self-center rounded-lg bg-primary/10 p-2">
            <TabsTrigger value="pos" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Coffee className="mr-2 h-5 w-5" />
              POS
            </TabsTrigger>
            <TabsTrigger value="tables" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <LayoutGrid className="mr-2 h-5 w-5" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Book className="mr-2 h-5 w-5" />
              Kitchen
            </TabsTrigger>
             <TabsTrigger value="staff" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Users className="mr-2 h-5 w-5" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="admin" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <BarChart className="mr-2 h-5 w-5" />
              Admin
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="pos" className="m-0 p-0 h-full">
                <PosSystem 
                  tables={tables}
                  orders={orders}
                  setOrders={setOrders}
                  billHistory={billHistory}
                  setBillHistory={setBillHistory}
                  updateTableStatus={updateTableStatus}
                  occupancyCount={occupancyCount}
                  activeOrder={activeOrder}
                  setActiveOrder={setActiveOrder}
                />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement 
                tables={tables}
                orders={orders}
                billHistory={billHistory}
                setBillHistory={setBillHistory}
                updateTableStatus={updateTableStatus}
                addTable={addTable}
                removeLastTable={removeLastTable}
                occupancyCount={occupancyCount}
                onEditOrder={(order) => {
                  setActiveOrder(order);
                  setActiveTab('pos');
                }}
              />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <KitchenOrders orders={orders} setOrders={setOrders} />
            </TabsContent>
            <TabsContent value="staff" className="m-0 p-0">
              <StaffManagement 
                employees={employees} 
                setEmployees={setEmployees}
              />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard 
                billHistory={billHistory} 
                setBillHistory={setBillHistory}
                employees={employees} 
                setEmployees={setEmployees}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
