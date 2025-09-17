

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, LayoutGrid, Soup, Users, Shield, Receipt, Package, PanelTop, PanelLeft } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { collection, onSnapshot, doc, setDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Table, TableStatus, Order, Bill, Employee, OrderItem, Expense, InventoryItem, KOTPreference, OrderType } from '@/lib/types';
import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import ExpensesTracker from './expenses-tracker';
import InventoryManagement from './inventory-management';
import { Separator } from '@/components/ui/separator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import SetupWizard from './setup-wizard';

const PENDING_ORDER_KEY = -1;

type NavPosition = 'top' | 'left';

export default function MainLayout() {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState('pos');
  const [initialTableForManagement, setInitialTableForManagement] = useState<number | null>(null);
  const [navPosition, setNavPosition] = useState<NavPosition>('top');
  const [customerCreditLimit, setCustomerCreditLimit] = useState(10000);
  const [vendorCreditLimit, setVendorCreditLimit] = useState(50000);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [venueName, setVenueName] = useState('Up & Above Assistant');
  const [kotPreference, setKotPreference] = useState<KOTPreference>({ type: 'single', categories: [] });
  const [showTableDetailsOnPOS, setShowTableDetailsOnPOS] = useState(false);
  const [showReservationTimeOnPOS, setShowReservationTimeOnPOS] = useState(false);

  useEffect(() => {
    try {
      const setupComplete = localStorage.getItem('setupComplete');
      if (!setupComplete) {
        setShowSetupWizard(true);
      }
    } catch (e) {
      console.error("Could not access localStorage", e);
      // Fallback for environments where localStorage is not available
      setShowSetupWizard(true); 
    } finally {
      setIsCheckingSetup(false);
    }
  }, []);

  const handleKotPreferenceChange = useCallback(async (preference: KOTPreference) => {
    setKotPreference(preference);
    try {
      await setDoc(doc(db, "settings", "venue"), { kotPreference: preference }, { merge: true });
    } catch (error) {
      console.error("Error saving KOT preference:", error);
      toast({
        variant: "destructive",
        title: "Could not save preference",
        description: "Your KOT preference could not be saved. Please try again.",
      });
    }
  }, [toast]);

  useEffect(() => {
    const fetchVenueSettings = async () => {
      try {
        const venueDoc = await getDoc(doc(db, "settings", "venue"));
        if (venueDoc.exists()) {
          const data = venueDoc.data();
          setVenueName(data.name || 'Up & Above Assistant');
          setKotPreference(data.kotPreference || { type: 'single', categories: [] });
        }
      } catch (error) {
        console.error("Error fetching venue settings:", error);
      }
    };
    fetchVenueSettings();
    
    // Also listen for real-time updates
    const unsub = onSnapshot(doc(db, "settings", "venue"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setVenueName(data.name || 'Up & Above Assistant');
             if (data.kotPreference) {
              setKotPreference(data.kotPreference);
            }
        }
    });

    return () => unsub();
  }, []);


  useEffect(() => {
    try {
      const savedCustomerLimit = localStorage.getItem('customerCreditLimit');
      const savedVendorLimit = localStorage.getItem('vendorCreditLimit');
      if (savedCustomerLimit) setCustomerCreditLimit(JSON.parse(savedCustomerLimit));
      if (savedVendorLimit) setVendorCreditLimit(JSON.parse(savedVendorLimit));
    } catch (e) {
      console.error("Could not parse credit limits from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('customerCreditLimit', JSON.stringify(customerCreditLimit));
    } catch (e) {
      console.error("Could not save customer credit limit to localStorage", e);
    }
  }, [customerCreditLimit]);

  useEffect(() => {
    try {
      localStorage.setItem('vendorCreditLimit', JSON.stringify(vendorCreditLimit));
    } catch (e) {
      console.error("Could not save vendor credit limit to localStorage", e);
    }
  }, [vendorCreditLimit]);

  // Lifted state for POS
  const [selectedTableId, setSelectedTableId] = useState<number | null>(1);
  const [discount, setDiscount] = useState(0);
  const [showOccupancy, setShowOccupancy] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Record<number, OrderItem[]>>({});
  
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [keyboardMode, setKeyboardMode] = useState<'table' | 'order' | 'confirm'>('table');
  const mainRef = useRef<HTMLDivElement>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>('Dine-In');


  useEffect(() => {
    // Focus the main area on mount to enable keyboard shortcuts immediately
    mainRef.current?.focus();
  }, []);


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
    setCurrentOrderItems([]);
    setDiscount(0);
    setActiveOrder(null);
    
    const tableIdToClear = selectedTableId === null ? PENDING_ORDER_KEY : selectedTableId;

    setPendingOrders(prev => {
        const newPending = {...prev};
        delete newPending[tableIdToClear];
        return newPending;
    });

    if (fullReset) {
      setSelectedTableId(1);
    }
  }, [selectedTableId]);

  const handleSelectTable = useCallback((tableId: number | null) => {
    const currentTableKey = selectedTableId === null ? PENDING_ORDER_KEY : selectedTableId;

    // Save current work before switching
    if (currentOrderItems.length > 0) {
        if (!activeOrder) { // Only save if it's a PENDING order, not an active one
            setPendingOrders(prev => ({ ...prev, [currentTableKey]: currentOrderItems }));
        }
    }

    setSelectedTableId(tableId);

    if (tableId === null) {
        // Switched to the unassigned order view
        setActiveOrder(null);
        setCurrentOrderItems(pendingOrders[PENDING_ORDER_KEY] || []);
        setDiscount(0);
        setKeyboardMode('order');
        return;
    }

    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const existingOrder = orders.find(o => o.tableId === tableId && o.status !== 'Completed');

    if (existingOrder) {
        // An active order exists for this table, load it.
        setActiveOrder(existingOrder);
        setCurrentOrderItems(existingOrder.items);
        setDiscount(0); // Reset discount when loading an existing order
    } else {
        // No active order for this table.
        setActiveOrder(null);
        let itemsToLoad = pendingOrders[tableId] || [];
        
        // If the table is available and we have a pending unassigned order, transfer it.
        if (itemsToLoad.length === 0 && table.status === 'Available' && (pendingOrders[PENDING_ORDER_KEY] || []).length > 0) {
            itemsToLoad = pendingOrders[PENDING_ORDER_KEY]!;
            
            // Atomically move items from unassigned to this table's pending slot
            setPendingOrders(prev => {
                const newPending = {...prev};
                delete newPending[PENDING_ORDER_KEY]; // Clear unassigned
                newPending[tableId] = itemsToLoad; // Assign to new table
                return newPending;
            });
        }
        
        setCurrentOrderItems(itemsToLoad);
        setDiscount(0);
    }
    setKeyboardMode('table');
}, [tables, orders, activeOrder, currentOrderItems, selectedTableId, pendingOrders, setKeyboardMode]);
  
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
    const seedInventory = async () => {
      const inventoryCollection = collection(db, "inventory");
      const snapshot = await getDocs(inventoryCollection);
      if (snapshot.empty) {
        const defaultItems = [
          { name: 'Coffee Beans', category: 'Beverages', stock: 10, capacity: 20, unit: 'kg' },
          { name: 'Milk', category: 'Dairy', stock: 25, capacity: 50, unit: 'liters' },
          { name: 'Sugar', category: 'Pantry', stock: 40, capacity: 50, unit: 'kg' },
          { name: 'All-Purpose Flour', category: 'Pantry', stock: 15, capacity: 25, unit: 'kg' },
          { name: 'Pizza Base', category: 'Bakery', stock: 50, capacity: 100, unit: 'units' },
        ];
        const batch = writeBatch(db);
        defaultItems.forEach(item => {
          const docRef = doc(collection(db, "inventory")); // Automatically generate ID
          batch.set(docRef, item);
        });
        await batch.commit();
        console.log("Default inventory seeded.");
      }
    };
    
    seedInventory();

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

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventory(data);
    }, (error) => {
        console.error("Firestore Error (inventory): ", error);
        toast({
            variant: 'destructive',
            title: 'Firestore Connection Error',
            description: 'Could not fetch inventory data.',
        });
    });

    return () => {
      unsubEmployees();
      unsubBills();
      unsubExpenses();
      unsubInventory();
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

  const updateTableStatus = useCallback((tableIds: number[], status: TableStatus, reservationDetails?: Table['reservationDetails']) => {
    setTables(tables => tables.map(t => {
      if (tableIds.includes(t.id)) {
        return { ...t, status, reservationDetails: status === 'Reserved' ? reservationDetails : undefined };
      }
      return t;
    }));
  }, []);

  const updateTableDetails = useCallback((tableId: number, details: { name?: string, seats?: number }) => {
    setTables(prevTables => prevTables.map(t => 
        t.id === tableId ? { ...t, name: details.name || t.name, seats: details.seats || t.seats } : t
    ));
    toast({ title: "Table Updated", description: `Details for Table ${tableId} have been saved.` });
  }, [toast]);

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
      if (bill.tableId) {
        counts[bill.tableId] = (counts[bill.tableId] || 0) + 1;
      }
    });

    return counts;
  }, [billHistory]);

  const handleTabChange = (tab: string) => {
    setInitialTableForManagement(null); // Reset when manually changing tabs
    setActiveTab(tab);
  }
  
  const onOrderCreated = useCallback((order: Order) => {
    setOrders(prev => [...prev, order]);
    setActiveOrder(order);
    setCurrentOrderItems(order.items);
    if(order.tableId) {
        setPendingOrders(prev => {
            const newPending = {...prev};
            delete newPending[order.tableId!];
            return newPending;
        })
    }
  }, []);
  
  const handleViewTableDetails = (tableId: number) => {
    setInitialTableForManagement(tableId);
    setActiveTab('tables');
  };
  
  const handleEditOrderFromShortcut = (tableId: number) => {
    const order = orders.find(o => o.tableId === tableId && o.status !== 'Completed');
    if (order) {
      setSelectedTableId(order.tableId);
      setActiveOrder(order);
      setCurrentOrderItems(order.items);
      setDiscount(0);
      setActiveTab('pos');
    } else {
        // If no active order, just select the table for a new order.
        handleSelectTable(tableId);
        setActiveTab('pos');
    }
  };

  const handleCreateOrderFromTables = (tableId: number) => {
    handleSelectTable(tableId);
    setActiveTab('pos');
  };
  
  const toggleNavPosition = () => {
    setNavPosition(pos => pos === 'top' ? 'left' : 'top');
  }

  const handleSetupComplete = () => {
    try {
      localStorage.setItem('setupComplete', 'true');
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setShowSetupWizard(false);
  }


  if (isCheckingSetup) {
    return null; // or a loading spinner
  }

  if (showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="text-lg">{venueName}</span>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleNavPosition} className='rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2'>
                      {navPosition === 'top' ? <PanelLeft className="h-5 w-5" /> : <PanelTop className="h-5 w-5" />}
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Change Nav Position</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm text-foreground text-center font-semibold bg-muted p-2 rounded-lg shadow-inner">
            <div>{formattedDate}</div>
            <div>{formattedTime}</div>
          </div>
        </div>
      </header>
       <DndProvider backend={HTML5Backend}>
        <Tabs value={activeTab} onValueChange={handleTabChange} orientation={navPosition === 'left' ? 'vertical' : 'horizontal'} className={cn("h-full", navPosition === 'top' ? 'flex flex-col' : 'flex')}>
          <div className={cn("flex justify-center border-b kitchen-tabs", navPosition === 'left' && "flex-col justify-start items-start border-b-0 border-r")}>
             <TabsList className={cn("m-2 p-0 h-auto bg-transparent", navPosition === 'left' && "flex-col items-start w-auto")}>
              <TabsTrigger value="pos" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                  <Utensils /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Main</span>
              </TabsTrigger>
              <Separator orientation={navPosition === 'top' ? 'vertical' : 'horizontal'} className={cn(navPosition === 'top' ? "h-6 mx-1" : "w-full my-1")} />
              <TabsTrigger value="tables" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <LayoutGrid /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Tables</span>
              </TabsTrigger>
              <Separator orientation={navPosition === 'top' ? 'vertical' : 'horizontal'} className={cn(navPosition === 'top' ? "h-6 mx-1" : "w-full my-1")} />
              <TabsTrigger value="kitchen" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <Soup /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Kitchen & Inventory</span>
              </TabsTrigger>
              <Separator orientation={navPosition === 'top' ? 'vertical' : 'horizontal'} className={cn(navPosition === 'top' ? "h-6 mx-1" : "w-full my-1")} />
              <TabsTrigger value="staff" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <Users /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Staff</span>
              </TabsTrigger>
              <Separator orientation={navPosition === 'top' ? 'vertical' : 'horizontal'} className={cn(navPosition === 'top' ? "h-6 mx-1" : "w-full my-1")} />
              <TabsTrigger value="expenses" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <Receipt /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Expenses</span>
              </TabsTrigger>
              <Separator orientation={navPosition === 'top' ? 'vertical' : 'horizontal'} className={cn(navPosition === 'top' ? "h-6 mx-1" : "w-full my-1")} />
              <TabsTrigger value="admin" className="px-4 py-2 text-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md flex items-center gap-2">
                <Shield /> <span className={cn(navPosition === 'left' && 'w-32 text-left')}>Admin</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <main ref={mainRef} className="flex-grow overflow-auto focus:outline-none" tabIndex={-1}>
            <TabsContent value="pos" className="m-0 p-0 h-full">
                <PosSystem 
                  venueName={venueName}
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
                  onViewTableDetails={handleViewTableDetails}
                  onEditOrder={handleEditOrderFromShortcut}
                  keyboardMode={keyboardMode}
                  setKeyboardMode={setKeyboardMode}
                  billHistory={billHistory}
                  kotPreference={kotPreference}
                  selectedOrderType={selectedOrderType}
                  setSelectedOrderType={setSelectedOrderType}
                  showTableDetailsOnPOS={showTableDetailsOnPOS}
                  showReservationTimeOnPOS={showReservationTimeOnPOS}
                />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement 
                tables={tables}
                orders={orders}
                billHistory={billHistory}
                updateTableStatus={updateTableStatus}
                updateTableDetails={updateTableDetails}
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
                onCreateOrder={handleCreateOrderFromTables}
                showOccupancy={showOccupancy}
                setShowOccupancy={setShowOccupancy}
                initialSelectedTableId={initialTableForManagement}
                showTableDetailsOnPOS={showTableDetailsOnPOS}
                setShowTableDetailsOnPOS={setShowTableDetailsOnPOS}
                showReservationTimeOnPOS={showReservationTimeOnPOS}
                setShowReservationTimeOnPOS={setShowReservationTimeOnPOS}
              />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <div className="grid grid-cols-[1fr_auto_1fr] h-full">
                  <div className="h-full">
                      <KitchenOrders orders={orders} setOrders={setOrders} />
                  </div>
                   <Separator orientation="vertical" />
                  <div className="h-full">
                      <InventoryManagement inventory={inventory} />
                  </div>
              </div>
            </TabsContent>
            <TabsContent value="staff" className="m-0 p-0">
              <StaffManagement 
                employees={employees} 
              />
            </TabsContent>
            <TabsContent value="expenses" className="m-0 p-0">
              <ExpensesTracker 
                expenses={expenses} 
                customerCreditLimit={customerCreditLimit}
                vendorCreditLimit={vendorCreditLimit}
              />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard 
                billHistory={billHistory} 
                employees={employees} 
                expenses={expenses}
                inventory={inventory}
                customerCreditLimit={customerCreditLimit}
                setCustomerCreditLimit={setCustomerCreditLimit}
                vendorCreditLimit={vendorCreditLimit}
                setVendorCreditLimit={setVendorCreditLimit}
                onRerunSetup={() => setShowSetupWizard(true)}
                kotPreference={kotPreference}
                setKotPreference={handleKotPreferenceChange}
              />
            </TabsContent>
          </main>
        </Tabs>
      </DndProvider>
    </div>
  );
}
