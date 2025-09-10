
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuSubCategory, MenuItem } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface ManageMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuCategory[];
  setMenu: React.Dispatch<React.SetStateAction<MenuCategory[]>>;
}

export function ManageMenuDialog({
  isOpen,
  onOpenChange,
  menu,
  setMenu,
}: ManageMenuDialogProps) {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState('');
  const [selectedSubCategoryForItem, setSelectedSubCategoryForItem] = useState('');

  const handleAddCategory = () => {
    if (!newCategory) {
      toast({ variant: 'destructive', title: 'Category name is required' });
      return;
    }
    if (menu.some(cat => cat.category.toLowerCase() === newCategory.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Category already exists' });
        return;
    }
    setMenu(prevMenu => [
      ...prevMenu,
      { category: newCategory, subCategories: [] },
    ]);
    setNewCategory('');
    toast({ title: `Category "${newCategory}" added.` });
  };
  
  const handleAddSubCategory = () => {
    if (!newSubCategory || !selectedCategoryForSub) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
    setMenu(prevMenu =>
      prevMenu.map(cat => {
        if (cat.category === selectedCategoryForSub) {
           if (cat.subCategories.some(sub => sub.name.toLowerCase() === newSubCategory.toLowerCase())) {
                toast({ variant: 'destructive', title: 'Sub-category already exists in this category' });
                return cat;
            }
          return {
            ...cat,
            subCategories: [...cat.subCategories, { name: newSubCategory, items: [] }],
          };
        }
        return cat;
      })
    );
    setNewSubCategory('');
    setSelectedCategoryForSub('');
    toast({ title: `Sub-category "${newSubCategory}" added.` });
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice || !selectedCategoryForItem || !selectedSubCategoryForItem) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
    setMenu(prevMenu =>
      prevMenu.map(cat => {
        if (cat.category === selectedCategoryForItem) {
          return {
            ...cat,
            subCategories: cat.subCategories.map(sub => {
              if (sub.name === selectedSubCategoryForItem) {
                 if (sub.items.some(item => item.name.toLowerCase() === newItemName.toLowerCase())) {
                    toast({ variant: 'destructive', title: 'Item already exists in this sub-category' });
                    return sub;
                 }
                return {
                  ...sub,
                  items: [...sub.items, { name: newItemName, price: parseFloat(newItemPrice) }],
                };
              }
              return sub;
            }),
          };
        }
        return cat;
      })
    );
    setNewItemName('');
    setNewItemPrice('');
    setSelectedCategoryForItem('');
    setSelectedSubCategoryForItem('');
    toast({ title: `Item "${newItemName}" added.` });
  };
  
  const subCategoryOptions = menu.find(c => c.category === selectedCategoryForItem)?.subCategories || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Menu</DialogTitle>
          <DialogDescription>
            Add new categories, sub-categories, and items to your menu.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1">
          <Accordion type="multiple" className="w-full space-y-4">
            {/* Add Category */}
            <AccordionItem value="add-category">
              <AccordionTrigger className="text-lg font-semibold">Add New Category</AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/50 rounded-b-md">
                <div className="flex items-end gap-2">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="new-category">Category Name</Label>
                    <Input
                      id="new-category"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      placeholder="e.g., Desserts"
                    />
                  </div>
                  <Button onClick={handleAddCategory}><PlusCircle className="mr-2 h-4 w-4"/> Add Category</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            
             {/* Add Sub-Category */}
            <AccordionItem value="add-sub-category">
              <AccordionTrigger className="text-lg font-semibold">Add New Sub-Category</AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/50 rounded-b-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1 col-span-1">
                        <Label htmlFor="select-category-for-sub">Parent Category</Label>
                         <Select value={selectedCategoryForSub} onValueChange={setSelectedCategoryForSub}>
                          <SelectTrigger id="select-category-for-sub">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {menu.map(cat => (
                              <SelectItem key={cat.category} value={cat.category}>
                                {cat.category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1 col-span-1">
                        <Label htmlFor="new-sub-category">Sub-Category Name</Label>
                        <Input
                          id="new-sub-category"
                          value={newSubCategory}
                          onChange={e => setNewSubCategory(e.target.value)}
                          placeholder="e.g., Vegan"
                        />
                    </div>
                     <Button onClick={handleAddSubCategory} className="self-end"><PlusCircle className="mr-2 h-4 w-4"/>Add Sub-Category</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Add Item */}
            <AccordionItem value="add-item">
              <AccordionTrigger className="text-lg font-semibold">Add New Menu Item</AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/50 rounded-b-md space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="select-category">Category</Label>
                      <Select value={selectedCategoryForItem} onValueChange={cat => {
                          setSelectedCategoryForItem(cat);
                          setSelectedSubCategoryForItem('');
                      }}>
                        <SelectTrigger id="select-category">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {menu.map(cat => (
                            <SelectItem key={cat.category} value={cat.category}>
                              {cat.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-1">
                      <Label htmlFor="select-sub-category">Sub-Category</Label>
                      <Select value={selectedSubCategoryForItem} onValueChange={setSelectedSubCategoryForItem} disabled={!selectedCategoryForItem}>
                        <SelectTrigger id="select-sub-category">
                          <SelectValue placeholder="Select Sub-Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategoryOptions.map(sub => (
                            <SelectItem key={sub.name} value={sub.name}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <Label htmlFor="new-item-name">Item Name</Label>
                      <Input
                        id="new-item-name"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder="e.g., Chocolate Lava Cake"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-item-price">Price</Label>
                      <Input
                        id="new-item-price"
                        type="number"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(e.target.value)}
                        placeholder="e.g., 150"
                      />
                    </div>
                    <Button onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
