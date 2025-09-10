

"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Minus, X, FilePlus, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, CheckCircle2, Users, Bookmark, Sparkles, Repeat, Edit, UserCheck, BookmarkX, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddItemDialog } from './add-item-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order, Bill, TableStatus } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';

const vegColor = 'bg-green-100 dark:bg-green-900/30';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30';

const colorPalette = [
    'bg-sky-200 dark:bg-sky-800/70',
    'bg-amber-200 dark:bg-amber-800/70',
    'bg-pink-200 dark:bg-pink-800/70',
    'bg-lime-200 dark:bg-lime-800/70',
    'bg-purple-200 dark:bg-purple-800/70',
    'bg-teal-200 dark:bg-teal-800/70',
    'bg-orange-200 dark:bg-orange-800/70',
    'bg-cyan-200 dark:bg-cyan-800/70',
];

type ViewMode = 'accordion' | 'grid' | 'list';

const statusColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-amber-300 hover:bg-amber-400',
};

const statusIcons: Record<TableStatus, React.ElementType> = {
  Available: CheckCircle2,
  Occupied: Users,
  Reserved: Bookmark,
  Cleaning: Sparkles,
};

interface PosSystemProps {
  tables: Table[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateTableStatus: (tableIds: number[], status: TableStatus) => void;
  occupancyCount: Record<number, number>;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  orderItems: OrderItem[];
  setOrderItems: (items: OrderItem[]) => void;
  discount: number;
  setDiscount: (discount: number) => void;
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;
  clearCurrentOrder: (fullReset?: boolean) => void;
  onOrderCreated: (order: Order) => void;
  showOccupancy: boolean;
}

export default function PosSystem({ 
    tables, 
    orders, 
    setOrders, 
    updateTableStatus, 
    occupancyCount, 
    activeOrder, 
    setActiveOrder,
    orderItems,
    setOrderItems,
    discount,
    setDiscount,
    selectedTableId,
    setSelectedTableId,
    clearCurrentOrder,
    onOrderCreated,
    showOccupancy,
}: PosSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [originalOrderItems, setOriginalOrderItems] = useState<OrderItem[]>([]);
  const [isClickToAdd, setIsClickToAdd] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState('');
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');
  const [menuItemColors, setMenuItemColors] = useState<Record<string, string>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  const typedMenuData: MenuCategory[] = menuData;

  const currentActiveTableId = useMemo(() => {
    if (activeOrder) return activeOrder.tableId;
    return selectedTableId;
  }, [activeOrder, selectedTableId]);
  
  useEffect(() => {
    const defaultCategoryColors: Record<string, string> = {};
    typedMenuData.forEach((category, index) => {
      defaultCategoryColors[category.category] = colorPalette[index % colorPalette.length];
    });
    setCategoryColors(defaultCategoryColors);
    setActiveAccordionItems([]);
  }, [typedMenuData]);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('isClickToAdd');
      if (savedState !== null) {
        setIsClickToAdd(JSON.parse(savedState));
      }
    } catch (e) {
      console.error("Could not parse 'isClickToAdd' from localStorage", e);
      setIsClickToAdd(true); 
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('isClickToAdd', JSON.stringify(isClickToAdd));
    } catch (e) {
      console.error("Could not save 'isClickToAdd' to localStorage", e);
    }
  }, [isClickToAdd]);
  
  useEffect(() => {
    if (activeOrder) {
      setOriginalOrderItems([...activeOrder.items]);
    } else {
      if (orderItems.length === 0) {
          clearCurrentOrder(true);
      }
    }
  }, [activeOrder]);

  const handleSelectTable = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
  
    if (table.status === 'Cleaning') {
      updateTableStatus([tableId], 'Available');
      toast({ title: `Table ${tableId} is now Available.` });
      if (activeOrder?.tableId === tableId) {
        clearCurrentOrder(true);
      }
      return;
    }
  
    const existingOrder = orders.find(o => o.tableId === tableId && o.status !== 'Completed');
  
    if (existingOrder) {
      setActiveOrder(existingOrder);
      setOrderItems(existingOrder.items);
      setSelectedTableId(existingOrder.tableId);
      toast({ title: `Editing Order for Table ${tableId}`, description: 'Add or modify items.' });
    } else {
      clearCurrentOrder(true); 
      setSelectedTableId(tableId);
      toast({ title: `New Order for Table ${tableId}`, description: 'Add items to start the order.' });
    }
  };
  
  const setItemColor = (itemName: string, colorClass: string) => {
    setMenuItemColors(prev => ({ ...prev, [itemName]: colorClass }));
  };
  
  const setCategoryColor = (categoryName: string, colorClass: string) => {
    setCategoryColors(prev => ({ ...prev, [categoryName]: colorClass }));
  };

  const handleShuffleColors = () => {
    const shuffledPalette = [...colorPalette].sort(() => 0.5 - Math.random());
    const newCategoryColors: Record<string, string> = {};
    typedMenuData.forEach((category, index) => {
      newCategoryColors[category.category] = shuffledPalette[index % shuffledPalette.length];
    });
    setCategoryColors(newCategoryColors);
    toast({ title: "Colors Shuffled!", description: "New random colors have been applied to the categories." });
  };

  const filteredMenu = useMemo(() => {
    if (!searchTerm) return typedMenuData;
    const lowercasedTerm = searchTerm.toLowerCase();
    
    return typedMenuData.map(category => ({
      ...category,
      subCategories: category.subCategories.map(subCategory => ({
        ...subCategory,
        items: subCategory.items.filter(item => item.name.toLowerCase().includes(lowercasedTerm))
      })).filter(subCategory => subCategory.items.length > 0)
    })).filter(category => category.subCategories.length > 0);
  }, [searchTerm, typedMenuData]);

  const subtotal = useMemo(() => orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [orderItems]);
  const total = useMemo(() => subtotal * (1 - discount / 100), [subtotal, discount]);

  const getReceipt = useCallback(async (useAI = false): Promise<string> => {
    if (orderItems.length === 0) {
      return '';
    }
  
    const pad = (str: string, len: number, char = ' ') => str.padEnd(len, char);
    const money = (val: number) => `Rs. ${val.toFixed(2)}`;
  
    let receiptLines = [];
    receiptLines.push('*************************');
    receiptLines.push('    Up & Above Cafe    ');
    receiptLines.push('*************************');
    receiptLines.push('');
    receiptLines.push('Order Details:');
    orderItems.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        const qtyName = `${item.quantity} x ${item.name}`;
        const priceStr = money(lineTotal);
        const line = `${pad(`${index + 1}. ${qtyName}`, 25)} ${priceStr.padStart(10)}`;
        receiptLines.push(line);
    });
    receiptLines.push('');
    receiptLines.push('-------------------------');
    receiptLines.push(`${pad('Subtotal:', 25)} ${money(subtotal).padStart(10)}`);
  
    if (discount > 0) {
        const discountAmount = subtotal * (discount / 100);
        receiptLines.push(`${pad(`Discount (${discount}%):`, 25)} ${money(-discountAmount).padStart(10)}`);
        receiptLines.push('-------------------------');
    }
  
    receiptLines.push(`${pad('Total:', 25)} ${money(total).padStart(10)}`);
    receiptLines.push('');
    receiptLines.push('   Thank you for dining!   ');
    receiptLines.push('*************************');
  
    const localReceipt = receiptLines.join('\n');
    setReceiptPreview(localReceipt);
  
    if (useAI) {
      setIsProcessing(true);
      const input: GenerateReceiptInput = {
        items: orderItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        discount,
        subtotal,
        total,
      };
      try {
        const result = await generateReceipt(input);
        setReceiptPreview(result.receiptPreview);
        return result.receiptPreview;
      } catch (error) {
          console.error('AI receipt generation failed, using local version:', error);
          toast({
            variant: "default",
            title: "AI Assistant Offline",
            description: "Displaying standard receipt format.",
          });
          return localReceipt; 
      } finally {
        setIsProcessing(false);
      }
    }
  
    return localReceipt;
  
  }, [orderItems, discount, subtotal, total, toast]);
  
  useEffect(() => {
    if (orderItems.length > 0) {
      getReceipt(true);
    } else {
      setReceiptPreview('');
    }
  }, [orderItems, discount, getReceipt]);
  
  const addToOrder = (item: MenuItem, quantity: number) => {
    setOrderItems(prevItems => {
        const existingItem = prevItems.find(orderItem => orderItem.name === item.name);
        if (existingItem) {
            return prevItems.map(orderItem =>
                orderItem.name === item.name
                    ? { ...orderItem, quantity: orderItem.quantity + quantity }
                    : orderItem
            );
        } else {
            return [...prevItems, { ...item, quantity }];
        }
    });
  };

  const handleItemClick = (item: MenuItem) => {
    if (isClickToAdd) {
      addToOrder(item, 1);
    } else {
      setSelectedItem(item);
      setIsAddItemDialogOpen(true);
    }
  };

  const handleAddButtonClick = (item: MenuItem) => {
    setSelectedItem(item);
    setIsAddItemDialogOpen(true);
  };

  const updateQuantity = (name: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(name);
    } else {
      setOrderItems(orderItems.map(item => item.name === name ? { ...item, quantity } : item));
    }
  };

  const removeFromOrder = (name: string) => {
    setOrderItems(orderItems.filter(item => item.name !== name));
  };
  
  const printKot = (order: Order, diffItems?: OrderItem[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsToPrint = diffItems || order.items;
      const isUpdate = !!diffItems && diffItems.length > 0;

      const kitchenReceipt = `
        <html>
          <head>
            <title>Kitchen Order Ticket</title>
            <style>
              body { font-family: monospace; margin: 20px; font-size: 14px; }
              h2, h3 { text-align: center; margin: 5px 0; }
              ul { list-style: none; padding: 0; }
              li { display: flex; justify-content: space-between; margin: 5px 0; font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>${isUpdate ? 'KOT UPDATE' : 'KOT'} - Table ${order.tableId}</h2>
            <h3>Order ID: ${order.id}</h3>
            <hr>
            <ul>
              ${itemsToPrint.map(item => `<li><span>${isUpdate && item.quantity > 0 ? '+' : ''}${item.quantity} x ${item.name}</span></li>`).join('')}
            </ul>
            <hr>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `;
      printWindow.document.write(kitchenReceipt);
      printWindow.document.close();
    }
  };

  const addOrder = (order: Omit<Order, 'id' | 'status'>) => {
    const newOrder: Order = {
      ...order,
      id: `K${(orders.length + 1).toString().padStart(3, '0')}`,
      status: 'In Preparation', 
    };
    onOrderCreated(newOrder);
    printKot(newOrder);
    setOriginalOrderItems(newOrder.items);
  };
  
  const updateOrder = (updatedOrder: Order) => {
    setOrders(prevOrders => {
      return prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o));
    });
    setActiveOrder(updatedOrder);
  };

  const handleSendToKitchen = () => {
    if (orderItems.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Order', description: 'Cannot send an empty order to the kitchen.' });
      return;
    }
    if (!currentActiveTableId) {
      toast({ variant: 'destructive', title: 'No Table Selected', description: 'Please select a table before sending to the kitchen.' });
      return;
    }

    if (activeOrder) {
      const updatedOrder = { ...activeOrder, items: orderItems };
      
      const diffItems: OrderItem[] = [];
      const originalItemsMap = new Map(originalOrderItems.map(item => [item.name, item.quantity]));
      const currentItemsMap = new Map(orderItems.map(item => [item.name, item.quantity]));

      currentItemsMap.forEach((quantity, name) => {
        const originalQuantity = originalItemsMap.get(name) || 0;
        if (quantity > originalQuantity) {
          const itemDetails = orderItems.find(i => i.name === name);
          if (itemDetails) {
            diffItems.push({ ...itemDetails, quantity: quantity - originalQuantity });
          }
        }
      });
      
      if (diffItems.length > 0) {
        updateOrder(updatedOrder);
        printKot(updatedOrder, diffItems);
        toast({ title: 'Order Updated!', description: `KOT update sent for Table ${currentActiveTableId}.` });
        setOriginalOrderItems([...orderItems]);
      } else {
        toast({ title: 'No Changes', description: 'No new items were added to the order.' });
      }

    } else {
      const orderPayload = {
        items: orderItems,
        tableId: Number(currentActiveTableId),
      };
      addOrder(orderPayload);
      updateTableStatus([currentActiveTableId], 'Occupied');
      toast({ title: 'Order Sent!', description: `KOT sent to the kitchen for Table ${currentActiveTableId}.` });
    }
  };

  const addBill = async (bill: Omit<Bill, 'id'| 'timestamp'>) => {
    try {
      const billWithTimestamp = {
        ...bill,
        timestamp: new Date(),
      };
      await addDoc(collection(db, "bills"), billWithTimestamp);
      // Let real-time listener update state
      toast({ title: 'Bill Saved', description: 'The bill has been saved to the database.' });
    } catch (error) {
      console.error("Error adding bill to Firestore: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the bill to the database.' });
    }
  };


  const handleProcessPayment = async () => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Order", description: "Cannot process payment for an empty order." });
      return;
    }
    if (!currentActiveTableId) {
      toast({ variant: 'destructive', title: 'No Table Selected', description: 'Please select a table before processing payment.' });
      return;
    }
    
    const currentReceipt = await getReceipt(false); 

    if (!currentReceipt) {
        toast({ variant: 'destructive', title: 'Receipt Error', description: 'Could not generate receipt. Please try again.' });
        return;
    }
    setReceiptPreview(currentReceipt);
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    if (!currentActiveTableId) return;
  
    const finalReceipt = receiptPreview; 
  
    if (!finalReceipt && orderItems.length > 0) {
        toast({ variant: "destructive", title: "Billing Error", description: "Could not generate the final bill. Please try again." });
        return;
    }
  
    setIsPaymentDialogOpen(false);
    toast({ title: "Payment Successful", description: `Rs. ${total.toFixed(2)} confirmed.` });
    
    const billPayload: Omit<Bill, 'id' | 'timestamp'> = {
      orderItems: orderItems,
      tableId: Number(currentActiveTableId),
      total: total,
      receiptPreview: finalReceipt,
    };
    addBill(billPayload);
  
    updateTableStatus([currentActiveTableId], 'Cleaning');
    
    if (activeOrder) {
      updateOrder({ ...activeOrder, status: 'Completed' });
    }
  
    clearCurrentOrder(true);
  };

  const handlePrintProvisionalBill = async () => {
    if (!currentActiveTableId || orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot Print',
        description: 'Please select a table with an active order to print a bill.',
      });
      return;
    }
  
    setIsProcessing(true);
    const currentReceipt = await getReceipt(false); 
    setIsProcessing(false);
  
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Provisional Bill for Table #${currentActiveTableId}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${currentReceipt}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };


  const renderMenuItem = (item: MenuItem, subCategoryName: string, categoryName: string) => {
    const isNonVeg = subCategoryName.toLowerCase().includes('non-veg');
    const defaultColor = isNonVeg ? nonVegColor : vegColor;
    const categoryColor = categoryColors[categoryName];
    const itemColor = menuItemColors[item.name];
    
    const finalColor = itemColor || categoryColor || defaultColor;
    const isColorApplied = !!(itemColor || categoryColor);

    return (
      <Card
        key={item.name}
        className={cn(
          "group rounded-lg transition-all hover:scale-105 relative cursor-pointer",
          finalColor,
          isColorApplied && "border-black shadow-lg hover:shadow-xl"
        )}
        onClick={() => handleItemClick(item)}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-5 gap-1">
              {colorPalette.map((colorClass, i) => (
                <div
                  key={i}
                  className={cn("h-6 w-6 rounded-full cursor-pointer", colorClass)}
                  onClick={(e) => { e.stopPropagation(); setItemColor(item.name, colorClass); }}
                />
              ))}
              <Button variant="ghost" size="sm" className="col-span-5 h-8" onClick={(e) => { e.stopPropagation(); setItemColor(item.name, ''); }}>Reset</Button>
            </div>
          </PopoverContent>
        </Popover>
        <CardContent className="p-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', isNonVeg ? 'bg-red-500' : 'bg-green-500')}></span>
              <span className="font-semibold pr-2 text-black">{item.name}</span>
            </div>
            <span className="font-mono text-right whitespace-nowrap text-black">₹{item.price.toFixed(2)}</span>
          </div>
          {!isClickToAdd && (
            <div className="flex justify-end mt-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={(e) => { e.stopPropagation(); handleAddButtonClick(item); }}
              >
                Add to Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const CategoryColorPicker = ({ categoryName }: { categoryName: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => e.stopPropagation()}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-5 gap-1">
          {colorPalette.map((colorClass, i) => (
            <div
              key={i}
              className={cn("h-6 w-6 rounded-full cursor-pointer", colorClass)}
              onClick={() => setCategoryColor(categoryName, colorClass)}
            />
          ))}
           <Button variant="ghost" size="sm" className="col-span-5 h-8" onClick={() => setCategoryColor(categoryName, '')}>Reset</Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderMenuContent = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-6">
          {filteredMenu.map((category) => (
             <div key={category.category} className={cn("rounded-lg p-2", categoryColors[category.category])}>
               <div className={cn("sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10 flex items-center justify-center gap-2 p-2 rounded-md")}>
                <h2 className="text-xl font-bold text-center text-black">
                  {category.category}
                </h2>
                <CategoryColorPicker categoryName={category.category} />
              </div>

              <div className="space-y-4 pt-2">
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name, category.category))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (viewMode === 'grid') {
      return (
        <Tabs defaultValue={filteredMenu[0]?.category} className="w-full">
          <div className="flex justify-center">
            <TabsList className="mb-4 flex-wrap h-auto">
              {filteredMenu.map(category => (
                <TabsTrigger key={category.category} value={category.category} asChild>
                    <div className="relative p-2 rounded-sm cursor-pointer flex items-center gap-2">
                        <span className={cn('text-black')}>{category.category}</span>
                        <CategoryColorPicker categoryName={category.category} />
                        <div className={cn("absolute inset-0 -z-10 rounded-sm", categoryColors[category.category])}/>
                    </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {filteredMenu.map(category => (
             <TabsContent key={category.category} value={category.category} className="m-0">
               <div className={cn("rounded-lg p-2 space-y-4", categoryColors[category.category])}>
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name, category.category))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      );
    }
    // Accordion view is default
    return (
      <Accordion type="multiple" value={activeAccordionItems} onValueChange={setActiveAccordionItems} className="w-full">
        {filteredMenu.map((category) => (
          <AccordionItem key={category.category} value={category.category} className={cn("border-b-0 rounded-lg mb-2 overflow-hidden", categoryColors[category.category])}>
            <div className="flex items-center pr-4 hover:bg-muted/50 rounded-t-lg">
              <AccordionTrigger className='p-4 hover:no-underline flex-grow'>
                  <div className="text-xl font-bold text-black text-center flex-grow">{category.category}</div>
              </AccordionTrigger>
              <CategoryColorPicker categoryName={category.category} />
            </div>
            <AccordionContent className="p-2 pt-0">
              <div className="space-y-4 pt-2">
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name, category.category))}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };
  
  const allItemsOpen = activeAccordionItems.length === filteredMenu.length && filteredMenu.length > 0;
  
  const toggleAccordion = () => {
    if (allItemsOpen) {
      setActiveAccordionItems([]);
    } else {
      setActiveAccordionItems(filteredMenu.map(c => c.category));
    }
  };

  const renderOrderItems = () => {
    const originalItemsMap = new Map(originalOrderItems.map(item => [item.name, item.quantity]));
    
    const allItems = [...orderItems].sort((a, b) => {
        const aIsNew = !originalItemsMap.has(a.name) || (originalItemsMap.get(a.name)! < a.quantity);
        const bIsNew = !originalItemsMap.has(b.name) || (originalItemsMap.get(b.name)! < b.quantity);
        if (aIsNew && !bIsNew) return 1;
        if (!aIsNew && bIsNew) return -1;
        return 0;
    });

    const newItemsExist = allItems.some(item => {
        const originalQuantity = originalItemsMap.get(item.name) || 0;
        return !originalItemsMap.has(item.name) || originalQuantity < item.quantity;
    });

    const renderItemRow = (item: OrderItem) => {
        const originalQuantity = originalItemsMap.get(item.name) || 0;
        const isNew = !originalItemsMap.has(item.name);
        const isUpdated = originalQuantity > 0 && item.quantity > originalQuantity;
        const quantityChange = item.quantity - originalQuantity;
        
        const itemClass = isNew ? "bg-blue-50 dark:bg-blue-900/20" : isUpdated ? "bg-yellow-50 dark:bg-yellow-900/20" : "";
        const itemTag = isNew ? "(New)" : isUpdated ? `(+${quantityChange})` : "";
        const tagClass = isNew ? "text-blue-500" : isUpdated ? "text-yellow-600" : "";

        return (
            <div key={item.name} className={cn("flex items-center p-2 rounded-md", itemClass)}>
                <div className="flex-grow">
                    <p className="font-medium">{item.name} {itemTag && <span className={cn("text-xs", tagClass)}>{itemTag}</span>}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromOrder(item.name)}><X className="h-4 w-4" /></Button>
                </div>
            </div>
        );
    };

    return (
      <div className="space-y-3">
        {allItems.map(item => renderItemRow(item))}
        {newItemsExist && originalOrderItems.length > 0 && (
             <div className="relative py-2">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">New/Updated Items</span>
            </div>
        )}
      </div>
    );
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <Card className="col-span-1 lg:col-span-2 flex flex-col relative m-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
             <div className="flex-grow">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search menu items..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </div>
            <div className="flex items-center gap-4">
               <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center">
                  <RadioGroupItem value="accordion" id="accordion-view" className="sr-only" />
                  <Label htmlFor="accordion-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'accordion' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                    <List className="h-5 w-5 box-content" />
                  </Label>

                  <RadioGroupItem value="grid" id="grid-view" className="sr-only" />
                  <Label htmlFor="grid-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                    <LayoutGrid className="h-5 w-5 box-content" />
                  </Label>

                  <RadioGroupItem value="list" id="list-view" className="sr-only" />
                  <Label htmlFor="list-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                    <Rows className="h-5 w-5 box-content" />
                  </Label>
              </RadioGroup>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="outline" size="sm" onClick={handleShuffleColors}>
                <Shuffle className="mr-2 h-4 w-4" /> Shuffle Colors
              </Button>
               {viewMode === 'accordion' && (
                <Button variant="outline" size="sm" onClick={toggleAccordion}>
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  {allItemsOpen ? 'Collapse' : 'Expand'}
                </Button>
              )}
              <div className="flex items-center space-x-2">
                <Switch id="click-to-add-mode" checked={isClickToAdd} onCheckedChange={setIsClickToAdd} />
                <Label htmlFor="click-to-add-mode">Click-to-Add</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow px-4">
            {renderMenuContent()}
        </ScrollArea>
      </Card>

      <Card className="col-span-1 flex flex-col m-4 ml-0">
        <div className="p-4 border-b">
          <CardTitle>{activeOrder ? `Editing Order #${activeOrder.id}` : 'Current Order'}</CardTitle>
          <CardDescription>
            {currentActiveTableId ? `Table ${currentActiveTableId}` : "No Table Selected"}
          </CardDescription>
        </div>
        
        <ScrollArea className="flex-grow p-4">
          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ClipboardList className="w-16 h-16 text-gray-300" />
              <p className="mt-4 text-sm font-medium">
                Add items to the order
              </p>
            </div>
          ) : (
            activeOrder ? renderOrderItems() : (
                <div className="space-y-3">
                {orderItems.map(item => (
                    <div key={item.name} className="flex items-center">
                    <div className="flex-grow">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromOrder(item.name)}><X className="h-4 w-4" /></Button>
                    </div>
                    </div>
                ))}
                </div>
            )
          )}
        </ScrollArea>
        
        <div className="p-4 border-t space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
                <Label className="font-semibold block">Select Table</Label>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-5 gap-1.5">
                  {tables.map(table => (
                      <Button
                          key={table.id}
                          variant="outline"
                          className={cn(
                            "h-auto py-2 flex-col justify-center items-center relative p-0 border-2 transition-transform duration-150 active:scale-95",
                            statusColors[table.status],
                            currentActiveTableId === table.id && 'ring-4 ring-offset-2 ring-ring',
                            table.status === 'Available' || table.status === 'Occupied' ? 'text-white border-black' : 'text-black border-black/50',
                          )}
                          onClick={() => handleSelectTable(table.id)}
                      >
                        {(showOccupancy && occupancyCount[table.id] > 0) &&
                            <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 text-white text-xs font-bold p-1 rounded-md">
                                <Repeat className="h-3 w-3" />
                                <span>{occupancyCount[table.id]}</span>
                            </div>
                        }
                          <div className="absolute top-1 left-1">
                            {React.createElement(statusIcons[table.status], { className: "h-3 w-3" })}
                          </div>
                          <span className="text-6xl font-bold leading-none">{table.id}</span>
                          <span className="text-[0.6rem] font-semibold -mt-1">{table.status}</span>
                      </Button>
                  ))}
              </div>
          </CardContent>

          <div>
            <Label className="font-semibold mb-2 block">Discount</Label>
            <RadioGroup value={discount.toString()} onValueChange={(val) => setDiscount(Number(val))} className="flex items-center flex-wrap gap-2">
              {[0, 5, 10, 15, 20].map(d => (
                <div key={d} className="flex items-center space-x-2">
                  <RadioGroupItem value={d.toString()} id={`d-${d}`} />
                  <Label htmlFor={`d-${d}`} className="p-2 rounded-md transition-colors hover:bg-accent cursor-pointer" >{d}%</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 text-lg">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold">Rs. {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-accent-foreground">
                <span>Discount ({discount}%):</span>
                <span className="font-bold">-Rs. {(subtotal - total).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-2xl border-t pt-2">
              <span>Total:</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
              <Button 
                  size="lg"
                  className={cn(activeOrder && "bg-blue-600 hover:bg-blue-700")}
                  onClick={handleSendToKitchen}
                  disabled={isProcessing || orderItems.length === 0 || !currentActiveTableId}
              >
                  {activeOrder ? <Printer className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {activeOrder ? 'Update KOT' : 'Send KOT to Kitchen'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                  <Button size="lg" variant="outline" onClick={handlePrintProvisionalBill} disabled={isProcessing ||!currentActiveTableId || orderItems.length === 0}>
                      <Printer className="mr-2 h-4 w-4" /> Print Bill
                  </Button>
                  <Button size="lg" onClick={handleProcessPayment} disabled={isProcessing || orderItems.length === 0 || !currentActiveTableId}>
                      Process Payment
                  </Button>
              </div>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button size="lg" variant="destructive" disabled={orderItems.length === 0}>
                          <X className="mr-2 h-4 w-4" /> Clear Order
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This will clear all items from the current order. This action cannot be undone.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => clearCurrentOrder(false)}>Clear</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>
      </Card>

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        total={total}
        receiptPreview={receiptPreview}
        onPaymentSuccess={handlePaymentSuccess}
      />
       <AddItemDialog
        isOpen={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        item={selectedItem}
        onConfirm={addToOrder}
      />
    </div>
  );
}
