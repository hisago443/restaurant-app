
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
import type { MenuCategory, MenuItem } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemType, setNewItemType] = useState<'Veg' | 'Non-Veg'>('Veg');
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState('');

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
  
  const handleAddItem = () => {
    if (!newItemName || !newItemPrice || !selectedCategoryForItem) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
    
    setMenu(prevMenu => {
      return prevMenu.map(cat => {
        if (cat.category === selectedCategoryForItem) {
          const subCategoryName = newItemType;
          let subCategoryExists = cat.subCategories.some(sub => sub.name === subCategoryName);

          // Find or create the sub-category
          let updatedSubCategories = [...cat.subCategories];
          let targetSubCategoryIndex = updatedSubCategories.findIndex(sub => sub.name === subCategoryName);

          if (targetSubCategoryIndex === -1) {
            // Create sub-category if it doesn't exist
            updatedSubCategories.push({ name: subCategoryName, items: [] });
            targetSubCategoryIndex = updatedSubCategories.length - 1;
          }

          // Check if item already exists in the sub-category
          if (updatedSubCategories[targetSubCategoryIndex].items.some(item => item.name.toLowerCase() === newItemName.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Item already exists in this sub-category' });
            return cat;
          }

          // Add the new item
          updatedSubCategories[targetSubCategoryIndex].items.push({ name: newItemName, price: parseFloat(newItemPrice) });
          
          return {
            ...cat,
            subCategories: updatedSubCategories,
          };
        }
        return cat;
      });
    });

    setNewItemName('');
    setNewItemPrice('');
    setSelectedCategoryForItem('');
    toast({ title: `Item "${newItemName}" added to ${newItemType}.` });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Menu</DialogTitle>
          <DialogDescription>
            Add new categories and items to your menu.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1">
          <Accordion type="multiple" defaultValue={['add-item']} className="w-full space-y-4">
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
            
            {/* Add Item */}
            <AccordionItem value="add-item">
              <AccordionTrigger className="text-lg font-semibold">Add New Menu Item</AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/50 rounded-b-md space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="select-category">Category</Label>
                      <Select value={selectedCategoryForItem} onValueChange={setSelectedCategoryForItem}>
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
                      <Label>Item Type</Label>
                      <RadioGroup defaultValue="Veg" value={newItemType} onValueChange={(value: 'Veg' | 'Non-Veg') => setNewItemType(value)} className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Veg" id="veg-item" />
                            <Label htmlFor="veg-item">Veg</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Non-Veg" id="non-veg-item" />
                            <Label htmlFor="non-veg-item">Non-Veg</Label>
                        </div>
                      </RadioGroup>
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
