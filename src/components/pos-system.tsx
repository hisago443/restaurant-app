
"use client";

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
import { Search, Plus, Minus, X, Save, FilePlus, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddItemDialog } from './add-item-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface PosSystemProps {
  tables: Table[];
  addOrder: (order: Omit<Order, 'id' | 'status'>) => void;
}

export default function PosSystem({ tables, addOrder }: PosSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isClickToAdd, setIsClickToAdd] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');
  const [menuItemColors, setMenuItemColors] = useState<Record<string, string>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const typedMenuData: MenuCategory[] = menuData;

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
  
  const clearOrder = () => {
    setOrderItems([]);
    setDiscount(0);
    setSelectedTable(null);
    toast({ title: "New Bill", description: "Current order cleared." });
  };

  const handleSendToKitchen = () => {
    if (orderItems.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Order', description: 'Cannot send an empty order to the kitchen.' });
      return;
    }
    if (!selectedTable) {
      toast({ variant: 'destructive', title: 'No Table Selected', description: 'Please select a table before sending to the kitchen.' });
      return;
    }

    const orderPayload = {
      items: orderItems,
      tableId: Number(selectedTable),
    };
    addOrder(orderPayload);
    
    toast({ title: 'Order Sent!', description: `KOT sent to the kitchen for Table ${selectedTable}.` });
    // You might want to clear the order here or keep it for billing
    // clearOrder(); // Uncomment if the order should be cleared after sending
  };

  const handleProcessPayment = () => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Order", description: "Cannot process payment for an empty order." });
      return;
    }
    setIsPaymentDialogOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    toast({ title: "Payment Successful", description: `Payment of Rs.${total.toFixed(2)} confirmed.` });
    clearOrder();
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
              <div className={cn("sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10 flex items-center justify-between gap-2 p-2 rounded-md")}>
                <div className="flex-1" />
                <h2 className="text-xl font-bold text-center flex-grow">
                  {category.category}
                </h2>
                <div className="flex-1 flex justify-end">
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
        <Tabs defaultValue={filteredMenu[0]?.category} className="w-full">
          <div className="flex justify-center">
            <TabsList className="mb-4">
              {filteredMenu.map(category => (
                <TabsTrigger key={category.category} value={category.category} asChild>
                    <div className="relative p-2 rounded-sm cursor-pointer">
                        <span className={cn(categoryColors[category.category] && 'text-black')}>{category.category}</span>
                         <div className={cn("absolute inset-0 -z-10 rounded-sm", categoryColors[category.category])}/>
                        <div className="absolute top-0 right-0">
                            <CategoryColorPicker categoryName={category.category} />
                        </div>
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
          <AccordionItem key={category.category} value={category.category}>
            <div className={cn("border-b-0 rounded-lg mb-2 overflow-hidden", categoryColors[category.category])}>
              <div className="flex items-center p-4">
                  <AccordionTrigger className="flex-1 text-xl font-bold text-black justify-center relative hover:no-underline p-0">
                    <span className="text-center">{category.category}</span>
                  </AccordionTrigger>
                  <div className='flex items-center gap-2 pl-4'>
                    <CategoryColorPicker categoryName={category.category} />
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
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
            </div>
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
          <CardTitle>Current Order</CardTitle>
          <div className="pt-2">
            <Label htmlFor="table-select">Select Table</Label>
            <Select value={selectedTable ?? ''} onValueChange={setSelectedTable}>
                <SelectTrigger id="table-select">
                    <SelectValue placeholder="Select a table..." />
                </SelectTrigger>
                <SelectContent>
                    {tables.map(table => (
                        <SelectItem key={table.id} value={table.id.toString()}>Table {table.id} ({table.status})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button size="lg" onClick={handleProcessPayment}>
                Process Payment
              </Button>
              
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button size="lg" variant="outline"><FilePlus />New Bill</Button>
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
                          <AlertDialogAction onClick={clearOrder}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
            <Button size="lg" variant="secondary" className="w-full" onClick={handleSendToKitchen}>
                <Send className="mr-2 h-4 w-4" /> Send KOT to Kitchen
              </Button>
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

    