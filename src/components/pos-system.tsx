
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Search, Plus, Minus, X, Save, FilePlus, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, ChevronDown, CheckCircle2, Users, Bookmark, Sparkles, Repeat, Printer, Edit, SparklesIcon, UserCheck, BookmarkX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddItemDialog } from './add-item-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order, Bill, TableStatus } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendEmailReceipt, SendEmailReceiptInput } from '@/ai/flows/send-email-receipt';

const vegColor = 'bg-green-100 dark:bg-green-900/30';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30';

const colorPalette = [
    'bg-sky-200 dark:bg-sky-800/70',
    'bg-amber-200 dark:bg-amber-800/70',
    'bg-pink-200 dark:bg-pink-800/70',
    'bg-lime-200 dark:bg-lime-800/70',
    'bg-purple-200 dark:bg-purple-800/70',
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
  addOrder: (order: Omit<Order, 'id' | 'status'>) => void;
  updateOrder: (order: Order) => void;
  addBill: (bill: Omit<Bill, 'id' | 'timestamp'>) => void;
  updateTableStatus: (tableIds: number[], status: TableStatus) => void;
  occupancyCount: Record<number, number>;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
}

export default function PosSystem({ tables, orders, addOrder, updateOrder, addBill, updateTableStatus, occupancyCount, activeOrder, setActiveOrder }: PosSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isClickToAdd, setIsClickToAdd] = useState(true);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');
  const [menuItemColors, setMenuItemColors] = useState<Record<string, string>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

  const typedMenuData: MenuCategory[] = menuData;

  const currentActiveTableId = useMemo(() => {
    if (activeOrder) return activeOrder.tableId;
    return selectedTableId;
  }, [activeOrder, selectedTableId]);

  useEffect(() => {
    const savedState = localStorage.getItem('isClickToAdd');
    if (savedState !== null) {
      setIsClickToAdd(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isClickToAdd', JSON.stringify(isClickToAdd));
  }, [isClickToAdd]);

  useEffect(() => {
    if (activeOrder) {
      setSelectedTableId(activeOrder.tableId);
      setOrderItems(activeOrder.items);
    } else {
      // Don't clear if there are items, user might be building a new order
      if (orderItems.length === 0) {
        setSelectedTableId(null);
      }
    }
  }, [activeOrder, orderItems.length]);


  const handleSelectTable = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'Available') {
      clearOrder(false, true); // Clear everything for a new order
      setSelectedTableId(tableId);
      updateTableStatus([tableId], 'Occupied');
      toast({ title: `Table ${tableId} is now Occupied`, description: 'Add items to the order.' });
    } else if (table.status === 'Occupied') {
        const existingOrder = orders.find(o => o.tableId === tableId && o.status !== 'Completed');
        if (existingOrder) {
            setActiveOrder(existingOrder);
            setIsTablePopoverOpen(false); // Close popover after selection
        } else {
             toast({
                variant: 'destructive',
                title: 'Order Not Found',
                description: `Could not find an active order for Table ${tableId}.`,
            });
        }
    }
    // For other statuses, just select the table to show actions
    else {
        setSelectedTableId(tableId);
    }
  };
  
  const handleDoubleClickTable = (table: Table) => {
    if (table.status === 'Occupied') {
        updateTableStatus([table.id], 'Cleaning');
        toast({ title: 'Customer Left', description: `Table ${table.id} is now marked for cleaning.` });
        if (activeOrder && activeOrder.tableId === table.id) {
            // Clear the active order from the panel since the customer has left.
            clearOrder(true);
        }
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

  useEffect(() => {
    if (viewMode === 'accordion') {
      setActiveAccordionItems(filteredMenu.map(c => c.category));
    }
  }, [filteredMenu, viewMode]);

  const subtotal = useMemo(() => orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [orderItems]);
  const total = useMemo(() => subtotal * (1 - discount / 100), [subtotal, discount]);

  const updateReceipt = useCallback(async () => {
    if (orderItems.length === 0) {
      setReceiptPreview('');
      return;
    }
    const input: GenerateReceiptInput = {
      items: orderItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
      discount,
      subtotal,
      total,
    };
    try {
      const result = await generateReceipt(input);
      setReceiptPreview(result.receiptPreview);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate receipt preview.",
      });
    }
  }, [orderItems, discount, subtotal, total, toast]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      updateReceipt();
    }, 500); // Debounce API calls
  
    return () => {
      clearTimeout(handler);
    };
  }, [updateReceipt]);

  const addToOrder = (item: MenuItem, quantity: number) => {
    const existingItem = orderItems.find(orderItem => orderItem.name === item.name);
    if (existingItem) {
      updateQuantity(item.name, existingItem.quantity + quantity);
    } else {
      setOrderItems([...orderItems, { ...item, quantity }]);
    }
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
  
  const clearOrder = (delayTableClear = false, forceClear = false) => {
    if (forceClear) {
      setOrderItems([]);
      setDiscount(0);
      setActiveOrder(null);
      setSelectedTableId(null);
      toast({ title: "New Bill", description: "Current order cleared." });
      return;
    }

    setOrderItems([]);
    setDiscount(0);
    setActiveOrder(null);
    if (delayTableClear) {
      setTimeout(() => {
        setSelectedTableId(null);
        toast({ title: "New Bill Ready", description: "Select a table to start a new order." });
      }, 2000);
    } else {
      setSelectedTableId(null);
      toast({ title: "New Bill", description: "Current order cleared." });
    }
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
      // This is an update to an existing order
      updateOrder({
        ...activeOrder,
        items: orderItems,
      });
      toast({ title: 'Order Updated!', description: `KOT updated for Table ${currentActiveTableId}.` });

    } else {
      // This is a new order
      const orderPayload = {
        items: orderItems,
        tableId: Number(currentActiveTableId),
      };
      addOrder(orderPayload);
      toast({ title: 'Order Sent!', description: `KOT sent to the kitchen for Table ${currentActiveTableId}.` });
    }
  };

  const handleProcessPayment = () => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Order", description: "Cannot process payment for an empty order." });
      return;
    }
    if (!currentActiveTableId) {
      toast({ variant: 'destructive', title: 'No Table Selected', description: 'Please select a table before processing payment.' });
      return;
    }
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentSuccess = async () => {
    if (!currentActiveTableId) return;

    setIsPaymentDialogOpen(false);
    toast({ title: "Payment Successful", description: `Payment of Rs.${total.toFixed(2)} confirmed.` });
    
    const billPayload: Omit<Bill, 'id' | 'timestamp'> = {
      orderItems: orderItems,
      tableId: Number(currentActiveTableId),
      total: total,
      receiptPreview: receiptPreview,
    };
    addBill(billPayload);

    // Update table status to 'Cleaning'
    updateTableStatus([currentActiveTableId], 'Cleaning');
    
    // Mark the order as completed
    if (activeOrder) {
      updateOrder({ ...activeOrder, status: 'Completed' });
    }


    const adminEmailInput: SendEmailReceiptInput = {
      customerEmail: 'upandabove.bir@gmail.com',
      receiptContent: receiptPreview,
      totalAmount: total,
    };

    try {
      const result = await sendEmailReceipt(adminEmailInput);
      if (result.success) {
        toast({
          title: "Admin Receipt Sent",
          description: "A copy of the receipt has been sent to the admin.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
      console.error('Failed to send admin receipt:', e);
      toast({
        variant: "destructive",
        title: "Admin Email Failed",
        description: "Could not send the admin receipt.",
      });
    }

    clearOrder(true);
  };

  const handlePrintProvisionalBill = () => {
    if (!currentActiveTableId || orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot Print',
        description: 'Please select a table with an active order to print a bill.',
      });
      return;
    }

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
            <pre>${receiptPreview}</pre>
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
          "group rounded-lg cursor-pointer transition-all hover:scale-105 relative",
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
                  onClick={() => setItemColor(item.name, colorClass)}
                />
              ))}
              <Button variant="ghost" size="sm" className="col-span-5 h-8" onClick={() => setItemColor(item.name, '')}>Reset</Button>
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
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleAddButtonClick(item); }}>Add to Order</Button>
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
                <h2 className="text-xl font-bold text-center">
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
            <TabsList className="mb-4">
              {filteredMenu.map(category => (
                <TabsTrigger key={category.category} value={category.category} asChild>
                    <div className="relative p-2 rounded-sm cursor-pointer flex items-center gap-2">
                        <span className={cn(categoryColors[category.category] && 'text-black')}>{category.category}</span>
                        <CategoryColorPicker categoryName={category.category} />
                        <div className={cn("absolute inset-0 -z-10 rounded-sm", categoryColors[category.category])}/>
                    </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {filteredMenu.map(category => (
             <TabsContent key={category.category} value={category.category}>
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
            <div className="flex items-center p-4 hover:bg-muted/50 rounded-t-lg relative">
                 <div className="text-xl font-bold text-black text-center flex-grow">{category.category}</div>
                 <div className='flex items-center gap-2'>
                    <CategoryColorPicker categoryName={category.category} />
                    <AccordionTrigger>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </AccordionTrigger>
                 </div>
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

  const selectedTable = tables.find(t => t.id === selectedTableId);
  
  const renderTableActions = () => {
    if (!selectedTable) return null;

    const orderForTable = orders.find(o => o.tableId === selectedTable.id && o.status !== 'Completed');

    switch (selectedTable.status) {
      case 'Available':
        return (
          <Button onClick={() => {
            handleSelectTable(selectedTable.id)
          }}>
            <Users className="mr-2 h-4 w-4" />Create New Order
          </Button>
        );
      case 'Occupied':
        return (
          <div className="flex gap-2">
            <Button onClick={() => {
                if (orderForTable) {
                    setActiveOrder(orderForTable);
                    setIsTablePopoverOpen(false);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Order not found',
                        description: 'No active order for this table.'
                    });
                }
            }}>
              <Edit className="mr-2 h-4 w-4" />Update Order
            </Button>
            <Button variant="outline" onClick={handlePrintProvisionalBill} disabled={!orderForTable}><Printer className="mr-2 h-4 w-4" /> Print Provisional Bill</Button>
            <Button variant="destructive" onClick={() => updateTableStatus([selectedTable.id], 'Cleaning')}><SparklesIcon className="mr-2 h-4 w-4" />Mark as Cleaning</Button>
          </div>
        );
      case 'Reserved':
        return (
          <div className="flex gap-2">
            <Button onClick={() => updateTableStatus([selectedTable.id], 'Occupied')}><UserCheck className="mr-2 h-4 w-4" /> Seat Guests</Button>
            <Button variant="outline" onClick={() => updateTableStatus([selectedTable.id], 'Available')}><BookmarkX className="mr-2 h-4 w-4" /> Cancel Reservation</Button>
          </div>
        );
      case 'Cleaning':
        return <Button onClick={() => updateTableStatus([selectedTable.id], 'Available')}><CheckCircle2 className="mr-2 h-4 w-4" />Mark as Available</Button>;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] gap-4 p-4">
      {/* Left Panel: Menu */}
      <Card className="flex-[3] flex flex-col">
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

      {/* Right Panel: Order Summary */}
      <Card className="flex-[1] flex flex-col h-full">
        <CardHeader>
          <CardTitle>{activeOrder ? `Editing Order #${activeOrder.id}` : 'Current Order'}</CardTitle>
          <div className="pt-2">
            <Label>Select Table</Label>
            <Popover open={isTablePopoverOpen} onOpenChange={setIsTablePopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {currentActiveTableId ? `Table ${currentActiveTableId}` : "Select a table..."}
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                    <div className="grid grid-cols-5 gap-2">
                        {tables.map(table => (
                            <Button
                                key={table.id}
                                variant="outline"
                                className={cn(
                                    "flex flex-col h-20 w-20 justify-center items-center gap-1 relative",
                                    statusColors[table.status],
                                    selectedTableId === table.id && 'ring-2 ring-offset-2 ring-ring',
                                    table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black'
                                )}
                                onClick={() => handleSelectTable(table.id)}
                                onDoubleClick={() => handleDoubleClickTable(table)}
                            >
                                {(occupancyCount[table.id] > 0) &&
                                <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/50 text-white text-xs font-bold p-1 rounded-md">
                                    <Repeat className="h-3 w-3" />
                                    <span>{occupancyCount[table.id]}</span>
                                </div>
                                }
                                <span className="text-2xl font-bold">{table.id}</span>
                                <div className="flex items-center gap-1 text-xs">
                                    {React.createElement(statusIcons[table.status], { className: "h-3 w-3" })}
                                    <span>{table.status}</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                    {selectedTable && (
                      <div className="mt-4 p-2 border-t">
                          <h4 className="font-semibold mb-2">Actions for Table {selectedTable.id}</h4>
                          <div className="flex flex-wrap gap-2">
                           {renderTableActions()}
                          </div>
                      </div>
                    )}
                </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow p-4 pt-0">
          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ClipboardList className="w-16 h-16 text-gray-300" />
              <p className="mt-4 text-sm font-medium">Add items to get started</p>
            </div>
          ) : (
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
          )}
        </ScrollArea>
        <div className="mt-auto p-4 space-y-4">
            <Separator />
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
            <Card className="bg-muted/50">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Receipt Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words min-h-[100px] bg-background p-2 rounded-md">
                  {receiptPreview || 'Add items to see preview...'}
                </pre>
              </CardContent>
            </Card>
            <div className="space-y-2 text-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">Rs.{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-accent-foreground">
                  <span>Discount ({discount}%):</span>
                  <span className="font-bold">-Rs.{(subtotal - total).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-2xl border-t pt-2">
                <span>Total:</span>
                <span>Rs.{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
                <Button size="lg" variant="secondary" className="w-full" onClick={handleSendToKitchen}>
                    {activeOrder ? <Edit className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                    {activeOrder ? 'Update KOT' : 'Send KOT to Kitchen'}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline" onClick={handlePrintProvisionalBill}>
                        <Printer className="mr-2 h-4 w-4" /> Print Bill
                    </Button>
                    <Button size="lg" onClick={handleProcessPayment}>
                        Process Payment
                    </Button>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="lg" variant="destructive" className="w-full"><FilePlus />New Bill</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Create a New Bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will clear the current order. Make sure to save it if needed.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => clearOrder(false, true)}>Continue</AlertDialogAction>
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
