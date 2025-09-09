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
import { Search, Plus, Minus, X, Save, FilePlus, LayoutGrid, List, Rows, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { MenuCategory, MenuItem, OrderItem } from '@/lib/types';
import menuData from '@/data/menu.json';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { PaymentDialog } from './payment-dialog';

const vegColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800';

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

  const typedMenuData: MenuCategory[] = menuData;

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

  const renderMenuItem = (item: MenuItem, subCategoryName: string) => (
    <Card
      key={item.name}
      className={cn("rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md",
      subCategoryName.toLowerCase().includes('veg') ? vegColor : nonVegColor)}
      onClick={() => isClickToAdd && addToOrder(item, 1)}
    >
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
            <Button size="sm" variant="secondary" onClick={() => addToOrder(item)}>Add to Order</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMenuContent = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-6">
          {filteredMenu.map((category) => (
            <div key={category.category}>
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-background py-2 z-10">{category.category}</h2>
              <div className="space-y-4">
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name))}
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
              <TabsTrigger key={category.category} value={category.category}>{category.category}</TabsTrigger>
            ))}
          </TabsList>
          {filteredMenu.map(category => (
             <TabsContent key={category.category} value={category.category}>
               <div className="space-y-4">
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name))}
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
            <AccordionTrigger className="text-xl font-bold hover:no-underline">
              {category.category}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {category.subCategories.map((subCategory) => (
                  <div key={subCategory.name}>
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground pl-2">{subCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {subCategory.items.map((item) => renderMenuItem(item, subCategory.name))}
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
               <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center p-1 bg-muted rounded-md">
                <RadioGroupItem value="accordion" id="accordion-view" className="peer sr-only" />
                <Label htmlFor="accordion-view" className="p-1.5 rounded-md transition-colors hover:bg-accent cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                  <List className="h-5 w-5" />
                </Label>
                <RadioGroupItem value="grid" id="grid-view" className="peer sr-only"/>
                <Label htmlFor="grid-view" className="p-1.5 rounded-md transition-colors hover:bg-accent cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                   <LayoutGrid className="h-5 w-5" />
                </Label>
                <RadioGroupItem value="list" id="list-view" className="peer sr-only"/>
                <Label htmlFor="list-view" className="p-1.5 rounded-md transition-colors hover:bg-accent cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                   <Rows className="h-5 w-5" />
                </Label>
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
