

"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { addDoc, collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
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
import { Search, Plus, Minus, X, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, CheckCircle2, Users, Bookmark, Sparkles, Repeat, Edit, UserCheck, BookmarkX, Printer, Loader2, BookOpen, Trash2 as TrashIcon, QrCode as QrCodeIcon, MousePointerClick, Eye, Hand, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrag, useDrop } from 'react-dnd';
import { AddItemDialog } from './add-item-dialog';
import { ManageMenuDialog } from './manage-menu-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order, Bill, TableStatus } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const vegColor = 'bg-green-100 dark:bg-green-900/30';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30';

const colorPalette: Record<string, {light: string, dark: string}> = {
    amber: { light: 'bg-amber-100 dark:bg-amber-900/40', dark: 'bg-amber-200 dark:bg-amber-800/70' },
    lime: { light: 'bg-lime-100 dark:bg-lime-900/40', dark: 'bg-lime-200 dark:bg-lime-800/70' },
    purple: { light: 'bg-purple-100 dark:bg-purple-900/40', dark: 'bg-purple-200 dark:bg-purple-800/70' },
    teal: { light: 'bg-teal-100 dark:bg-teal-900/40', dark: 'bg-teal-200 dark:bg-teal-800/70' },
    orange: { light: 'bg-orange-100 dark:bg-orange-900/40', dark: 'bg-orange-200 dark:bg-orange-800/70' },
    cyan: { light: 'bg-cyan-100 dark:bg-cyan-900/40', dark: 'bg-cyan-200 dark:bg-cyan-800/70' },
};
const colorNames = Object.keys(colorPalette);

const itemStatusColors: Record<string, { light: string, dark: string, name: string }> = {
    low: { light: 'bg-yellow-200 dark:bg-yellow-900/40', dark: 'bg-yellow-300 dark:bg-yellow-800/70', name: 'Running Low' },
    out: { light: 'bg-red-500 text-white dark:bg-red-700/70', dark: 'bg-red-600 dark:bg-red-700/70', name: 'Out of Stock' },
};
const itemStatusNames = Object.keys(itemStatusColors);


type ViewMode = 'accordion' | 'grid' | 'list';
type VegFilter = 'All' | 'Veg' | 'Non-Veg';

const statusBaseColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-amber-300 hover:bg-amber-400',
};

const getDynamicColor = (status: TableStatus) => {
  return statusBaseColors[status];
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
  pendingOrders: Record<number, OrderItem[]>;
  setPendingOrders: React.Dispatch<React.SetStateAction<Record<number, OrderItem[]>>>;
  categoryColors: Record<string, string>;
  setCategoryColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onViewTableDetails: (tableId: number) => void;
  onEditOrder: (tableId: number) => void;
}

const ItemTypes = {
  MENU_ITEM: 'menuItem',
};

function DraggableMenuItem({ item, children, canDrag }: { item: MenuItem; children: React.ReactNode; canDrag: boolean }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.MENU_ITEM,
        item: { ...item },
        canDrag: canDrag,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [item, canDrag]);

    return (
        <div
            ref={drag}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            className={cn(canDrag && "cursor-move")}
        >
            {children}
        </div>
    );
}

const TableDropTarget = ({ table, occupancyCount, handleSelectTable, children, onDropItem }: { table: Table; occupancyCount: Record<number,number>, handleSelectTable: (id: number) => void, children: React.ReactNode; onDropItem: (tableId: number, item: MenuItem) => void; }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.MENU_ITEM,
        drop: (item: MenuItem) => onDropItem(table.id, item),
        canDrop: () => table.status === 'Available' || table.status === 'Occupied',
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));

    const isActive = isOver && canDrop;

    return (
        <div
            ref={drop}
            className={cn(
                "aspect-square flex-col justify-center items-center relative p-1 border-2 transition-transform duration-150 active:scale-95 group flex rounded-md cursor-pointer hover:scale-110 hover:z-10",
                getDynamicColor(table.status),
                isActive && 'ring-4 ring-offset-2 ring-green-500',
                table.status === 'Available' || table.status === 'Occupied' ? 'text-white border-black' : 'text-black border-black/50',
                "border-black/50"
            )}
            onClick={() => handleSelectTable(table.id)}
        >
            {children}
        </div>
    );
}

