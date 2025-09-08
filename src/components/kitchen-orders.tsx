"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Check } from 'lucide-react';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';

const initialOrders: Order[] = [
  { id: 'K001', tableId: 5, items: [{ name: 'Latte', price: 4.00, quantity: 2 }, { name: 'Croissant', price: 3.00, quantity: 1 }], status: 'Pending' },
  { id: 'K002', tableId: 12, items: [{ name: 'Turkey Club', price: 8.50, quantity: 1 }, { name: 'Iced Tea', price: 3.00, quantity: 1 }], status: 'Pending' },
  { id: 'K003', tableId: 3, items: [{ name: 'Espresso', price: 2.50, quantity: 1 }], status: 'In Preparation' },
  { id: 'K004', tableId: 8, items: [{ name: 'Veggie Delight', price: 7.50, quantity: 2 }], status: 'In Preparation' },
  { id: 'K005', tableId: 1, items: [{ name: 'Scone', price: 2.50, quantity: 1 }, { name: 'Green Tea', price: 2.50, quantity: 1 }], status: 'Completed' },
];

type OrderStatus = 'Pending' | 'In Preparation' | 'Completed';

const statusColumns: OrderStatus[] = ['Pending', 'In Preparation', 'Completed'];

export default function KitchenOrders() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const moveOrder = (orderId: string, toStatus: OrderStatus) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: toStatus } : order));
  };

  const getActionForOrder = (order: Order) => {
    switch (order.status) {
      case 'Pending':
        return (
          <Button size="sm" onClick={() => moveOrder(order.id, 'In Preparation')}>
            Start Prep <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        );
      case 'In Preparation':
        return (
          <Button size="sm" onClick={() => moveOrder(order.id, 'Completed')} className="bg-green-500 hover:bg-green-600">
            Complete <Check className="ml-2 h-4 w-4" />
          </Button>
        );
      case 'Completed':
        return <p className="text-sm text-muted-foreground">Order finished.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 h-[calc(100vh-5rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {statusColumns.map((status) => (
          <Card key={status} className="flex flex-col">
            <CardHeader>
              <CardTitle>{status}</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="space-y-4">
                {orders.filter(order => order.status === status).map(order => (
                  <Card key={order.id} className={cn("transition-all", {
                    'border-primary': order.status === 'In Preparation',
                  })}>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                      <CardDescription>Table: {order.tableId}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm">
                      <ul className="list-disc pl-4">
                        {order.items.map(item => (
                          <li key={item.name}>{item.quantity}x {item.name}</li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      {getActionForOrder(order)}
                    </CardFooter>
                  </Card>
                ))}
              </CardContent>
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  );
}
