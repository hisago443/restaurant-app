
"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, LayoutGrid, Book, BarChart, Users } from 'lucide-react';

import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import type { Table, TableStatus, Order, Bill, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function MainLayout() {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    // Fetch initial tables from random data
    const initialTables: Table[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      status: ['Available', 'Occupied', 'Reserved', 'Cleaning'][Math.floor(Math.random() * 4)] as TableStatus,
    }));
    setTables(initialTables);
  
    // // Listen for real-time updates to employees
    // const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
    //   const employeesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    //   setEmployees(employeesData);
    // }, (error) => {
    //     console.error("Firestore Error (employees): ", error);
    //     toast({
    //         variant: 'destructive',
    //         title: 'Firestore Connection Error',
    //         description: 'Could not fetch employee data. Please check your connection and Firestore security rules.',
    //     })
    // });

    // // Listen for real-time updates to bills
    // const unsubBills = onSnapshot(collection(db, "bills"), (snapshot) => {
    //   const billsData = snapshot.docs.map(doc => {
    //     const data = doc.data();
    //     return {
    //       ...data,
    //       id: doc.id,
    //       timestamp: data.timestamp.toDate(),
    //     } as Bill;
    //   });
    //   setBillHistory(billsData);
    // }, (error) => {
    //     console.error("Firestore Error (bills): ", error);
    //     toast({
    //         variant: 'destructive',
    //         title: 'Firestore Connection Error',
    //         description: 'Could not fetch bill history. Please check your connection and Firestore security rules.',
    //     })
    // });

    // return () => {
    //   unsubEmployees();
    //   unsubBills();
    // };
  }, [toast]);


  const addOrder = (order: Omit<Order, 'id' | 'status'>) => {
    const newOrder: Order = {
      ...order,
      id: `K${(orders.length + 1).toString().padStart(3, '0')}`,
      status: 'Pending',
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    // Also update the table status to Occupied
    updateTableStatus([order.tableId], 'Occupied');
  };

  const addBill = async (bill: Omit<Bill, 'id'| 'timestamp'>) => {
    try {
      const billWithTimestamp = {
        ...bill,
        timestamp: new Date(),
      };
      const docRef = await addDoc(collection(db, "bills"), billWithTimestamp);
      // Manually add to local state to reflect change immediately
      setBillHistory(prev => [...prev, { ...billWithTimestamp, id: docRef.id }]);
      toast({ title: 'Bill Saved', description: 'The bill has been saved to the database.' });
    } catch (error) {
      console.error("Error adding bill to Firestore: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the bill to the database.' });
    }
  };

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

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, "employees"), employee);
      // Manually add to local state to reflect change immediately
      setEmployees(prev => [...prev, { ...employee, id: docRef.id }]);
      toast({ title: 'Employee Added', description: 'New employee saved to the database.' });
    } catch (error) {
      console.error("Error adding employee: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the employee.' });
    }
  };

  const updateEmployee = async (employee: Employee) => {
    try {
      const employeeRef = doc(db, "employees", employee.id);
      await setDoc(employeeRef, {
        name: employee.name,
        role: employee.role,
        salary: employee.salary,
        color: employee.color,
      }, { merge: true });
       // Manually update local state
      setEmployees(prev => prev.map(e => e.id === employee.id ? employee : e));
      toast({ title: 'Employee Updated', description: 'Employee information has been updated.' });
    } catch (error) {
      console.error("Error updating employee: ", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update employee details.' });
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, "employees", employeeId));
       // Manually update local state
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      toast({ title: 'Employee Deleted', description: 'Employee has been removed from the database.' });
    } catch (error) {
      console.error("Error deleting employee: ", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the employee.' });
    }
  };


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
                <PosSystem tables={tables} addOrder={addOrder} addBill={addBill} />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement 
                tables={tables}
                orders={orders}
                billHistory={billHistory}
                updateTableStatus={updateTableStatus}
                addTable={addTable}
                removeLastTable={removeLastTable}
              />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <KitchenOrders orders={orders} setOrders={setOrders} />
            </TabsContent>
            <TabsContent value="staff" className="m-0 p-0">
              <StaffManagement 
                employees={employees} 
                addEmployee={addEmployee}
                updateEmployee={updateEmployee}
                deleteEmployee={deleteEmployee}
              />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard billHistory={billHistory} employees={employees} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
