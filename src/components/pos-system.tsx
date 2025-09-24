

"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Search, Plus, Minus, X, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, CheckCircle2, Users, Bookmark, Sparkles, Repeat, Edit, UserCheck, BookmarkX, Printer, Loader2, BookOpen, Trash2 as TrashIcon, QrCode as QrCodeIcon, MousePointerClick, Eye, Hand, ShoppingBag, BarChart, Users2, Bike, ShoppingBasket, Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrag, useDrop } from 'react-dnd';
import { AddItemDialog } from './add-item-dialog';
import { ManageMenuDialog } from './manage-menu-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order, Bill, TableStatus, KOTPreference, OrderType, CustomerDetails } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';


const vegColor = 'bg-green-100 dark:bg-green-900/30';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30';

const colorPalette: Record<string, {light: string, medium: string}> = {
    amber: { light: 'bg-amber-200 dark:bg-amber-800/50', medium: 'bg-amber-300 dark:bg-amber-700/50' },
    lime: { light: 'bg-lime-200 dark:bg-lime-800/50', medium: 'bg-lime-300 dark:bg-lime-700/50' },
    rose: { light: 'bg-rose-200 dark:bg-rose-800/50', medium: 'bg-rose-300 dark:bg-rose-700/50' },
    violet: { light: 'bg-violet-200 dark:bg-violet-800/50', medium: 'bg-violet-300 dark:bg-violet-700/50' },
    olive: { light: 'bg-lime-200 dark:bg-lime-800/50', medium: 'bg-lime-300 dark:bg-lime-700/50' },
    cyan: { light: 'bg-cyan-200 dark:bg-cyan-800/50', medium: 'bg-cyan-300 dark:bg-cyan-700/50' },
    pink: { light: 'bg-pink-200 dark:bg-pink-800/50', medium: 'bg-pink-300 dark:bg-pink-700/50' },
    fuchsia: { light: 'bg-fuchsia-200 dark:bg-fuchsia-800/50', medium: 'bg-fuchsia-300 dark:bg-fuchsia-700/50' },
    purple: { light: 'bg-purple-200 dark:bg-purple-800/50', medium: 'bg-purple-300 dark:bg-purple-700/50' },
    indigo: { light: 'bg-indigo-200 dark:bg-indigo-800/50', medium: 'bg-indigo-300 dark:bg-indigo-700/50' },
    green: { light: 'bg-green-200 dark:bg-green-800/50', medium: 'bg-green-300 dark:bg-green-700/50' },
    yellow: { light: 'bg-yellow-200 dark:bg-yellow-800/50', medium: 'bg-yellow-300 dark:bg-yellow-700/50' },
    emerald: { light: 'bg-emerald-200 dark:bg-emerald-800/50', medium: 'bg-emerald-300 dark:bg-emerald-700/50' },
    teal: { light: 'bg-teal-200 dark:bg-teal-800/50', medium: 'bg-teal-300 dark:bg-teal-700/50' },
    sky: { light: 'bg-sky-200 dark:bg-sky-800/50', medium: 'bg-sky-300 dark:bg-sky-700/50' },
    blue: { light: 'bg-blue-200 dark:bg-blue-800/50', medium: 'bg-blue-300 dark:bg-blue-700/50' },
    orange: { light: 'bg-orange-200 dark:bg-orange-800/50', medium: 'bg-orange-300 dark:bg-orange-700/50' },
};
const colorNames = Object.keys(colorPalette);

const itemStatusColors: Record<string, { light: string, dark: string, name: string }> = {
    low: { light: 'bg-yellow-200 dark:bg-yellow-900/40', dark: 'bg-yellow-500 dark:bg-yellow-800/70', name: 'Running Low' },
    out: { light: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200', dark: 'bg-red-800 text-white dark:bg-red-700/70', name: 'Out of Stock' },
};
const itemStatusNames = Object.keys(itemStatusColors);


type ViewMode = 'accordion' | 'grid';
type VegFilter = 'All' | 'Veg' | 'Non-Veg';
type ColorShade = 'light' | 'medium';

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
  venueName: string;
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
  keyboardMode: 'table' | 'order' | 'confirm';
  setKeyboardMode: (mode: 'table' | 'order' | 'confirm') => void;
  billHistory: Bill[];
  kotPreference: KOTPreference;
  selectedOrderType: OrderType;
  setSelectedOrderType: (type: OrderType) => void;
  showTableDetailsOnPOS: boolean;
  showReservationTimeOnPOS: boolean;
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
                table.status === 'Available' || table.status === 'Occupied' ? 'text-white border-black/50' : 'text-black border-black/50',
            )}
            onClick={() => handleSelectTable(table.id)}
        >
            {children}
        </div>
    );
}

