
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
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
import type { MenuCategory, MenuItem, MenuItemHistory, IngredientItem, InventoryItem } from '@/lib/types';
import { PlusCircle, Trash2, Edit, History, FilePlus, Upload, Camera, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { saveMenu } from '@/lib/menu-saver';
import { ScrollArea } from './ui/scroll-area';

interface EditIngredientsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem;
  inventory: InventoryItem[];
  onSave: (itemName: string, newIngredients: IngredientItem[]) => void;
}

function EditIngredientsDialog({ isOpen, onOpenChange, menuItem, inventory, onSave }: EditIngredientsDialogProps) {
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<IngredientItem['unit']>('g');
  
  useEffect(() => {
    if (isOpen) {
      setIngredients(menuItem.ingredients || []);
      setSelectedIngredient('');
      setQuantity('');
      setUnit('g');
    }
  }, [isOpen, menuItem]);

  const handleAddIngredient = () => {
    if (!selectedIngredient || !quantity) {
      alert("Please select an ingredient and enter a quantity.");
      return;
    }
    const newIngredient: IngredientItem = {
      inventoryItemId: selectedIngredient,
      quantity: parseFloat(quantity),
      unit: unit,
    };
    setIngredients([...ingredients, newIngredient]);
    setSelectedIngredient('');
    setQuantity('');
  };

  const handleRemoveIngredient = (inventoryItemId: string, unit: string) => {
    setIngredients(ingredients.filter(ing => !(ing.inventoryItemId === inventoryItemId && ing.unit === unit)));
  };
  
  const handleSaveIngredients = () => {
    onSave(menuItem.name, ingredients);
    onOpenChange(false);
  }

  const recipeUnits: IngredientItem['unit'][] = ['g', 'ml', 'pcs', 'kg', 'ltr'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Ingredients for "{menuItem.name}"</DialogTitle>
          <DialogDescription className="italic text-primary">
            Defining ingredients helps you track inventory and know the status of your stock.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Current Ingredients</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
              {ingredients.length > 0 ? ingredients.map((ingredient, index) => {
                const inventoryItem = inventory.find(i => i.id === ingredient.inventoryItemId);
                return (
                  <div key={`${ingredient.inventoryItemId}-${index}`} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <div>
                      <span className="font-medium">{inventoryItem?.name || 'Unknown Item'}</span>
                      <span className="text-sm text-muted-foreground ml-2">({ingredient.quantity} {ingredient.unit})</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveIngredient(ingredient.inventoryItemId, ingredient.unit)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }) : (
                <p className="text-sm text-muted-foreground text-center p-4">No ingredients in this recipe yet.</p>
              )}
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2">Add New Ingredient</h4>
            <div className="flex items-end gap-2">
              <div className="flex-grow space-y-1">
                <Label htmlFor="ingredient-select">Ingredient</Label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger id="ingredient-select">
                    <SelectValue placeholder="Select from inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(invItem => (
                      <SelectItem key={invItem.id} value={invItem.id}>{invItem.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ingredient-quantity">Quantity</Label>
                <Input
                  id="ingredient-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  className="w-24"
                />
              </div>
               <div className="space-y-1">
                <Label htmlFor="ingredient-unit">Unit</Label>
                <Select value={unit} onValueChange={(value) => setUnit(value as IngredientItem['unit'])}>
                    <SelectTrigger id="ingredient-unit" className="w-[80px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {recipeUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddIngredient}><PlusCircle className="mr-2 h-4 w-4"/>Add</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip for Now</Button>
          <Button onClick={handleSaveIngredients}>Save Ingredients</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem;
  onSave: (oldName: string, newItem: MenuItem) => void;
}

function EditItemDialog({ isOpen, onOpenChange, item, onSave }: EditItemDialogProps) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));

  useEffect(() => {
    setName(item.name);
    setPrice(String(item.price));
  }, [item]);

  const handleSave = () => {
    if (name && price) {
        const historyEntry: MenuItemHistory = {
            name: item.name,
            price: item.price,
            changedAt: new Date(),
        };

        const updatedItem: MenuItem = {
            ...item,
            name,
            price: parseFloat(price),
            history: [...(item.history || []), historyEntry],
        };

        onSave(item.name, updatedItem);
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details for "{item.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-name">Item Name</Label>
            <Input id="edit-item-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-item-price">Price</Label>
            <Input id="edit-item-price" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2"><History className="h-4 w-4"/> Change History</h4>
            {item.history && item.history.length > 0 ? (
                 <div className="max-h-40 overflow-y-auto space-y-2 text-sm text-muted-foreground pr-2">
                    {item.history.slice().reverse().map((record, index) => (
                        <div key={index} className="p-2 bg-muted/50 rounded-md">
                            <p><strong>Name:</strong> {record.name}, <strong>Price:</strong> Rs. {record.price}</p>
                            <p className="text-xs">{format(new Date(record.changedAt), "PPP p")}</p>
                        </div>
                    ))}
                 </div>
            ) : (
                <p className="text-sm text-muted-foreground">No previous edits recorded.</p>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


interface ManageMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuCategory[];
  setMenu: (menu: MenuCategory[]) => void;
  inventory: InventoryItem[];
}

export function ManageMenuDialog({
  isOpen,
  onOpenChange,
  menu,
  setMenu,
  inventory,
}: ManageMenuDialogProps) {
  const { toast } = useToast();
  
  const [newCategory, setNewCategory] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedCategoryForItem, setSelectedCategoryForItem] = useState('');
  const [editMenuSearch, setEditMenuSearch] = useState('');
  const [editingItem, setEditingItem] = useState<{ categoryName: string; item: MenuItem } | null>(null);
  const [editingIngredients, setEditingIngredients] = useState<MenuItem | null>(null);

  const updateAndSaveMenu = async (newMenuData: MenuCategory[]) => {
    setMenu(newMenuData);
    await saveMenu(newMenuData);
  };

  const handleAddCategory = () => {
    if (!newCategory) {
      toast({ variant: 'destructive', title: 'Category name is required' });
      return;
    }
    if (menu.some(cat => cat.category.toLowerCase() === newCategory.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Category already exists' });
        return;
    }
    const newMenu = [
      ...menu,
      { category: newCategory, items: [] },
    ];
    updateAndSaveMenu(newMenu);
    setNewCategory('');
    toast({ title: `Category "${newCategory}" added.` });
  };
  
  const handleAddItem = () => {
    if (!newItemName || !newItemPrice || !selectedCategoryForItem) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
    
    let itemExists = false;
    let newMenu = [...menu];

    const categoryIndex = newMenu.findIndex(cat => cat.category === selectedCategoryForItem);
    if (categoryIndex === -1) return;

    if (newMenu[categoryIndex].items.some(item => item.name.toLowerCase() === newItemName.toLowerCase())) {
        itemExists = true;
    }

    if (itemExists) {
        toast({ variant: 'destructive', title: 'Item already exists in this category' });
        return;
    }

    const allItems = newMenu.flatMap(c => c.items);
    const maxCode = allItems.reduce((max, item) => {
        const codeNum = parseInt(item.code, 10);
        return !isNaN(codeNum) && codeNum > max ? codeNum : max;
    }, 0);
    const newCode = (maxCode + 1).toString();

    const newItem: MenuItem = { name: newItemName, price: parseFloat(newItemPrice), code: newCode, history: [], ingredients: [] };
    newMenu[categoryIndex].items.push(newItem);
    
    updateAndSaveMenu(newMenu).then(() => {
        // Find the newly added item in the updated menu state
        const updatedMenu = [...newMenu]; // Use the same structure
        const cat = updatedMenu.find(c => c.category === selectedCategoryForItem);
        const addedItem = cat?.items.find(i => i.name === newItemName);
        if (addedItem) {
            setEditingIngredients(addedItem);
        }
    });

    setNewItemName('');
    setNewItemPrice('');
    // Keep category selected for faster multi-item entry
    // setSelectedCategoryForItem('');
    toast({ title: `Item "${newItemName}" added.` });
  };

  const handleEditItem = (oldName: string, newItem: MenuItem) => {
    if (!editingItem) return;

    const newMenu = menu.map(cat => {
      if (cat.category === editingItem.categoryName) {
        return {
          ...cat,
          items: cat.items.map(item => item.name === oldName ? newItem : item)
        };
      }
      return cat;
    });

    updateAndSaveMenu(newMenu);
    setEditingItem(null);
    toast({ title: "Item Updated" });
  };

  const handleSaveIngredients = (itemName: string, newIngredients: IngredientItem[]) => {
    const newMenu = menu.map(cat => ({
      ...cat,
      items: cat.items.map(item => item.name === itemName ? { ...item, ingredients: newIngredients } : item)
    }));
    updateAndSaveMenu(newMenu);
    toast({ title: `Ingredients for ${itemName} updated!` });
  };
  
  const handleRemoveItem = (categoryName: string, itemName: string) => {
    let newMenu = menu.map(cat => {
      if (cat.category === categoryName) {
        return { ...cat, items: cat.items.filter(item => item.name !== itemName) };
      }
      return cat;
    });
    
    // This is optional: remove category if it becomes empty
    // newMenu = newMenu.filter(cat => cat.items.length > 0);
    
    updateAndSaveMenu(newMenu);
    toast({ title: `Item "${itemName}" removed.` });
  };

  const handleRemoveCategory = (categoryName: string) => {
    const newMenu = menu.filter(cat => cat.category !== categoryName);
    updateAndSaveMenu(newMenu);
    toast({ title: `Category "${categoryName}" removed.` });
  };

  const filteredMenuForEditing = useMemo(() => {
    if (!editMenuSearch) return menu;
    const lowercasedTerm = editMenuSearch.toLowerCase();

    return menu.map(category => {
      if (category.category.toLowerCase().includes(lowercasedTerm)) {
        return category;
      }
      const filteredItems = category.items.filter(item =>
        item.name.toLowerCase().includes(lowercasedTerm)
      );

      if (filteredItems.length > 0) {
        return { ...category, items: filteredItems };
      }
      return null;
    }).filter(Boolean) as MenuCategory[];
  }, [editMenuSearch, menu]);
  

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <DialogTitle>Manage Menu</DialogTitle>
                        <DialogDescription>
                            Add, edit, and organize your menu categories, items, and ingredients.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto p-1">
              <Accordion type="multiple" defaultValue={['add-category', 'add-item', 'edit-menu']} className="w-full space-y-4">
                
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
                  <AccordionTrigger className="text-lg font-semibold">
                    Edit Menu &amp; Ingredients
                  </AccordionTrigger>
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
                                  <ul className="mt-1 space-y-1">
                                      {cat.items.map(item => (
                                          <li 
                                            key={item.name} 
                                            className={cn("flex justify-between items-center group p-1 rounded-md")}
                                          >
                                              <span>{item.name} - <span className="font-mono">₹{item.price}</span></span>
                                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem({ categoryName: cat.category, item })}>
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIngredients(item)}>
                                                      <FilePlus className="h-4 w-4" />
                                                  </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
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
                                                                <AlertDialogAction onClick={() => handleRemoveItem(cat.category, item.name)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                              </div>
                                          </li>
                                      ))}
                                  </ul>
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
      {editingItem && (
        <EditItemDialog
          isOpen={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem.item}
          onSave={handleEditItem}
        />
      )}
      {editingIngredients && (
        <EditIngredientsDialog
            isOpen={!!editingIngredients}
            onOpenChange={(open) => !open && setEditingIngredients(null)}
            menuItem={editingIngredients}
            inventory={inventory}
            onSave={handleSaveIngredients}
        />
      )}
    </>
  );
}
    

    

    