

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, LayoutGrid, Book, BarChart, Users } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Table, TableStatus, Order, Bill, Employee, OrderItem } from '@/lib/types';
import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";


export default function MainLayout() {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState('pos');

  // Lifted state for POS
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showOccupancy, setShowOccupancy] = useState(true);

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

  // Centralized data fetching
  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
      setEmployees(employeesData);
    }, (error) => {
        console.error("Firestore Error (employees): ", error);
        toast({
            variant: 'destructive',
            title: 'Firestore Connection Error',
            description: 'Could not fetch employee data.',
        })
    });

    const unsubBills = onSnapshot(collection(db, "bills"), (snapshot) => {
      const billsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate(),
        } as Bill;
      });
      setBillHistory(billsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    }, (error) => {
        console.error("Firestore Error (bills): ", error);
        toast({
            variant: 'destructive',
            title: 'Firestore Connection Error',
            description: 'Could not fetch bill history.',
        })
    });

    return () => {
      unsubEmployees();
      unsubBills();
    };
  }, [toast]);


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
    const todaysBills = billHistory.filter(bill => bill.timestamp && isSameDay(new Date(bill.timestamp), new Date()));
    
    todaysBills.forEach(bill => {
      counts[bill.tableId] = (counts[bill.tableId] || 0) + 1;
    });

    return counts;
  }, [billHistory]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }
  
  const clearCurrentOrder = (fullReset = false) => {
    setCurrentOrderItems([]);
    if (fullReset) {
      setDiscount(0);
      setSelectedTableId(null);
      setActiveOrder(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="text-lg">Up & Above Assistant</span>
        </div>
        <div className="text-sm text-foreground text-center font-semibold bg-muted p-2 rounded-lg shadow-inner">
          <div>{formattedDate}</div>
          <div>{formattedTime}</div>
        </div>
      </header>
      <main className="flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          <TabsList className="m-2 self-center rounded-lg bg-primary/10 p-2">
            <TabsTrigger value="pos" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              POS
            </TabsTrigger>
            <TabsTrigger value="tables" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              Tables
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              Kitchen
            </TabsTrigger>
             <TabsTrigger value="staff" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              Staff
            </TabsTrigger>
            <TabsTrigger value="admin" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              Admin
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="pos" className="m-0 p-0 h-full">
                <PosSystem 
                  tables={tables}
                  orders={orders}
                  setOrders={setOrders}
                  updateTableStatus={updateTableStatus}
                  occupancyCount={occupancyCount}
                  activeOrder={activeOrder}
                  setActiveOrder={setActiveOrder}
                  orderItems={currentOrderItems}
                  setOrderItems={setCurrentOrderItems}
                  discount={discount}
                  setDiscount={setDiscount}
                  selectedTableId={selectedTableId}
                  setSelectedTableId={setSelectedTableId}
                  clearCurrentOrder={clearCurrentOrder}
                  onOrderCreated={(order) => {
                    setOrders(prev => [...prev, order]);
                    setActiveOrder(order);
                  }}
                  showOccupancy={showOccupancy}
                />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement 
                tables={tables}
                orders={orders}
                billHistory={billHistory}
                updateTableStatus={updateTableStatus}
                addTable={addTable}
                removeLastTable={removeLastTable}
                occupancyCount={occupancyCount}
                onEditOrder={(order) => {
                  setActiveOrder(order);
                  setCurrentOrderItems(order.items);
                  setSelectedTableId(order.tableId);
                  setDiscount(0);
                  setActiveTab('pos');
                }}
                showOccupancy={showOccupancy}
                setShowOccupancy={setShowOccupancy}
              />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <KitchenOrders orders={orders} setOrders={setOrders} />
            </TabsContent>
            <TabsContent value="staff" className="m-0 p-0">
              <StaffManagement 
                employees={employees} 
              />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard 
                billHistory={billHistory} 
                employees={employees} 
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