function OrderPanel({
    orderItems,
    handleDropOnOrder,
    updateQuantity,
    removeFromOrder,
    activeOrder,
    selectedTableId,
    clearCurrentOrder,
    handleQuickAssign,
    subtotal,
    total,
    discount,
    setDiscount,
    isProcessing,
    handlePrintProvisionalBill,
    handleProcessPayment,
    receiptPreview,
    kotButtons,
    children,
    orderType,
    customerDetails,
    getNewItems,
}: {
    orderItems: OrderItem[];
    handleDropOnOrder: (item: MenuItem) => void;
    updateQuantity: (name: string, quantity: number) => void;
    removeFromOrder: (name: string) => void;
    activeOrder: Order | null;
    selectedTableId: number | null;
    clearCurrentOrder: (fullReset?: boolean) => void;
    handleQuickAssign: () => void;
    subtotal: number;
    total: number;
    discount: number;
    setDiscount: (discount: number) => void;
    isProcessing: boolean;
    handlePrintProvisionalBill: () => void;
    handleProcessPayment: () => void;
    receiptPreview: string;
    kotButtons: React.ReactNode;
    children: React.ReactNode;
    orderType: OrderType;
    customerDetails?: CustomerDetails;
    getNewItems: (currentItems: OrderItem[], sentItems: OrderItem[]) => OrderItem[];
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
    
    const showQuickAssign = orderItems.length > 0 && selectedTableId === null;
    const orderTitle = useMemo(() => {
        if (orderType === 'Dine-In') {
            return selectedTableId ? `Table ${selectedTableId}` : 'Select a Table';
        }
        if (orderType === 'Take-Away') return 'Take-Away Order';
        if (orderType === 'Home-Delivery') {
            return customerDetails?.name || 'Home Delivery';
        }
        return 'Current Order'
    }, [selectedTableId, orderType, customerDetails]);
    

    const renderOrderItems = () => {
        if (orderItems.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ClipboardList className="w-16 h-16 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-center">
                Click on items to add them or drag & drop here.
              </p>
            </div>
          );
        }

        const renderItem = (item: OrderItem, isNew: boolean) => (
            <div key={`${item.name}-${isNew ? 'new' : 'old'}`} className={cn("flex items-center p-2 rounded-md", isNew && "bg-blue-50 dark:bg-blue-900/20")}>
                <div className="flex-grow">
                    <p className="font-medium flex items-center gap-2">
                        {item.name}
                        {isNew && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                                new
                            </span>
                        )}
                    </p>
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
        
        if (!activeOrder) {
            return <div className="space-y-2">{orderItems.map(item => renderItem(item, false))}</div>;
        }

        const sentItemsMap = new Map(activeOrder.items.map(item => [item.name, item.quantity]));
        
        const existingItemsUI: JSX.Element[] = [];
        const newItemsUI: JSX.Element[] = [];

        orderItems.forEach(item => {
            const sentQty = sentItemsMap.get(item.name);
            if (sentQty !== undefined) {
                if (item.quantity > sentQty) {
                    existingItemsUI.push(renderItem({ ...item, quantity: sentQty }, false));
                    newItemsUI.push(renderItem({ ...item, quantity: item.quantity - sentQty }, true));
                } else if (item.quantity === sentQty) {
                    existingItemsUI.push(renderItem(item, false));
                }
            } else {
                newItemsUI.push(renderItem(item, true));
            }
        });

        return (
          <div className="space-y-2">
            {existingItemsUI}
            {newItemsUI.length > 0 && existingItemsUI.length > 0 && <Separator className="my-4" />}
            {newItemsUI}
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
                {renderOrderItems()}
            </ScrollArea>
            
            <div id="table-grid-container" className="p-4 border-t space-y-4">
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
                    <div className="flex flex-col gap-2">
                        {kotButtons}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button size="lg" variant="outline" className="h-12 text-base" onClick={handlePrintProvisionalBill} disabled={orderItems.length === 0}>
                            <Printer className="mr-2 h-4 w-4" />
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

function ItemStatusDialog({
  isOpen,
  onOpenChange,
  lowStockItems,
  outOfStockItems
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lowStockItems: MenuItem[];
  outOfStockItems: MenuItem[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Item Status Overview</DialogTitle>
          <DialogDescription>
            A quick look at your menu's stock levels.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="low-stock" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="low-stock" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">Running Low</TabsTrigger>
            <TabsTrigger value="out-of-stock" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Out of Stock</TabsTrigger>
          </TabsList>
          
          <TabsContent value="low-stock" className="mt-4 max-h-80 overflow-y-auto">
            {lowStockItems.length > 0 ? (
              <ul className="space-y-2">
                {lowStockItems.map(item => (
                  <li key={item.name} className="p-2 rounded-md font-medium">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">No items are marked as running low.</p>
            )}
          </TabsContent>
          <TabsContent value="out-of-stock" className="mt-4 max-h-80 overflow-y-auto">
            {outOfStockItems.length > 0 ? (
              <ul className="space-y-2">
                {outOfStockItems.map(item => (
                  <li key={item.name} className="p-2 rounded-md font-medium">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">No items are marked as out of stock.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function HomeDeliveryDialog({
  isOpen,
  onOpenChange,
  onSave,
  existingDetails,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: CustomerDetails) => void;
  existingDetails?: CustomerDetails;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setName(existingDetails?.name || '');
      setPhone(existingDetails?.phone || '');
      setAddress(existingDetails?.address || '');
      setHouseNo(existingDetails?.houseNo || '');
      setStreet(existingDetails?.street || '');
      setLandmark(existingDetails?.landmark || '');
      setEmail(existingDetails?.email || '');
    }
  }, [isOpen, existingDetails]);

  const handleSave = () => {
    onSave({ name, phone, address, houseNo, street, landmark, email });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Home Delivery Details</DialogTitle>
          <DialogDescription>Enter the customer's information for the delivery.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input id="customer-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., John Doe" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone Number</Label>
                <Input id="customer-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 9876543210" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="customer-address">Address</Label>
                <Textarea id="customer-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., Main Street..." required/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="customer-houseno">House No. (Optional)</Label>
                    <Input id="customer-houseno" value={houseNo} onChange={e => setHouseNo(e.target.value)} placeholder="e.g., #123"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-street">Street Name (Optional)</Label>
                    <Input id="customer-street" value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g., Temple Road"/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="customer-landmark">Landmark (Optional)</Label>
                <Input id="customer-landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="e.g., Near Post Office"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="customer-email">Email (Optional)</Label>
                <Input id="customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., a@b.com"/>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !phone || !address}>Save Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PosSystem({ 
    venueName,
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
    keyboardMode,
    setKeyboardMode,
    billHistory,
    kotPreference,
    selectedOrderType,
    setSelectedOrderType,
    showTableDetailsOnPOS,
    showReservationTimeOnPOS,
}: PosSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [easyMode, setEasyMode] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState('');
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [menuItemStatus, setMenuItemStatus] = useState<Record<string, string>>({});
  const [menuCategoryStatus, setMenuCategoryStatus] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [reservationDetails, setReservationDetails] = useState({ name: '', time: '' });
  const [tableToReserve, setTableToReserve] = useState<number | null>(null);
  const [vegFilter, setVegFilter] = useState<VegFilter>('All');
  const [isQuickAssignDialogOpen, setIsQuickAssignDialogOpen] = useState(false);
  const [isEasyModeAlertOpen, setIsEasyModeAlertOpen] = useState(false);
  const hasSeenEasyModeAlert = useRef(false);
  const [isItemStatusDialogOpen, setIsItemStatusDialogOpen] = useState(false);
  const [isHomeDeliveryDialogOpen, setIsHomeDeliveryDialogOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | undefined>();
  const [colorShade, setColorShade] = useState<ColorShade>('light');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const menuCategories = useMemo(() => menu.map(c => c.category), [menu]);
  
  const getNewItems = useCallback((currentItems: OrderItem[], sentItems: OrderItem[]): OrderItem[] => {
      const newItems: OrderItem[] = [];
      const sentMap = new Map(sentItems.map(item => [item.name, item.quantity]));

      currentItems.forEach(item => {
          const sentQty = sentMap.get(item.name) || 0;
          if (item.quantity > sentQty) {
            newItems.push({ ...item, quantity: item.quantity - sentQty });
          }
      });
      return newItems;
  }, []);
  
  const getLocalReceipt = useCallback(() => {
    if (orderItems.length === 0) return '';
  
    const pad = (str: string, len: number, char = ' ') => str.padEnd(len, char);
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal * (1 - discount / 100);
    const money = (val: number) => `₹${val.toFixed(2)}`;
  
    let receiptLines = [];
    receiptLines.push('*************************');
    receiptLines.push(`    ${venueName}    `);
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
  }, [orderItems, discount, venueName]);

  const groupItemsForKOT = useCallback((items: OrderItem[]): { title: string; items: OrderItem[] }[] => {
    if (items.length === 0) return [];
  
    switch (kotPreference.type) {
      case 'single':
        return [{ title: 'KOT', items }];
  
      case 'separate':
        const kitchenItems = items.filter(item => item.category !== 'Beverages');
        const barItems = items.filter(item => item.category === 'Beverages');
        const groups = [];
        if (kitchenItems.length > 0) groups.push({ title: 'Kitchen KOT', items: kitchenItems });
        if (barItems.length > 0) groups.push({ title: 'Bar KOT', items: barItems });
        return groups;
  
      case 'category':
        const groupedByCategory: Record<string, OrderItem[]> = {};
        const remainingItems: OrderItem[] = [];
        const specifiedCategories = kotPreference.categories || [];
  
        items.forEach(item => {
          if (item.category && specifiedCategories.includes(item.category)) {
            if (!groupedByCategory[item.category]) {
              groupedByCategory[item.category] = [];
            }
            groupedByCategory[item.category].push(item);
          } else {
            remainingItems.push(item);
          }
        });
  
        const categoryGroups = Object.entries(groupedByCategory).map(([category, items]) => ({
          title: `${category} KOT`,
          items,
        }));
        
        // Handle remaining items with kitchen/bar split
        if (remainingItems.length > 0) {
            const remainingKitchenItems = remainingItems.filter(item => item.category !== 'Beverages');
            const remainingBarItems = remainingItems.filter(item => item.category === 'Beverages');

            if (remainingKitchenItems.length > 0) {
                // Try to merge with an existing "Kitchen KOT" if any, otherwise create new
                const existingKitchenGroup = categoryGroups.find(g => g.title === 'Kitchen KOT');
                if (existingKitchenGroup) {
                    existingKitchenGroup.items.push(...remainingKitchenItems);
                } else {
                    categoryGroups.push({ title: 'Kitchen KOT', items: remainingKitchenItems });
                }
            }
            if (remainingBarItems.length > 0) {
                 categoryGroups.push({ title: 'Bar KOT', items: remainingBarItems });
            }
        }
  
        return categoryGroups;
  
      default:
        return [{ title: 'KOT', items }];
    }
  }, [kotPreference]);

  useEffect(() => {
    if (activeOrder) {
      setSelectedOrderType(activeOrder.orderType);
      setCustomerDetails(activeOrder.customerDetails);
    }
  }, [activeOrder, setSelectedOrderType]);

  const handleSetOrderType = (type: OrderType) => {
    if (type === 'Home-Delivery') {
        setIsHomeDeliveryDialogOpen(true);
    } else {
        setSelectedOrderType(type);
        setCustomerDetails(undefined);
    }

    if (type !== 'Dine-In') {
        setSelectedTableId(null);
    } else if (!selectedTableId) {
        // If switching to Dine-In and no table is selected, select the first available one
        const firstAvailable = tables.find(t => t.status === 'Available');
        setSelectedTableId(firstAvailable ? firstAvailable.id : (tables.length > 0 ? tables[0].id : null));
    }
  };

  const handleSaveDeliveryDetails = (details: CustomerDetails) => {
    setCustomerDetails(details);
    setSelectedOrderType('Home-Delivery');
  }

  useEffect(() => {
    const structuredMenu = (menuData as MenuCategory[]).map(category => ({
        ...category,
        subCategories: category.subCategories.map(sub => ({
            ...sub,
            items: sub.items.map(item => ({...item, history: item.history || []}))
        }))
    }));
    setMenu(structuredMenu);
  }, []);
  

  const allMenuItems: MenuItem[] = useMemo(() => 
    menu.flatMap(cat => cat.subCategories.flatMap(sub => sub.items)),
    [menu]
  );
  
  const filteredMenu = useMemo(() => {
    let menuToFilter = menu;

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        menuToFilter = menuToFilter.map(category => ({
            ...category,
            subCategories: category.subCategories.map(subCategory => ({
                ...subCategory,
                items: subCategory.items.filter(item => item.name.toLowerCase().includes(lowercasedTerm) || item.code.toLowerCase().includes(lowercasedTerm))
            })).filter(subCategory => subCategory.items.length > 0)
        })).filter(category => category.subCategories.length > 0);
    }

    if (vegFilter !== 'All') {
        menuToFilter = menuToFilter.map(category => ({
            ...category,
            subCategories: category.subCategories.filter(subCategory => subCategory.name === vegFilter)
        })).filter(category => category.subCategories.length > 0);
    }

    return menuToFilter;
  }, [searchTerm, vegFilter, menu]);

  useEffect(() => {
    if (searchTerm && viewMode === 'accordion') {
      setActiveAccordionItems(filteredMenu.map(c => c.category));
    }
  }, [searchTerm, viewMode, filteredMenu]);
  
  useEffect(() => {
    const initialColors: Record<string, string> = {
        "Pizza's": "amber",
        "Pasta (Penne / Spaghetti)": "lime",
        "Sandwiches": "purple",
        "Garlic Bread": "teal",
        "Burger's": "orange",
        "All Day Breakfast": "cyan",
        "Beverages": "amber",
        "Chinese & Snacks": "lime"
    };

    try {
      const savedColors = localStorage.getItem('categoryColors');
      if (savedColors) {
        setCategoryColors(JSON.parse(savedColors));
      } else {
        setCategoryColors(initialColors);
      }
    } catch (e) {
      console.error("Could not parse 'categoryColors' from localStorage", e);
      setCategoryColors(initialColors);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(categoryColors).length > 0) {
      try {
        localStorage.setItem('categoryColors', JSON.stringify(categoryColors));
      } catch (e) {
        console.error("Could not save 'categoryColors' to localStorage", e);
      }
    }
  }, [categoryColors]);
  
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
  
  const handleEasyModeChange = (checked: boolean) => {
    if (checked && !hasSeenEasyModeAlert.current) {
        setIsEasyModeAlertOpen(true);
    } else {
        setEasyMode(checked);
    }
  };

  const confirmEasyMode = () => {
    setEasyMode(true);
    hasSeenEasyModeAlert.current = true;
    setIsEasyModeAlertOpen(false);
  };
    
  useEffect(() => {
    if (orderItems.length > 0) {
      const localReceipt = getLocalReceipt();
      setReceiptPreview(localReceipt);
    } else {
      setReceiptPreview('');
    }
  }, [orderItems, discount, getLocalReceipt]);

  
  const setItemStatus = (itemName: string, status: string) => {
    setMenuItemStatus(prev => ({ ...prev, [itemName]: status }));
  };

  const setCategoryStatus = (categoryName: string, status: string) => {
    setMenuCategoryStatus(prev => ({ ...prev, [categoryName]: status }));
  };
  
  const handleShuffleColors = () => {
    const shuffledPalette = [...colorNames].sort(() => 0.5 - Math.random());
    const newCategoryColors: Record<string, string> = {};
    menu.forEach((category, index) => {
      newCategoryColors[category.category] = shuffledPalette[index % shuffledPalette.length];
    });
    setCategoryColors(newCategoryColors);
    toast({ title: "Colors Shuffled!", description: "New random colors have been applied to the categories." });
  };

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
            const itemWithCategory = {
                ...item,
                category: menu.find(c => c.subCategories.some(sc => sc.items.some(i => i.name === item.name)))?.category
            };
            return [...prevItems, { ...itemWithCategory, quantity }];
        }
    });
  }, [setOrderItems, menu]);

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
      e.preventDefault();
      const code = searchTerm.trim().toUpperCase();
      if (!code) return;
      
      const item = allMenuItems.find(i => i.code === code);
      if (item) {
        addToOrder(item, 1);
        toast({
            title: "Item Added",
            description: `1 x ${item.name} added to the order.`,
        });
        setSearchTerm('');
      } else {
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
  
  const printKot = (order: Order, itemsToPrint: OrderItem[], kotTitle: string) => {
    if (itemsToPrint.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const isUpdate = !!(activeOrder && activeOrder.items.length > 0);
      
      let title: string;
       switch (order.orderType) {
            case 'Dine-In':
                title = `Table ${order.tableId}`;
                break;
            case 'Take-Away':
                title = 'Take Away';
                break;
            case 'Home-Delivery':
                title = order.customerDetails?.name || 'Home Delivery';
                break;
            default:
                title = 'Unassigned Order';
        }
      
      const receipt = `
        <html>
          <head>
            <title>${kotTitle}</title>
            <style>
              body { font-family: monospace; margin: 20px; font-size: 14px; }
              h2, h3 { text-align: center; margin: 5px 0; }
              ul { list-style: none; padding: 0; }
              li { display: flex; justify-content: space-between; margin: 5px 0; font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>${isUpdate ? `UPDATE - ${kotTitle}` : kotTitle}</h2>
            <h3>Order ID: ${order.id} | ${title}</h3>
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
      printWindow.document.write(receipt);
      printWindow.document.close();
    }
  };
  
const processKOTs = useCallback((kotGroupsToProcess: { title: string; items: OrderItem[] }[]) => {
    setIsProcessing(true);

    setTimeout(() => {
        let finalOrder: Order;
        const itemsInThisKot = kotGroupsToProcess.flatMap(g => g.items);

        if (activeOrder) {
            // This is an UPDATE to an existing order.
            const updatedItems = [...activeOrder.items];
            itemsInThisKot.forEach(newItem => {
                const existingIndex = updatedItems.findIndex(i => i.name === newItem.name);
                if (existingIndex > -1) {
                    updatedItems[existingIndex].quantity += newItem.quantity;
                } else {
                    updatedItems.push(newItem);
                }
            });
            finalOrder = { ...activeOrder, items: updatedItems };
            setOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
            setActiveOrder(finalOrder);
        } else {
            // This is a NEW order.
            const newOrderObject: Order = {
                items: orderItems, // Use all items from the cart for the main order object.
                tableId: selectedTableId,
                id: `K${(orders.length + 1).toString().padStart(3, '0')}`,
                status: 'In Preparation',
                orderType: selectedOrderType,
                customerDetails: customerDetails,
            };
            onOrderCreated(newOrderObject);
            
            // This is the crucial part: update the `activeOrder` locally to reflect the items that have just been sent.
            // This ensures subsequent KOTs for the same fresh order know what's already been processed.
            const sentItemsForThisKot = [...(activeOrder?.items || []), ...itemsInThisKot];
            const tempUpdatedOrder = { ...newOrderObject, items: sentItemsForThisKot };
            setActiveOrder(tempUpdatedOrder);

            if (selectedTableId) {
                updateTableStatus([selectedTableId], 'Occupied');
            }
             finalOrder = newOrderObject;
        }
        
        kotGroupsToProcess.forEach(group => {
            printKot(finalOrder, group.items, group.title);
        });

        toast({ title: `KOTs Sent!`, description: `Order update sent.` });
        setIsProcessing(false);

    }, 100);
}, [activeOrder, orderItems, selectedTableId, orders.length, selectedOrderType, customerDetails, onOrderCreated, setOrders, updateTableStatus, toast, setActiveOrder]);

  
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
      
      if (selectedTableId !== tableId) {
        setSelectedTableId(tableId);
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
        timestamp: new Date(),
      };
      await setDoc(doc(db, "bills", newBillId), billWithId);

      toast({ title: 'Bill Saved', description: `Bill #${newBillId} has been saved.` });
    } catch (error) {
      console.error("Error adding bill to Firestore: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the bill to the database.' });
    }
  };


  const handleProcessPayment = () => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Order", description: "Cannot process payment for an empty order." });
      return;
    }
    
    setReceiptPreview(getLocalReceipt());
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    const finalReceipt = receiptPreview || getLocalReceipt();
  
    if (!finalReceipt && orderItems.length > 0) {
        toast({ variant: "destructive", title: "Billing Error", description: "Could not generate the final bill. Please try again." });
        return;
    }
  
    setIsPaymentDialogOpen(false);
    toast({ title: "Payment Successful", description: `Rs. ${total.toFixed(2)} confirmed.` });
    
    const billPayload: Omit<Bill, 'id' | 'timestamp'> = {
      orderItems: orderItems,
      tableId: selectedTableId,
      total: total,
      receiptPreview: finalReceipt,
      orderType: selectedOrderType,
      customerDetails: customerDetails,
    };
    addBill(billPayload);
  
    if (selectedTableId) {
      updateTableStatus([selectedTableId], 'Cleaning');
    }
    
    if (activeOrder) {
      setOrders(prevOrders => prevOrders.map(o => o.id === activeOrder.id ? {...o, status: 'Completed'} : o));
    }
  
    clearCurrentOrder(true);
  };

  const handlePrintProvisionalBill = () => {
    if (orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot Print',
        description: 'There are no items in the order to print a bill.',
      });
      return;
    }
    
    const currentReceipt = getLocalReceipt();
    setReceiptPreview(currentReceipt);
    
    const billTitle = selectedTableId === null ? 'Unassigned Order' : `Table #${selectedTableId}`;
  
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
    if (orderItems.length > 0 && selectedTableId === null) {
        setIsQuickAssignDialogOpen(true);
    } else {
        toast({
            title: "Nothing to Assign",
            description: "You can only use Quick Assign when there is a pending Dine-In order with no table selected.",
        });
    }
  };
  
  const handleAssignOrderToTable = (tableId: number) => {
    setIsQuickAssignDialogOpen(false);
    setSelectedTableId(tableId);
    setTimeout(() => {
        const newItems = getNewItems(orderItems, activeOrder?.items || []);
        const kotGroups = groupItemsForKOT(newItems);
        processKOTs(kotGroups);
    }, 100);
  };

  const lowStockItems = useMemo(() => allMenuItems.filter(item => menuItemStatus[item.name] === 'low'), [allMenuItems, menuItemStatus]);
  const outOfStockItems = useMemo(() => allMenuItems.filter(item => menuItemStatus[item.name] === 'out'), [allMenuItems, menuItemStatus]);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
    
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (isInputFocused && activeEl !== searchInputRef.current) {
      return;
    }
    
    const isNumberKey = e.key >= '0' && e.key <= '9';

    if (keyboardMode === 'table') {
      e.preventDefault();
      
      if (isNumberKey) {
          const tableNum = e.key === '0' ? 10 : parseInt(e.key, 10);
          if (tableNum > 0 && tableNum <= tables.length) {
            setSelectedTableId(tableNum);
          }
      } else if (e.key.startsWith('Arrow')) {
          const tableGrid = document.getElementById('table-grid-container')?.querySelector('.grid');
          if (!tableGrid || selectedTableId === null) return;

          const gridStyle = window.getComputedStyle(tableGrid);
          const gridTemplateColumns = gridStyle.getPropertyValue('grid-template-columns');
          const numColumns = gridTemplateColumns.split(' ').length;
          
          const sortedTables = [...tables].sort((a,b) => a.id - b.id);
          const currentIndex = sortedTables.findIndex(t => t.id === selectedTableId);
          if (currentIndex === -1) return;

          let nextIndex = -1;

          switch (e.key) {
              case 'ArrowLeft':
                  if (currentIndex > 0) nextIndex = currentIndex - 1;
                  break;
              case 'ArrowRight':
                  if (currentIndex < sortedTables.length - 1) nextIndex = currentIndex + 1;
                  break;
              case 'ArrowUp':
                  if (currentIndex >= numColumns) nextIndex = currentIndex - numColumns;
                  break;
              case 'ArrowDown':
                  if (currentIndex < sortedTables.length - numColumns) nextIndex = currentIndex + numColumns;
                  break;
          }

          if (nextIndex !== -1 && nextIndex < sortedTables.length) {
              const nextTableId = sortedTables[nextIndex].id;
              setSelectedTableId(nextTableId);
          }
      }
    } 
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (keyboardMode === 'table' && selectedTableId) {
        const table = tables.find(t => t.id === selectedTableId);
        if (table && table.status === 'Available') {
          updateTableStatus([selectedTableId], 'Occupied');
        }
        searchInputRef.current?.focus();
        setKeyboardMode('order');
      } else if (keyboardMode === 'confirm') {
        // This should trigger the first available KOT button
        const newItems = getNewItems(orderItems, activeOrder?.items || []);
        const kotGroups = groupItemsForKOT(newItems);
        if (kotGroups.length > 0) {
          processKOTs([kotGroups[0]]);
        }
        setKeyboardMode('table');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (keyboardMode === 'order') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        setKeyboardMode('confirm');
      } else if (keyboardMode === 'confirm') {
        searchInputRef.current?.focus();
        setKeyboardMode('order');
      }
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardMode, selectedTableId, tables, setSelectedTableId, updateTableStatus, setKeyboardMode, orderItems, activeOrder, getNewItems, groupItemsForKOT, processKOTs]);
  

  const renderKotButtons = () => {
    if (!activeOrder) {
        // This is a NEW order
        const kotGroups = groupItemsForKOT(orderItems);
        if (kotGroups.length === 0) return null;
        
        const isOrderReady = selectedOrderType === 'Dine-In' ? selectedTableId : true;

        return kotGroups.map(group => (
            <Button
                key={group.title}
                size="lg"
                className="h-12 text-base w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => processKOTs([group])}
                disabled={isProcessing || !isOrderReady}
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send {group.title}
            </Button>
        ));
    }

    // This is an UPDATE to an existing order
    const newItems = getNewItems(orderItems, activeOrder.items);
    if (newItems.length === 0) return null;

    const kotGroups = groupItemsForKOT(newItems);

    return kotGroups.map(group => (
        <Button
            key={group.title}
            size="lg"
            className="h-12 text-base w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => processKOTs([group])}
            disabled={isProcessing}
        >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Update {group.title}
        </Button>
    ));
};


  const renderMenuItem = (item: MenuItem, subCategoryName: string, categoryName: string) => {
    const isNonVeg = subCategoryName.toLowerCase().includes('non-veg');
    
    const itemStatus = menuItemStatus[item.name];
    const categoryStatus = menuCategoryStatus[categoryName];
    
    let finalItemBg = 'bg-background';
    let isDisabled = false;

    if (categoryStatus === 'out' || itemStatus === 'out') {
        finalItemBg = 'bg-red-300 dark:bg-red-900/70 text-white dark:text-red-200';
        isDisabled = true;
    } else if (categoryStatus === 'low' || itemStatus === 'low') {
        finalItemBg = itemStatusColors.low.light;
    } else {
        const colorName = categoryColors[categoryName];
        finalItemBg = colorName ? colorPalette[colorName]?.[colorShade] : 'bg-background';
    }
    
    const menuItemCard = (
      <Card
        key={item.name}
        className={cn(
          "group rounded-lg transition-all shadow-md hover:shadow-lg relative overflow-hidden h-full flex flex-col min-h-[110px] hover:scale-105",
          easyMode && "cursor-pointer",
          isDisabled && "pointer-events-none opacity-60",
          finalItemBg
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className={cn("p-3 flex flex-col justify-between flex-grow")}>
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
        <p className="absolute bottom-1 left-2 text-xs text-muted-foreground font-mono font-bold">{item.code}</p>
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
        <DraggableMenuItem key={item.name} item={item} canDrag={easyMode && !isDisabled}>
            {menuItemCard}
        </DraggableMenuItem>
    );
  };
  
    const renderCategoryHeader = (category: MenuCategory) => {
    const status = menuCategoryStatus[category.category];
    const statusConfig = status ? itemStatusColors[status] : null;
    
    return (
        <div className="flex-grow text-left flex items-center gap-2 font-bold">
            <span className="truncate">{category.category}</span>
            {statusConfig && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/10">
                    {statusConfig.name}
                </span>
            )}
        </div>
    );
};


  const renderMenuContent = () => {
    if (viewMode === 'grid') {
        return (
          <Tabs defaultValue={filteredMenu.length > 0 ? filteredMenu[0].category : undefined} className="w-full">
            <div className="flex justify-center">
              <TabsList className="mb-4 flex-wrap h-auto bg-transparent border-b rounded-none p-0">
                {filteredMenu.map(category => {
                    const status = menuCategoryStatus[category.category];
                    const statusConfig = status ? itemStatusColors[status] : null;
                    const colorName = categoryColors[category.category];
                    const colorClass = colorName ? colorPalette[colorName]?.[colorShade] : '';
                    return (
                        <div key={category.category} className="relative group p-1">
                            <TabsTrigger value={category.category} className={cn("rounded-md data-[state=active]:border-primary data-[state=active]:border-2 data-[state=active]:shadow-md px-4 py-3 cursor-pointer transition-colors text-lg font-bold", statusConfig ? statusConfig.dark : (colorClass || 'bg-muted'))}>
                                <div className={cn("flex-grow text-left flex items-center gap-2 pr-12")}>
                                    <span className="truncate">{category.category}</span>
                                    {statusConfig && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/10 text-white">
                                            {statusConfig.name}
                                        </span>
                                    )}
                                </div>
                            </TabsTrigger>
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div role="button" className="p-1 rounded-md hover:bg-black/20 dark:hover:bg-white/20">
                                            <Palette className="h-4 w-4" />
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2">
                                    <div className="grid grid-cols-2 gap-1">
                                        {itemStatusNames.map((name) => (
                                            <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.category, name); }}>
                                                <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                                                {itemStatusColors[name].name}
                                            </Button>
                                        ))}
                                    </div>
                                    <Separator className="my-2" />
                                    <Button variant="ghost" size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.category, ''); }}>Reset</Button>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )
                })}
              </TabsList>
            </div>
            {filteredMenu.map(category => {
              const status = menuCategoryStatus[category.category];
              return (
              <TabsContent key={category.category} value={category.category} className={cn("m-0 rounded-lg p-2 min-h-[200px] bg-background")}>
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
            )})}
          </Tabs>
        );
      }
    return (
       <Accordion
            type="multiple"
            value={activeAccordionItems}
            onValueChange={setActiveAccordionItems}
            className="w-full space-y-2"
        >
            {filteredMenu.map(category => {
                const status = menuCategoryStatus[category.category];
                const statusConfig = status ? itemStatusColors[status] : null;
                const colorName = categoryColors[category.category];
                const colorClass = colorName ? colorPalette[colorName]?.[colorShade] : 'bg-muted';
                return (
                <AccordionItem key={category.category} value={category.category} className="border-b-0">
                     <AccordionTrigger className={cn("p-3 rounded-md text-lg font-bold hover:no-underline flex justify-between items-center relative group text-card-foreground", statusConfig ? statusConfig.dark : colorClass )}>
                        {renderCategoryHeader(category)}
                        <div className="absolute top-1/2 -translate-y-1/2 right-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div role="button" className="p-1 rounded-md hover:bg-black/10">
                                        <Palette className="h-4 w-4" />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {itemStatusNames.map((name) => (
                                        <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.category, name); }}>
                                            <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                                            {itemStatusColors[name].name}
                                        </Button>
                                    ))}
                                </div>
                                <Separator className="my-2" />
                                <Button variant="ghost" size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.category, ''); }}>Reset</Button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className={cn("p-2 space-y-2", "bg-background")}>
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
            )})}
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
      <div className="md:col-span-2 xl:col-span-3 flex flex-col h-full">
        <Card className="flex flex-col flex-grow">
          <CardHeader>
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                           <div className="relative min-w-[300px]">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                  ref={searchInputRef}
                                  placeholder="Search by name or enter code..."
                                  className="pl-10 h-10"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  onKeyDown={handleCodeEntry}
                                  onFocus={() => setKeyboardMode('order')}
                                  onBlur={() => {if(keyboardMode === 'order') setKeyboardMode('confirm')}}
                              />
                          </div>
                           <RadioGroup value={vegFilter} onValueChange={(v) => setVegFilter(v as VegFilter)} className="flex items-center gap-2">
                                <RadioGroupItem value="All" id="filter-all" className="sr-only" />
                                <Label htmlFor="filter-all" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-foreground hover:bg-accent", vegFilter === 'All' && 'ring-2 ring-primary text-primary bg-background')}>All</Label>
                                
                                <RadioGroupItem value="Veg" id="filter-veg" className="sr-only" />
                                <Label htmlFor="filter-veg" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-white bg-green-600 transition-all", vegFilter === 'Veg' && 'border-4 border-black dark:border-white ring-2 ring-offset-2 ring-green-600')}>Veg</Label>
                                
                                <RadioGroupItem value="Non-Veg" id="filter-nonveg" className="sr-only" />
                                <Label htmlFor="filter-nonveg" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-white bg-red-600 transition-all", vegFilter === 'Non-Veg' && 'border-4 border-black dark:border-white ring-2 ring-offset-2 ring-red-600')}>Non-Veg</Label>
                            </RadioGroup>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                              <Switch id="easy-mode-switch" checked={easyMode} onCheckedChange={handleEasyModeChange} />
                              <Label htmlFor="easy-mode-switch" className="flex items-center gap-2 cursor-pointer">
                                  <MousePointerClick className="mr-2 h-4 w-4" />
                                  Easy Mode
                              </Label>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                           <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center">
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="accordion" id="accordion-view" className="sr-only" />
                                  <Rows className="h-5 w-5 box-content" />
                              </Label>
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="grid" id="grid-view" className="sr-only" />
                                  <LayoutGrid className="h-5 w-5 box-content" />
                              </Label>
                          </RadioGroup>
                      </div>
                  </div>
                   <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                          <Label className="font-semibold text-sm">Shade:</Label>
                           <RadioGroup value={colorShade} onValueChange={(v) => setColorShade(v as ColorShade)} className="flex items-center">
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", colorShade === 'light' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="light" id="shade-light" className="sr-only" />
                                  Light
                              </Label>
                              <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", colorShade === 'medium' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent' )}>
                                  <RadioGroupItem value="medium" id="shade-medium" className="sr-only" />
                                  Medium
                              </Label>
                          </RadioGroup>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIsItemStatusDialogOpen(true)}>
                              <BarChart className="mr-2 h-4 w-4" /> Item Status
                          </Button>
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
              </div>
          </CardHeader>
          <ScrollArea className="flex-grow px-4">
              {renderMenuContent()}
          </ScrollArea>
        </Card>
      </div>

      <div className="md:col-span-1 xl:col-span-1 flex flex-col h-full gap-4">
          <OrderPanel
              orderItems={orderItems}
              handleDropOnOrder={handleDropOnOrder}
              updateQuantity={updateQuantity}
              removeFromOrder={removeFromOrder}
              activeOrder={activeOrder}
              selectedTableId={selectedTableId}
              clearCurrentOrder={clearCurrentOrder}
              handleQuickAssign={handleQuickAssign}
              subtotal={subtotal}
              total={total}
              discount={discount}
              setDiscount={setDiscount}
              isProcessing={isProcessing}
              handlePrintProvisionalBill={handlePrintProvisionalBill}
              handleProcessPayment={handleProcessPayment}
              receiptPreview={receiptPreview}
              kotButtons={renderKotButtons()}
              orderType={selectedOrderType}
              customerDetails={customerDetails}
              getNewItems={getNewItems}
          >
           <div className="flex items-center gap-2 flex-wrap">
                <Label className="font-semibold text-sm shrink-0 whitespace-nowrap">Order For:</Label>
                <div className="flex-grow grid grid-cols-3 gap-2">
                    <Button variant={selectedOrderType === 'Dine-In' ? 'default' : 'outline'} className="h-12 text-base" onClick={() => handleSetOrderType('Dine-In')}>
                        <Users2 className="mr-2 h-5 w-5"/>Dine-In
                    </Button>
                    <Button variant={selectedOrderType === 'Take-Away' ? 'default' : 'outline'} className="h-12 text-base" onClick={() => handleSetOrderType('Take-Away')}>
                        <ShoppingBasket className="mr-2 h-5 w-5"/>Take Away
                    </Button>
                    <Button variant={selectedOrderType === 'Home-Delivery' ? 'default' : 'outline'} className="h-12 text-base" onClick={() => handleSetOrderType('Home-Delivery')}>
                        <Bike className="mr-2 h-5 w-5"/>Delivery
                    </Button>
                </div>
            </div>

            {selectedOrderType === 'Dine-In' && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
                  {tables.map(table => {
                      const Icon = statusIcons[table.status];
                      const isSelected = table.id === selectedTableId;
                      const hasPendingItems = (pendingOrders[table.id] || []).length > 0 && table.status !== 'Occupied';
                      return (
                      <TableDropTarget key={table.id} table={table} occupancyCount={occupancyCount} handleSelectTable={setSelectedTableId} onDropItem={handleDropItemOnTable}>
                          <div
                          className={cn(
                              'absolute inset-0 flex flex-col items-center justify-center text-center transition-colors rounded-md p-1 h-full',
                              isSelected && 'ring-4 ring-offset-2 ring-black'
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
                               {showTableDetailsOnPOS && table.name && <div className="text-xs font-bold text-white mt-1 max-w-full truncate">{table.name}</div>}
                                {showTableDetailsOnPOS && table.seats && <div className="text-xs text-white flex items-center justify-center gap-1"><Armchair className="h-3 w-3" /> {table.seats}</div>}
                                {showReservationTimeOnPOS && table.status === 'Reserved' && table.reservationDetails && (
                                <div className="text-xs text-black font-bold mt-1 max-w-full truncate px-1">
                                    <p>{table.reservationDetails.time}</p>
                                    for {table.reservationDetails.name}
                                </div>
                                )}
                          </div>
                      </TableDropTarget>
                      )
                  })}
              </div>
            )}
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
      <HomeDeliveryDialog
        isOpen={isHomeDeliveryDialogOpen}
        onOpenChange={setIsHomeDeliveryDialogOpen}
        onSave={handleSaveDeliveryDetails}
        existingDetails={customerDetails}
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
      <AlertDialog open={isEasyModeAlertOpen} onOpenChange={setIsEasyModeAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Enable Easy Mode?</AlertDialogTitle>
                <AlertDialogDescription>
                    In "Easy Mode", every click on a menu item instantly adds 1 quantity to the order. This is faster but can lead to accidental clicks.
                    <br/><br/>
                    Are you sure you want to enable this mode?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEasyMode(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmEasyMode}>Enable</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ItemStatusDialog
        isOpen={isItemStatusDialogOpen}
        onOpenChange={setIsItemStatusDialogOpen}
        lowStockItems={lowStockItems}
        outOfStockItems={outOfStockItems}
      />
    </div>
  );
}








