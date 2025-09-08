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

export default function InventoryManagement() {
  const [inventory, setInventory] = useState(initialInventory);
  
  const handleStockChange = (id: string, amount: number) => {
    setInventory(inventory.map(item =>
      item.id === id ? { ...item, stock: Math.max(0, Math.min(item.capacity, item.stock + amount)) } : item
    ));
  };
  
  const getStockLevelColor = (stock: number, capacity: number) => {
    const percentage = (stock / capacity) * 100;
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Management</CardTitle>
        <CardDescription>Track and manage your stock levels.</CardDescription>
      </CardHeader>
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
              <TableRow key={item.id}>
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
                <TableCell className="text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleStockChange(item.id, -1)}>-1</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStockChange(item.id, 1)}>+1</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleStockChange(item.id, 5)}>+5</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
