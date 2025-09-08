"use client"

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const initialInventory = [
  { id: 'I001', name: 'Coffee Beans', stock: 50, capacity: 100, unit: 'kg' },
  { id: 'I002', name: 'Milk', stock: 20, capacity: 50, unit: 'liters' },
  { id: 'I003', name: 'All-Purpose Flour', stock: 30, capacity: 50, unit: 'kg' },
  { id: 'I004', name: 'Chicken Breast', stock: 15, capacity: 40, unit: 'kg' },
  { id: 'I005', name: 'Tomatoes', stock: 25, capacity: 30, unit: 'kg' },
];

function InventoryRow({ item, onStockChange, onSetStock }: { item: typeof initialInventory[0], onStockChange: (id: string, amount: number) => void, onSetStock: (id: string, amount: number) => void }) {
  const [customValue, setCustomValue] = useState<string>("");

  const handleSetStock = () => {
    const value = parseInt(customValue, 10);
    if (!isNaN(value)) {
      onSetStock(item.id, value);
      setCustomValue("");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress
            value={(item.stock / item.capacity) * 100}
            className="w-40 h-3"
          />
          <span>{item.stock} / {item.capacity} {item.unit}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onStockChange(item.id, -5)}>-5</Button>
            <Button size="sm" variant="outline" onClick={() => onStockChange(item.id, -1)}>-1</Button>
            <Button size="sm" variant="outline" onClick={() => onStockChange(item.id, 1)}>+1</Button>
            <Button size="sm" variant="secondary" onClick={() => onStockChange(item.id, 5)}>+5</Button>
            <div className="flex w-full max-w-xs items-center space-x-2">
              <Input
                type="number"
                placeholder="Set stock"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="h-9 w-24"
              />
              <Button size="sm" onClick={handleSetStock}>Set</Button>
            </div>
        </div>
      </TableCell>
    </TableRow>
  );
}


export default function InventoryManagement() {
  const [inventory, setInventory] = useState(initialInventory);

  const handleStockChange = (id: string, amount: number) => {
    setInventory(inventory.map(item =>
      item.id === id ? { ...item, stock: Math.max(0, Math.min(item.capacity, item.stock + amount)) } : item
    ));
  };
  
  const handleSetStock = (id: string, amount: number) => {
     setInventory(inventory.map(item =>
      item.id === id ? { ...item, stock: Math.max(0, Math.min(item.capacity, amount)) } : item
    ));
  }

  return (
    <Card className="border-none shadow-none">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <InventoryRow key={item.id} item={item} onStockChange={handleStockChange} onSetStock={handleSetStock} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
