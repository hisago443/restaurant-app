
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Check, ClipboardList } from 'lucide-react';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KitchenOrdersProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

type OrderStatus = 'In Preparation' | 'Completed';

const statusColumns: OrderStatus[] = ['In Preparation', 'Completed'];

export default function KitchenOrders({ orders, setOrders }: KitchenOrdersProps) {

  const moveOrder = (orderId: string, toStatus: OrderStatus) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: toStatus } : order));
  };

  const getActionForOrder = (order: Order) => {
    switch (order.status) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        {statusColumns.map((status) => (
          <Card key={status} className="flex flex-col">
            <CardHeader>
              <CardTitle>{status}</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="space-y-4">
                {orders.filter(order => order.status === status).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
                    <ClipboardList className="w-16 h-16 text-gray-300" />
                    <p className="mt-4 text-sm font-medium">No {status.toLowerCase()} orders.</p>
                  </div>
                ) : (
                  orders.filter(order => order.status === status).map(order => (
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
                  ))
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  );
}
