
"use client";

import { useState, useMemo } from 'react';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
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
  const [editMenuSearch, setEditMenuSearch] = useState('');

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
  
  const handleRemoveItem = (categoryName: string, subCategoryName: string, itemName: string) => {
    setMenu(prevMenu => {
      const newMenu = prevMenu.map(cat => {
        if (cat.category === categoryName) {
          const newSubCategories = cat.subCategories.map(subCat => {
            if (subCat.name === subCategoryName) {
              const newItems = subCat.items.filter(item => item.name !== itemName);
              return { ...subCat, items: newItems };
            }
            return subCat;
          }).filter(subCat => subCat.items.length > 0); // Remove subcategory if it becomes empty
          
          // If after removing the item, the category has no more subcategories, it will be filtered out later.
          return { ...cat, subCategories: newSubCategories };
        }
        return cat;
      });
      // Important: We need to decide if an empty category should be removed.
      // If a category has no subcategories, it might be better to keep it,
      // so the user can add items to it later.
      // However, if we filter empty subcategories, it makes sense to filter empty categories too.
      // Let's filter categories that become completely empty (no items in any subcategory).
      return newMenu.filter(cat => cat.subCategories.some(sub => sub.items.length > 0));
    });
    toast({ title: `Item "${itemName}" removed.` });
  };

  const handleRemoveCategory = (categoryName: string) => {
    setMenu(prevMenu => prevMenu.filter(cat => cat.category !== categoryName));
    toast({ title: `Category "${categoryName}" removed.` });
  };

  const filteredMenuForEditing = useMemo(() => {
    if (!editMenuSearch) return menu;
    const lowercasedTerm = editMenuSearch.toLowerCase();

    return menu.map(category => {
      if (category.category.toLowerCase().includes(lowercasedTerm)) {
        return category;
      }
      const filteredSubCategories = category.subCategories
        .map(subCategory => {
          if (subCategory.name.toLowerCase().includes(lowercasedTerm)) {
            return subCategory;
          }
          const filteredItems = subCategory.items.filter(item =>
            item.name.toLowerCase().includes(lowercasedTerm)
          );
          if (filteredItems.length > 0) {
            return { ...subCategory, items: filteredItems };
          }
          return null;
        })
        .filter(Boolean);

      if (filteredSubCategories.length > 0) {
        return { ...category, subCategories: filteredSubCategories as any };
      }
      return null;
    }).filter(Boolean) as MenuCategory[];
  }, [editMenuSearch, menu]);

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

             {/* Edit/Remove Menu */}
            <AccordionItem value="edit-menu">
              <AccordionTrigger className="text-lg font-semibold">Edit Menu</AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/50 rounded-b-md space-y-4">
                  <Input
                    placeholder="Search for an item or category to edit..."
                    value={editMenuSearch}
                    onChange={(e) => setEditMenuSearch(e.target.value)}
                    className="mb-4"
                  />
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                      {filteredMenuForEditing.map(cat => (
                          <div key={cat.category} className="p-3 border rounded-md bg-background/50">
                              <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">{cat.category}</h3>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the entire category "{cat.category}" and all items within it. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveCategory(cat.category)}>Delete Category</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              <div className="space-y-2 mt-2">
                                {cat.subCategories.map(subCat => (
                                    <div key={subCat.name} className="pl-4">
                                        <h4 className="font-semibold text-muted-foreground">{subCat.name}</h4>
                                        <ul className="mt-1 space-y-1">
                                            {subCat.items.map(item => (
                                                <li key={item.name} className="flex justify-between items-center group p-1 rounded-md hover:bg-muted">
                                                    <span>{item.name} - <span className="font-mono">₹{item.price}</span></span>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete the item "{item.name}". This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRemoveItem(cat.category, subCat.name, item.name)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                              </div>
                          </div>
                      ))}
                      {filteredMenuForEditing.length === 0 && (
                          <p className="text-center text-muted-foreground">No items match your search.</p>
                      )}
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