function OrderPanel({
    orderItems,
    originalOrderItems,
    handleDropOnOrder,
    updateQuantity,
    removeFromOrder,
    activeOrder,
    currentActiveTableId,
    clearCurrentOrder,
    handleQuickAssign,
    subtotal,
    total,
    discount,
    setDiscount,
    isProcessing,
    handleSendToKitchen,
    handlePrintProvisionalBill,
    handleProcessPayment,
    receiptPreview,
    children,
}: {
    orderItems: OrderItem[];
    originalOrderItems: OrderItem[];
    handleDropOnOrder: (item: MenuItem) => void;
    updateQuantity: (name: string, quantity: number) => void;
    removeFromOrder: (name: string) => void;
    activeOrder: Order | null;
    currentActiveTableId: number | null;
    clearCurrentOrder: (fullReset?: boolean) => void;
    handleQuickAssign: () => void;
    subtotal: number;
    total: number;
    discount: number;
    setDiscount: (discount: number) => void;
    isProcessing: boolean;
    handleSendToKitchen: () => void;
    handlePrintProvisionalBill: () => Promise<void>;
    handleProcessPayment: () => Promise<void>;
    receiptPreview: string;
    children: React.ReactNode;
}) {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.MENU_ITEM,
        drop: (item: MenuItem) => handleDropOnOrder(item),
        canDrop: () => true, // Always allow dropping on the order panel itself
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));
    
    const isTakeawayMode = currentActiveTableId === null;
    const showQuickAssign = orderItems.length > 0 && isTakeawayMode;
    const orderTitle = isTakeawayMode ? "Takeaway" : `Table ${currentActiveTableId}`;

    const renderOrderItems = () => {
        const originalItemsMap = new Map(originalOrderItems.map(item => [item.name, item.quantity]));

        const oldItems = orderItems.filter(item => {
            const originalQuantity = originalItemsMap.get(item.name) || 0;
            return originalQuantity >= item.quantity;
        });

        const newItems = orderItems.filter(item => {
            const originalQuantity = originalItemsMap.get(item.name) || 0;
            return originalQuantity < item.quantity;
        });
        
        const newItemsExist = newItems.length > 0;

        const renderItemRow = (item: OrderItem, isNewOrUpdated: boolean) => {
            const originalQuantity = originalItemsMap.get(item.name) || 0;
            const isNew = !originalItemsMap.has(item.name);
            const quantityChange = item.quantity - originalQuantity;
            
            const itemClass = isNewOrUpdated
                ? (isNew ? "bg-blue-50 dark:bg-blue-900/20" : "bg-yellow-50 dark:bg-yellow-900/20")
                : "";
            const itemTag = isNewOrUpdated
                ? (isNew ? "(New)" : `(+${quantityChange})`)
                : "";
            const tagClass = isNew ? "text-blue-500" : "text-yellow-600";

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
            {oldItems.map(item => renderItemRow(item, false))}
            
            {newItemsExist && originalOrderItems.length > 0 && (
                 <div className="relative my-3">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">New/Updated Items</span>
                </div>
            )}

            {newItems.map(item => renderItemRow(item, true))}
          </div>
        );
    };

    return (
        <Card ref={drop} className={cn("flex flex-col flex-grow transition-colors", isOver && canDrop && 'bg-primary/20')}>
            <div className="p-4 border-b flex justify-between items-center">
                <div>
                    <CardTitle>{activeOrder ? `Editing Order #${activeOrder.id}` : 'Current Order'}</CardTitle>
                    <CardDescription>
                        {orderTitle}
                    </CardDescription>
                </div>
                {orderItems.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Clear All
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove all items from the current order. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => clearCurrentOrder(false)}>Clear All</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          
            <ScrollArea className="flex-grow p-4">
                {orderItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <ClipboardList className="w-16 h-16 text-gray-300" />
                        <p className="mt-4 text-sm font-medium text-center">
                            Click on items to add them or drag & drop here.
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
            
            <div className="p-4 border-t">
              {children}
            </div>
          
            <div className="p-4 border-t space-y-4 bg-muted/30">
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
                            <span className="font-bold">-₹{(subtotal - total).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-2xl border-t pt-2 mt-2 bg-primary/20 p-2 rounded-md">
                        <span>Total:</span>
                        <span>Rs. {total.toFixed(2)}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                    {showQuickAssign && (
                        <Button 
                            size="lg"
                            className="h-12 text-base bg-amber-500 hover:bg-amber-600"
                            onClick={handleQuickAssign}
                        >
                            <Hand className="mr-2 h-4 w-4" />
                            Quick Assign to Table
                        </Button>
                    )}
                    <Button 
                        size="lg"
                        className={cn("h-12 text-base", activeOrder && "bg-blue-600 hover:bg-blue-700")}
                        onClick={handleSendToKitchen}
                        disabled={isProcessing || (orderItems.length === 0) || (!activeOrder && currentActiveTableId === null)}
                    >
                        {isProcessing && (activeOrder ? 'Updating KOT...' : 'Sending KOT...').includes('Sending') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (activeOrder ? <Printer className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
                        {activeOrder ? 'Update KOT' : 'Send KOT to Kitchen'}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button size="lg" variant="outline" className="h-12 text-base" onClick={handlePrintProvisionalBill} disabled={orderItems.length === 0}>
                            {isProcessing && receiptPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                            Print Bill
                        </Button>
                        <Button size="lg" className="h-12 text-base" onClick={handleProcessPayment} disabled={isProcessing || orderItems.length === 0}>
                            {isProcessing && !receiptPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Process Payment
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
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
    pendingOrders,
    setPendingOrders,
    categoryColors,
    setCategoryColors,
    onViewTableDetails,
    onEditOrder,
}: PosSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [itemCodeInput, setItemCodeInput] = useState('');
  const [menu, setMenu] = useState<MenuCategory[]>(menuData as MenuCategory[]);
  const [originalOrderItems, setOriginalOrderItems] = useState<OrderItem[]>([]);
  const [easyMode, setEasyMode] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState('');
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');
  const [menuItemStatus, setMenuItemStatus] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [reservationDetails, setReservationDetails] = useState({ name: '', time: '' });
  const [tableToReserve, setTableToReserve] = useState<number | null>(null);
  const [vegFilter, setVegFilter] = useState<VegFilter>('All');
  const [isQuickAssignDialogOpen, setIsQuickAssignDialogOpen] = useState(false);


  const typedMenuData: MenuCategory[] = menu;

  const currentActiveTableId = useMemo(() => {
    return selectedTableId;
  }, [selectedTableId]);
  
  const allMenuItems: MenuItem[] = useMemo(() => 
    typedMenuData.flatMap(cat => cat.subCategories.flatMap(sub => sub.items)),
    [typedMenuData]
  );
  
  useEffect(() => {
    const defaultCategoryColors: Record<string, string> = {};
    if (Object.keys(categoryColors).length === 0) {
        typedMenuData.forEach((category, index) => {
            defaultCategoryColors[category.category] = colorNames[index % colorNames.length];
        });
        setCategoryColors(defaultCategoryColors);
    }
  }, [typedMenuData, categoryColors, setCategoryColors]);

  useEffect(() => {
    if (typedMenuData.length > 0 && viewMode === 'accordion') {
        setActiveAccordionItems([typedMenuData[0].category]);
    } else {
        setActiveAccordionItems([]);
    }
  }, [viewMode, typedMenuData]);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('easyMode');
      if (savedMode) {
        setEasyMode(JSON.parse(savedMode));
      }
    } catch (e) {
      console.error("Could not parse 'easyMode' from localStorage", e);
      setEasyMode(false);
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('easyMode', JSON.stringify(easyMode));
    } catch (e) {
      console.error("Could not save 'easyMode' to localStorage", e);
    }
  }, [easyMode]);
  
  const getLocalReceipt = useCallback(() => {
    if (orderItems.length === 0) return '';
  
    const pad = (str: string, len: number, char = ' ') => str.padEnd(len, char);
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal * (1 - discount / 100);
    const money = (val: number) => `₹${val.toFixed(2)}`;
  
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
  
    receiptLines.push(`${pad('Total:', 25)} ${`Rs. ${total.toFixed(2)}`.padStart(10)}`);
    receiptLines.push('');
    receiptLines.push('   Thank you for dining!   ');
    receiptLines.push('*************************');
  
    return receiptLines.join('\n');
  }, [orderItems, discount]);
  
  const generateAIRecipt = useCallback(async () => {
    if (orderItems.length === 0) {
        setReceiptPreview('');
        return;
    }
    const localReceipt = getLocalReceipt();
    setReceiptPreview(localReceipt); // Set local receipt immediately

    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal * (1 - discount / 100);

    const input: GenerateReceiptInput = {
        items: orderItems.map(({ name, price, quantity }) => ({ name, price, quantity })),
        discount,
        subtotal,
        total,
    };
    try {
        const result = await generateReceipt(input);
        if (result.receiptPreview) {
            setReceiptPreview(result.receiptPreview);
        }
    } catch (error) {
        console.error('AI receipt generation failed, using local version:', error);
        toast({
            variant: "default",
            title: "AI Assistant Offline",
            description: "Displaying standard receipt format.",
        });
    }
  }, [orderItems, discount, getLocalReceipt, toast]);


  useEffect(() => {
    if (orderItems.length > 0) {
        const localReceipt = getLocalReceipt();
        setReceiptPreview(localReceipt);
    } else {
        setReceiptPreview('');
    }
  }, [orderItems, discount, getLocalReceipt]);

  useEffect(() => {
    if (activeOrder) {
      setOriginalOrderItems([...activeOrder.items]);
    } else {
      setOriginalOrderItems([]);
    }
  }, [activeOrder]);

  const handleSelectTable = (tableId: number | null) => {
    setSelectedTableId(tableId);
  };
  
  const setItemStatus = (itemName: string, status: string) => {
    setMenuItemStatus(prev => ({ ...prev, [itemName]: status }));
  };
  
  const handleSetCategoryColor = (categoryName: string, colorName:string) => {
    setCategoryColors(prev => ({ ...prev, [categoryName]: colorName }));
  };

  const handleShuffleColors = () => {
    const shuffledPalette = [...colorNames].sort(() => 0.5 - Math.random());
    const newCategoryColors: Record<string, string> = {};
    typedMenuData.forEach((category, index) => {
      newCategoryColors[category.category] = shuffledPalette[index % shuffledPalette.length];
    });
    setCategoryColors(newCategoryColors);
    toast({ title: "Colors Shuffled!", description: "New random colors have been applied to the categories." });
  };

  const filteredMenu = useMemo(() => {
    let menuToFilter = typedMenuData;

    // Search filter
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        menuToFilter = menuToFilter.map(category => ({
            ...category,
            subCategories: category.subCategories.map(subCategory => ({
                ...subCategory,
                items: subCategory.items.filter(item => item.name.toLowerCase().includes(lowercasedTerm))
            })).filter(subCategory => subCategory.items.length > 0)
        })).filter(category => category.subCategories.length > 0);
    }

    // Veg/Non-Veg filter
    if (vegFilter !== 'All') {
        menuToFilter = menuToFilter.map(category => ({
            ...category,
            subCategories: category.subCategories.filter(subCategory => subCategory.name === vegFilter)
        })).filter(category => category.subCategories.length > 0);
    }

    return menuToFilter;
}, [searchTerm, vegFilter, typedMenuData]);

  const subtotal = useMemo(() => orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [orderItems]);
  const total = useMemo(() => subtotal * (1 - discount / 100), [subtotal, discount]);
  
  const addToOrder = useCallback((item: MenuItem, quantity: number) => {
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
  }, [setOrderItems]);

  const handleItemClick = (item: MenuItem) => {
    if (easyMode) {
      addToOrder(item, 1);
    }
  };
  
  const handleDropOnOrder = (item: MenuItem) => {
    if (easyMode) {
      addToOrder(item, 1);
      toast({
          title: "Item Added",
          description: `1 x ${item.name} added to the current order.`
      });
    }
  }

  const handleAddButtonClick = (item: MenuItem) => {
    if (!easyMode) {
      setSelectedItem(item);
      setIsAddItemDialogOpen(true);
    }
  };
  
  const handleCodeEntry = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = itemCodeInput.trim().toUpperCase();
      if (!code) return;
      
      const item = allMenuItems.find(i => i.code === code);
      if (item) {
        addToOrder(item, 1);
        toast({
            title: "Item Added",
            description: `1 x ${item.name} added to the order.`,
        });
        setItemCodeInput('');
      } else {
        toast({
            variant: "destructive",
            title: "Invalid Code",
            description: `No item found with code "${code}".`,
        });
      }
    }
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
    const itemsToPrint = diffItems || order.items;
    if (itemsToPrint.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
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
            <h2>${isUpdate ? 'KOT UPDATE' : 'KOT'} - ${order.tableId === 0 ? 'Takeaway' : `Table ${order.tableId}`}</h2>
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
    const isTakeaway = currentActiveTableId === null;

    setIsProcessing(true);
    // Use a short timeout to allow the UI to update with the loading state
    setTimeout(() => {
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
              toast({ title: 'Order Updated!', description: `KOT update sent for ${isTakeaway ? 'Takeaway' : `Table ${currentActiveTableId}`}.` });
              setOriginalOrderItems([...orderItems]);
          } else {
              toast({ title: 'No Changes', description: 'No new items were added to the order.' });
          }

        } else {
          const tableIdForOrder = isTakeaway ? 0 : currentActiveTableId!; // 0 for takeaway
          const orderPayload = {
              items: orderItems,
              tableId: tableIdForOrder,
          };
          addOrder(orderPayload);
          if (!isTakeaway) {
              updateTableStatus([currentActiveTableId!], 'Occupied');
          }
        }
        setIsProcessing(false);
    }, 50);
  };
  
    const handleDropItemOnTable = (tableId: number, item: MenuItem) => {
      if (!easyMode) return;
      const table = tables.find(t => t.id === tableId);
      if (!table || (table.status !== 'Available' && table.status !== 'Occupied')) {
        toast({
          variant: 'destructive',
          title: 'Table Not Available',
          description: `Cannot add items to a ${table?.status} table.`
        });
        return;
      }
      
      // If a different table is selected, switch to the new table
      if (selectedTableId !== tableId) {
        handleSelectTable(tableId);
        // Add item to the order (for the now-selected table)
        // A small delay to allow state to update from handleSelectTable
        setTimeout(() => {
          addToOrder(item, 1);
          toast({
            title: 'Item Added',
            description: `1 x ${item.name} added to order for Table ${tableId}.`
          });
        }, 50)
      } else {
        addToOrder(item, 1);
        toast({
          title: 'Item Added',
          description: `1 x ${item.name} added to order for Table ${tableId}.`
        });
      }
    };


  const addBill = async (bill: Omit<Bill, 'id'>) => {
    try {
      const billsCollection = collection(db, "bills");
      const billDocs = await getDocs(billsCollection);
      const newBillId = (billDocs.size + 1).toString().padStart(3, '0');
      
      const billWithId = {
        ...bill,
        id: newBillId,
        timestamp: new Date(),
      };
      await setDoc(doc(db, "bills", newBillId), billWithId);

      toast({ title: 'Bill Saved', description: `Bill #${newBillId} has been saved.` });
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
    
    // Immediately open dialog with local receipt
    setReceiptPreview(getLocalReceipt());
    setIsPaymentDialogOpen(true);

    // Generate AI receipt in the background and update if successful
    try {
      const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const total = subtotal * (1 - discount / 100);
      const input: GenerateReceiptInput = {
          items: orderItems.map(({ name, price, quantity }) => ({ name, price, quantity })),
          discount,
          subtotal,
          total,
      };
      const result = await generateReceipt(input);
      if (result.receiptPreview) {
          setReceiptPreview(result.receiptPreview); // Update the preview in the already-open dialog
      }
    } catch (error) {
      console.error('AI receipt generation failed, using local version:', error);
      // No toast needed here as the user already sees the local version.
    }
  };
  
  const handlePaymentSuccess = () => {
    const isTakeaway = currentActiveTableId === null;
  
    const finalReceipt = receiptPreview || getLocalReceipt();
  
    if (!finalReceipt && orderItems.length > 0) {
        toast({ variant: "destructive", title: "Billing Error", description: "Could not generate the final bill. Please try again." });
        return;
    }
  
    setIsPaymentDialogOpen(false);
    toast({ title: "Payment Successful", description: `Rs. ${total.toFixed(2)} confirmed.` });
    
    const tableIdForBill = isTakeaway ? 0 : currentActiveTableId!;
    const billPayload: Omit<Bill, 'id' | 'timestamp'> = {
      orderItems: orderItems,
      tableId: tableIdForBill,
      total: total,
      receiptPreview: finalReceipt,
    };
    addBill(billPayload);
  
    if (!isTakeaway && currentActiveTableId) {
      updateTableStatus([currentActiveTableId], 'Cleaning');
    }
    
    if (activeOrder) {
      setOrders(prevOrders => prevOrders.map(o => o.id === activeOrder.id ? {...o, status: 'Completed'} : o));
    }
  
    clearCurrentOrder(true);
  };

  const handlePrintProvisionalBill = async () => {
    if (orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot Print',
        description: 'There are no items in the order to print a bill.',
      });
      return;
    }
    setReceiptPreview(getLocalReceipt());
    
    const billTitle = currentActiveTableId === null ? 'Takeaway' : `Table #${currentActiveTableId}`;
  
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Provisional Bill for ${billTitle}</title>
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

  const handleReserveTable = async () => {
    if (!tableToReserve) return;
  
    const tableRef = doc(db, 'tables', String(tableToReserve));
    try {
      await updateDoc(tableRef, {
        status: 'Reserved',
        reservationDetails: reservationDetails,
      });
      updateTableStatus([tableToReserve], 'Reserved');
      toast({ title: `Table ${tableToReserve} reserved for ${reservationDetails.name || 'guest'}` });
    } catch (e) {
       // If doc doesn't exist, create it.
       try {
        await setDoc(tableRef, {
            id: tableToReserve,
            status: 'Reserved',
            reservationDetails: reservationDetails,
        });
        updateTableStatus([tableToReserve], 'Reserved');
        toast({ title: `Table ${tableToReserve} reserved for ${reservationDetails.name || 'guest'}` });
       } catch (error) {
         console.error("Error reserving table:", error);
         toast({ variant: 'destructive', title: 'Reservation Failed' });
       }
    }
  
    setIsReserveDialogOpen(false);
    setReservationDetails({ name: '', time: '' });
    setTableToReserve(null);
  };
  
  const openReservationDialog = (tableId: number) => {
    setTableToReserve(tableId);
    setIsReserveDialogOpen(true);
  };
  
  const handleQuickAssign = () => {
    if (orderItems.length > 0 && currentActiveTableId === null) {
        setIsQuickAssignDialogOpen(true);
    } else {
        toast({
            title: "Nothing to Assign",
            description: "You can only use Quick Assign when there is a pending order with no table selected.",
        });
    }
  };
  
  const handleAssignOrderToTable = (tableId: number) => {
    setIsQuickAssignDialogOpen(false);
    setSelectedTableId(tableId);
    // Use a timeout to ensure the state updates before sending to kitchen
    setTimeout(() => {
        handleSendToKitchen();
    }, 100);
  }


  const renderMenuItem = (item: MenuItem, subCategoryName: string, categoryName: string) => {
    const isNonVeg = subCategoryName.toLowerCase().includes('non-veg');
    
    const itemStatus = menuItemStatus[item.name];
    const categoryColorName = categoryColors[categoryName];
    
    let finalColorName;
    if (itemStatus === 'out') {
      finalColorName = itemStatusColors.out.light;
    } else if (itemStatus === 'low') {
      finalColorName = itemStatusColors.low.light;
    } else {
        finalColorName = categoryColorName ? colorPalette[categoryColorName]?.light : (isNonVeg ? nonVegColor : vegColor);
    }

    const menuItemCard = (
      <Card
        key={item.name}
        className={cn(
          "group rounded-lg transition-all shadow-md hover:shadow-lg relative overflow-hidden h-full flex flex-col min-h-[110px] border border-black",
          finalColorName,
          easyMode && "cursor-pointer hover:scale-105",
          (itemStatus === 'out') && "pointer-events-none opacity-60"
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className="p-3 flex flex-col justify-between flex-grow">
          <div>
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-full border border-black/30', isNonVeg ? 'bg-red-500' : 'bg-green-500')}></span>
                  <span className="font-semibold pr-2">{item.name}</span>
              </div>
              <span className="font-mono text-right whitespace-nowrap">₹{item.price.toFixed(2)}</span>
            </div>
          </div>
          {!easyMode && (
            <div className="flex justify-center w-full mt-auto pt-2">
                <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs px-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddButtonClick(item);
                    }}
                >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                </Button>
            </div>
          )}
        </CardContent>
        <p className="absolute bottom-1 left-2 text-xs text-muted-foreground font-mono">{item.code}</p>
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <div role="button" className="p-1 rounded-md hover:bg-black/10">
                <Palette className="h-4 w-4" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex flex-col gap-1">
                  {itemStatusNames.map((name) => (
                      <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setItemStatus(item.name, name); }}>
                          <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                          {itemStatusColors[name].name}
                      </Button>
                  ))}
                <Button variant="ghost" size="sm" className="col-span-2 h-8" onClick={(e) => { e.stopPropagation(); setItemStatus(item.name, ''); }}>Reset</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>
    );

    return (
        <DraggableMenuItem key={item.name} item={item} canDrag={easyMode && itemStatus !== 'out'}>
            {menuItemCard}
        </DraggableMenuItem>
    );
  };

  const CategoryColorPicker = ({ categoryName }: { categoryName: string }) => {
    return (
        <Popover>
          <PopoverTrigger asChild>
            <div role="button" aria-label={`Change category color for ${categoryName}`} className="p-1 rounded-md hover:bg-black/10">
                <Palette className="h-4 w-4" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {colorNames.map((name) => (
                <div
                  key={name}
                  className={cn("h-6 w-6 rounded-full cursor-pointer", colorPalette[name].light)}
                  onClick={() => handleSetCategoryColor(categoryName, name)}
                />
              ))}
              <Button variant="ghost" size="sm" className="col-span-5 h-8" onClick={() => handleSetCategoryColor(categoryName, '')}>
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>
    );
  };

  const renderMenuContent = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-6">
          {filteredMenu.map(category => (
             <div key={category.category}>
               <div className={cn("sticky top-0 backdrop-blur-sm py-2 z-10 flex items-center justify-between gap-2 p-2 rounded-md", categoryColors[category.category] ? colorPalette[categoryColors[category.category]]?.light : 'bg-background/80')}>
                <h2 className="text-xl font-bold flex-grow text-left">
                  {category.category}
                </h2>
                <div onClick={(e) => e.stopPropagation()}>
                    <CategoryColorPicker categoryName={category.category} />
                </div>
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
          <Tabs defaultValue={filteredMenu.length > 0 ? filteredMenu[0].category : undefined} className="w-full">
            <div className="flex justify-center">
              <TabsList className="mb-4 flex-wrap h-auto bg-transparent border-b rounded-none p-0">
                {filteredMenu.map(category => (
                  <div key={category.category} className="relative group p-1">
                    <TabsTrigger value={category.category} className={cn("rounded-none border-b-2 border-transparent data-[state=active]:shadow-none px-4 py-2 cursor-pointer", categoryColors[category.category] ? colorPalette[categoryColors[category.category]]?.dark : '')}>
                      <span className="flex-grow text-left text-lg text-black">{category.category}</span>
                    </TabsTrigger>
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div onClick={(e) => e.stopPropagation()}>
                          <CategoryColorPicker categoryName={category.category} />
                        </div>
                    </div>
                  </div>
                ))}
              </TabsList>
            </div>
            {filteredMenu.map(category => (
              <TabsContent key={category.category} value={category.category} className={cn("m-0 rounded-lg p-2 min-h-[200px]", categoryColors[category.category] ? colorPalette[categoryColors[category.category]]?.light : '')}>
                <div className="space-y-4">
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
       <Accordion
            type="multiple"
            value={activeAccordionItems}
            onValueChange={setActiveAccordionItems}
            className="w-full space-y-2"
        >
            {filteredMenu.map(category => (
                <AccordionItem key={category.category} value={category.category} className="border-b-0">
                     <AccordionTrigger className={cn("p-3 rounded-md text-lg font-bold hover:no-underline flex justify-between items-center", categoryColors[category.category] ? colorPalette[categoryColors[category.category]]?.dark : 'bg-muted')}>
                        <span className="flex-grow text-left text-black">{category.category}</span>
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                           <CategoryColorPicker categoryName={category.category} />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-2 space-y-2">
                        {category.subCategories.map(subCategory => (
                            <div key={subCategory.name}>
                                <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {subCategory.items.map(item => renderMenuItem(item, subCategory.name, category.category))}
                                </div>
                            </div>
                        ))}
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
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 h-full p-4">
      {/* Menu Panel */}
      <div className="md:col-span-2 xl:col-span-3 flex flex-col h-full">
        <Card className="flex flex-col flex-grow">
          <CardHeader>
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                           <div className="relative min-w-[200px]">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                  placeholder="Search menu items..."
                                  className="pl-10 h-10"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                              />
                          </div>
                          <div className="relative min-w-[200px]">
                              <QrCodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                  placeholder="Enter item code..."
                                  className="pl-10 h-10"
                                  value={itemCodeInput}
                                  onChange={(e) => setItemCodeInput(e.target.value)}
                                  onKeyDown={handleCodeEntry}
                              />
                          </div>
                           <RadioGroup value={vegFilter} onValueChange={(v) => setVegFilter(v as VegFilter)} className="flex items-center gap-2">
                              <RadioGroupItem value="All" id="filter-all" className="sr-only" />
                              <Label htmlFor="filter-all" className={cn("h-10 flex items-center justify-center px-4 rounded-md cursor-pointer border-2 font-semibold text-lg", vegFilter === 'All' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground hover:bg-accent')}>All</Label>
                              
                              <RadioGroupItem value="Veg" id="filter-veg" className="sr-only" />
                              <Label htmlFor="filter-veg" className={cn("h-10 flex items-center justify-center px-4 rounded-md cursor-pointer border-2 font-semibold text-lg", vegFilter === 'Veg' ? 'bg-green-600 text-white border-green-600' : 'text-green-600 border-green-500 hover:bg-green-50')}>Veg</Label>
                              
                              <RadioGroupItem value="Non-Veg" id="filter-nonveg" className="sr-only" />
                              <Label htmlFor="filter-nonveg" className={cn("h-10 flex items-center justify-center px-4 rounded-md cursor-pointer border-2 font-semibold text-lg", vegFilter === 'Non-Veg' ? 'bg-red-600 text-white border-red-600' : 'text-red-600 border-red-500 hover:bg-red-50')}>Non-Veg</Label>
                          </RadioGroup>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                              <Switch id="easy-mode-switch" checked={easyMode} onCheckedChange={setEasyMode} />
                              <Label htmlFor="easy-mode-switch" className="flex items-center gap-2 cursor-pointer">
                                  <MousePointerClick className="h-4 w-4" />
                                  Easy Mode
                              </Label>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                           <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center">
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="grid" id="grid-view" className="sr-only" />
                                  <LayoutGrid className="h-5 w-5 box-content" />
                              </Label>
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'accordion' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="accordion" id="accordion-view" className="sr-only" />
                                  <List className="h-5 w-5 box-content" />
                              </Label>
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="list" id="list-view" className="sr-only" />
                                  <Rows className="h-5 w-5 box-content" />
                              </Label>
                          </RadioGroup>
                      </div>
                  </div>
                   <div className="flex justify-end items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsMenuManagerOpen(true)}>
                          <BookOpen className="mr-2 h-4 w-4" /> Manage Menu
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleShuffleColors}>
                          <Shuffle className="mr-2 h-4 w-4" /> Colors
                      </Button>
                      {viewMode === 'accordion' && (
                          <Button variant="outline" size="sm" onClick={toggleAccordion}>
                              <ChevronsUpDown className="mr-2 h-4 w-4" />
                              {allItemsOpen ? 'Collapse' : 'Expand'}
                          </Button>
                      )}
                  </div>
              </div>
          </CardHeader>
          <ScrollArea className="flex-grow px-4">
              {renderMenuContent()}
          </ScrollArea>
        </Card>
      </div>

      {/* Order Panel */}
      <div className="md:col-span-1 xl:col-span-1 flex flex-col h-full gap-4">
          <OrderPanel
              orderItems={orderItems}
              originalOrderItems={originalOrderItems}
              handleDropOnOrder={handleDropOnOrder}
              updateQuantity={updateQuantity}
              removeFromOrder={removeFromOrder}
              activeOrder={activeOrder}
              currentActiveTableId={currentActiveTableId}
              clearCurrentOrder={clearCurrentOrder}
              handleQuickAssign={handleQuickAssign}
              subtotal={subtotal}
              total={total}
              discount={discount}
              setDiscount={setDiscount}
              isProcessing={isProcessing}
              handleSendToKitchen={handleSendToKitchen}
              handlePrintProvisionalBill={handlePrintProvisionalBill}
              handleProcessPayment={handleProcessPayment}
              receiptPreview={receiptPreview}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
                {tables.map(table => {
                    const Icon = statusIcons[table.status];
                    const isSelected = table.id === selectedTableId;
                    const hasPendingItems = (pendingOrders[table.id] || []).length > 0 && table.status !== 'Occupied';
                    return (
                    <TableDropTarget key={table.id} table={table} occupancyCount={occupancyCount} handleSelectTable={handleSelectTable} onDropItem={handleDropItemOnTable}>
                        <div
                        className={cn(
                            'absolute inset-0 flex flex-col items-center justify-center text-center transition-colors rounded-md p-1 h-full aspect-square',
                            isSelected && 'ring-4 ring-offset-2 ring-background'
                        )}
                        >
                            {hasPendingItems && (
                                <div className="absolute top-1 left-1 bg-amber-400 p-1 rounded-full text-black">
                                    <ShoppingBag className="h-3 w-3" />
                                </div>
                            )}
                            <span className={cn("text-4xl font-bold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.id}</span>
                            <div className="flex items-center gap-1">
                                <Icon className={cn("h-4 w-4 shrink-0", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')} />
                                <span className={cn("text-xs font-semibold leading-tight break-words", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.status}</span>
                            </div>
                        </div>
                    </TableDropTarget>
                    )
                })}
                 <div
                    className={cn(
                        "h-full flex-col justify-center items-center relative p-1 border-2 transition-transform duration-150 active:scale-95 group flex rounded-md cursor-pointer hover:scale-105 hover:z-10 bg-muted text-muted-foreground border-dashed",
                        selectedTableId === null && 'ring-4 ring-offset-2 ring-primary',
                        "aspect-square"
                    )}
                    onClick={() => handleSelectTable(null)}
                >
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-md p-1">
                        <ShoppingBag className="h-10 w-10" />
                        <span className="text-lg font-bold mt-1">Takeaway</span>
                    </div>
                </div>
            </div>
          </OrderPanel>
      </div>

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
      <ManageMenuDialog
        isOpen={isMenuManagerOpen}
        onOpenChange={setIsMenuManagerOpen}
        menu={menu}
        setMenu={setMenu}
      />
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reserve Table {tableToReserve}</DialogTitle>
                <DialogDescription>Enter guest details (optional).</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="guest-name" className="text-right">Name</Label>
                    <Input id="guest-name" value={reservationDetails.name} onChange={(e) => setReservationDetails({...reservationDetails, name: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reservation-time" className="text-right">Time</Label>
                    <Input id="reservation-time" type="time" value={reservationDetails.time} onChange={(e) => setReservationDetails({...reservationDetails, time: e.target.value})} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleReserveTable}>Reserve</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isQuickAssignDialogOpen} onOpenChange={setIsQuickAssignDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Assign Order to Table</DialogTitle>
                  <DialogDescription>Select an available table to assign this order to.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-4 py-4">
                  {tables.filter(t => t.status === 'Available').map(table => (
                      <Button
                          key={table.id}
                          variant="outline"
                          className="aspect-square h-20 text-2xl"
                          onClick={() => handleAssignOrderToTable(table.id)}
                      >
                          {table.id}
                      </Button>
                  ))}
                  {tables.filter(t => t.status === 'Available').length === 0 && (
                        <p className="col-span-4 text-center text-muted-foreground">No tables are currently available.</p>
                  )}
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}


