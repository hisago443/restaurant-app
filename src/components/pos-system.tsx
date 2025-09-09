
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Minus, X, Save, FilePlus, LayoutGrid, List, Rows, ChevronsUpDown, ChevronsDownUp, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import type { MenuCategory, MenuItem, OrderItem } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';

const vegColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800';

const colorPalette = [
  'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800',
  'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800',
  'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800',
  'bg-neutral-100 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800',
  'bg-stone-100 dark:bg-stone-900/30 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800',
  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
  'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800',
  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800',
  'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800',
  'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800',
  'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
  'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800',
  'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800',
  'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
];

type ViewMode = 'accordion' | 'grid' | 'list';

export default function PosSystem() {
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

  const typedMenuData: MenuCategory[] = menuData;

  const setItemColor = (itemName: string, colorClass: string) => {
    setMenuItemColors(prev => ({ ...prev, [itemName]: colorClass }));
  };
  
  const setCategoryColor = (categoryName: string, colorClass: string) => {
    setCategoryColors(prev => ({ ...prev, [categoryName]: colorClass }));
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

  const addToOrder = (item: MenuItem, quantity = 1) => {
    const existingItem = orderItems.find(orderItem => orderItem.name === item.name);
    if (existingItem) {
      updateQuantity(item.name, existingItem.quantity + quantity);
    } else {
      setOrderItems([...orderItems, { ...item, quantity }]);
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
  
  const clearOrder = () => {
    setOrderItems([]);
    setDiscount(0);
    toast({ title: "New Bill", description: "Current order cleared." });
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
    // Here you would typically save the order to the backend
    clearOrder();
  };

  const renderMenuItem = (item: MenuItem, subCategoryName: string, categoryName: string) => {
    const defaultColor = subCategoryName.toLowerCase().includes('veg') ? vegColor : nonVegColor;
    const categoryColor = categoryColors[categoryName];
    const itemColor = menuItemColors[item.name];
    const finalColor = categoryColor || itemColor || defaultColor;

    return (
      <Card
        key={item.name}
        className={cn("group rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md relative", finalColor)}
        onClick={() => isClickToAdd && addToOrder(item, 1)}
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
            <div className="grid grid-cols-8 gap-1">
              {colorPalette.map((colorClass, i) => (
                <div
                  key={i}
                  className={cn("h-6 w-6 rounded-full cursor-pointer", colorClass.split(' ')[0])}
                  onClick={() => setItemColor(item.name, colorClass)}
                />
              ))}
              <Button variant="ghost" size="sm" className="col-span-8 h-8" onClick={() => setItemColor(item.name, '')}>Reset</Button>
            </div>
          </PopoverContent>
        </Popover>
        <CardContent className="p-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', subCategoryName.toLowerCase().includes('veg') ? 'bg-green-500' : 'bg-red-500')}></span>
              <span className="font-semibold pr-2">{item.name}</span>
            </div>
            <span className="font-mono text-right whitespace-nowrap">Rs.{item.price.toFixed(2)}</span>
          </div>
          {!isClickToAdd && (
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); addToOrder(item); }}>Add to Order</Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
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
        <div className="grid grid-cols-8 gap-1">
          {colorPalette.map((colorClass, i) => (
            <div
              key={i}
              className={cn("h-6 w-6 rounded-full cursor-pointer", colorClass.split(' ')[0])}
              onClick={() => setCategoryColor(categoryName, colorClass)}
            />
          ))}
           <Button variant="ghost" size="sm" className="col-span-8 h-8" onClick={() => setCategoryColor(categoryName, '')}>Reset</Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderMenuContent = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-6">
          {filteredMenu.map((category) => (
            <div key={category.category}>
              <h2 className={cn("text-xl font-bold mb-4 sticky top-0 bg-background py-2 z-10 flex items-center gap-2 p-2 rounded-md", categoryColors[category.category])}>
                {category.category}
                <CategoryColorPicker categoryName={category.category} />
              </h2>
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
            </div>
          ))}
        </div>
      );
    }
    if (viewMode === 'grid') {
      return (
        <Tabs defaultValue={filteredMenu[0]?.category} className="w-full">
          <TabsList className="mb-4">
            {filteredMenu.map(category => (
               <TabsTrigger key={category.category} value={category.category} className={cn("flex items-center gap-2", categoryColors[category.category])}>
                {category.category}
                <CategoryColorPicker categoryName={category.category} />
              </TabsTrigger>
            ))}
          </TabsList>
          {filteredMenu.map(category => (
             <TabsContent key={category.category} value={category.category}>
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
      <Accordion type="multiple" value={activeAccordionItems} onValueChange={setActiveAccordionItems} className="w-full">
        {filteredMenu.map((category) => (
          <AccordionItem key={category.category} value={category.category} className={cn(categoryColors[category.category])}>
            <div className="flex items-center p-2">
              <AccordionTrigger className="text-xl font-bold hover:no-underline flex-grow">
                {category.category}
              </AccordionTrigger>
              <CategoryColorPicker categoryName={category.category} />
            </div>
            <AccordionContent>
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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] gap-4 p-4">
      {/* Left Panel: Menu */}
      <Card className="flex-[3] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center">
                  <Label htmlFor="accordion-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", { 'bg-primary text-primary-foreground': viewMode === 'accordion', 'hover:bg-accent': viewMode !== 'accordion' })}>
                    <List className="h-5 w-5 box-content" />
                  </Label>
                  <RadioGroupItem value="accordion" id="accordion-view" className="sr-only" />

                  <Label htmlFor="grid-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", { 'bg-primary text-primary-foreground': viewMode === 'grid', 'hover:bg-accent': viewMode !== 'grid' })}>
                    <LayoutGrid className="h-5 w-5 box-content" />
                  </Label>
                  <RadioGroupItem value="grid" id="grid-view" className="sr-only" />

                  <Label htmlFor="list-view" className={cn("p-1.5 rounded-md cursor-pointer transition-colors", { 'bg-primary text-primary-foreground': viewMode === 'list', 'hover:bg-accent': viewMode !== 'list' })}>
                    <Rows className="h-5 w-5 box-content" />
                  </Label>
                  <RadioGroupItem value="list" id="list-view" className="sr-only" />
              </RadioGroup>
              <Separator orientation="vertical" className="h-8" />
               {viewMode === 'accordion' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveAccordionItems(filteredMenu.map(c => c.category))}>
                    <ChevronsDownUp className="mr-2 h-4 w-4" /> Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveAccordionItems([])}>
                    <ChevronsUpDown className="mr-2 h-4 w-4" /> Collapse All
                  </Button>
                </div>
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
      <Card className="flex-[1] flex flex-col">
        <CardHeader>
          <CardTitle>Current Order</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-grow p-4 pt-0">
          {orderItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No items in order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderItems.map(item => (
                <div key={item.name} className="flex items-center">
                  <div className="flex-grow">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Rs.{item.price.toFixed(2)}</p>
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
        <Separator />
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="font-semibold mb-2 block">Discount</Label>
            <RadioGroup value={discount.toString()} onValueChange={(val) => setDiscount(Number(val))} className="flex space-x-1 sm:space-x-0 sm:grid sm:grid-cols-3 gap-2">
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
            
            <Button variant="secondary" disabled><Save />Save Order</Button>
          </div>
        </CardContent>
      </Card>
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        total={total}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
