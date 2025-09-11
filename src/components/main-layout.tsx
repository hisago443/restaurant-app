

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, LayoutGrid, Soup, Users, Shield, Receipt } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Table, TableStatus, Order, Bill, Employee, OrderItem, Expense } from '@/lib/types';
import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import ExpensesTracker from './expenses-tracker';
import { Separator } from '@/components/ui/separator';


export default function MainLayout() {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState('pos');

  // Lifted state for POS
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showOccupancy, setShowOccupancy] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Record<number, OrderItem[]>>({});
  
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const savedColors = localStorage.getItem('categoryColors');
      if (savedColors) {
        setCategoryColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error("Could not parse 'categoryColors' from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(categoryColors).length > 0) {
        localStorage.setItem('categoryColors', JSON.stringify(categoryColors));
      }
    } catch (e) {
      console.error("Could not save 'categoryColors' to localStorage", e);
    }
  }, [categoryColors]);
  
  const clearCurrentOrder = useCallback((fullReset = false) => {
    if (selectedTableId && !activeOrder) {
        setPendingOrders(prev => {
            const newPending = {...prev};
            delete newPending[selectedTableId];
            return newPending;
        });
    }
    setCurrentOrderItems([]);
    if (fullReset) {
      setDiscount(0);
      setSelectedTableId(null);
      setActiveOrder(null);
    } else {
       // When just clearing items, if there's no active order,
       // it implies we're clearing a pending order for the selected table.
       // We should also clear it from the pendingOrders state.
       if (selectedTableId && !activeOrder) {
         setPendingOrders(prev => {
           const newPending = {...prev};
           delete newPending[selectedTableId];
           return newPending;
         });
       }
    }
  }, [selectedTableId, activeOrder]);

  const handleSelectTable = useCallback((tableId: number | null) => {
    const previousTableId = selectedTableId;

    // If we are switching from one table to another, and there was a pending (un-submitted) order...
    if (previousTableId && previousTableId !== tableId && !activeOrder && currentOrderItems.length > 0) {
      // ...save the current items as a pending order for the previous table.
      setPendingOrders(prev => ({
        ...prev,
        [previousTableId]: currentOrderItems,
      }));
    }
    
    // Set the new table as the selected one.
    setSelectedTableId(tableId);
  }, [selectedTableId, activeOrder, currentOrderItems.length]);
  
  useEffect(() => {
    // This effect handles the logic for switching between tables and managing pending vs. active orders.
    if (selectedTableId !== null) {
      // Find an order that has already been sent to the kitchen for the selected table.
      const existingOrder = orders.find(o => o.tableId === selectedTableId && o.status !== 'Completed');
      if (existingOrder) {
        // This is an active, submitted order. Load its items.
        setActiveOrder(existingOrder);
        setCurrentOrderItems(existingOrder.items);
        setDiscount(0);
      } else {
        // This is a new order for the selected table, or we are returning to a pending (un-submitted) order.
        setActiveOrder(null);
        // If there's a pending order for this table, load it.
        // Otherwise, keep the current items in the cart.
        if (pendingOrders[selectedTableId]) {
          setCurrentOrderItems(pendingOrders[selectedTableId]);
        }
        setDiscount(0);
      }
    } else {
        // No table is selected.
        // If there's no active order, don't clear the cart. The user might be building an order first.
        // If there was an active order, clear it as we've deselected its table.
        if (activeOrder) {
            setActiveOrder(null);
            setCurrentOrderItems([]);
            setDiscount(0);
        }
    }
  }, [selectedTableId, orders, pendingOrders]);


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

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      const expensesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date.toDate(),
        } as Expense;
      });
      setExpenses(expensesData.sort((a, b) => b.date.getTime() - a.date.getTime()));
    }, (error) => {
        console.error("Firestore Error (expenses): ", error);
        toast({
            variant: 'destructive',
            title: 'Firestore Connection Error',
            description: 'Could not fetch expense data.',
        })
    });

    return () => {
      unsubEmployees();
      unsubBills();
      unsubExpenses();
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

  const updateTableStatus = useCallback((tableIds: number[], status: TableStatus) => {
    setTables(tables => tables.map(t => (tableIds.includes(t.id) ? { ...t, status } : t)));
  }, []);

  const addTable = () => {
    setTables(prevTables => {
      const newTableId = prevTables.length > 0 ? Math.max(...prevTables.map(t => t.id)) + 1 : 1;
      const newTable: Table = { id: newTableId, status: 'Available' };
      return [...prevTables, newTable];
    });
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
  
  const onOrderCreated = useCallback((order: Order) => {
    setOrders(prev => [...prev, order]);
    setActiveOrder(order);
    setCurrentOrderItems(order.items);
  }, []);
  
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
          <TabsList className="m-2 self-center p-0 h-auto bg-transparent">
            <TabsTrigger value="pos" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <Utensils /> Main
            </TabsTrigger>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TabsTrigger value="tables" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
              <LayoutGrid /> Tables
            </TabsTrigger>
             <Separator orientation="vertical" className="h-6 mx-1" />
            <TabsTrigger value="kitchen" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
              <Soup /> Kitchen
            </TabsTrigger>
            <Separator orientation="vertical" className="h-6 mx-1" />
             <TabsTrigger value="staff" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
              <Users /> Staff
            </TabsTrigger>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TabsTrigger value="expenses" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
              <Receipt /> Expenses
            </TabsTrigger>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TabsTrigger value="admin" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
              <Shield /> Admin
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
                  setSelectedTableId={handleSelectTable}
                  clearCurrentOrder={clearCurrentOrder}
                  onOrderCreated={onOrderCreated}
                  showOccupancy={showOccupancy}
                  pendingOrders={pendingOrders}
                  setPendingOrders={setPendingOrders}
                  categoryColors={categoryColors}
                  setCategoryColors={setCategoryColors}
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
                  setSelectedTableId(order.tableId);
                  setActiveOrder(order);
                  setCurrentOrderItems(order.items);
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
            <TabsContent value="expenses" className="m-0 p-0">
              <ExpensesTracker expenses={expenses} />
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
