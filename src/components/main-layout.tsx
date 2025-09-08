"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, LayoutGrid, Book, BarChart } from 'lucide-react';

import { Logo } from "./icons";
import PosSystem from './pos-system';
import TableManagement from './table-management';
import KitchenOrders from './kitchen-orders';
import AdminDashboard from './admin-dashboard';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center h-16 px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span className="text-lg">Up & Above Assistant</span>
        </div>
      </header>
      <main className="flex-1">
        <Tabs defaultValue="pos" className="h-full flex flex-col">
          <TabsList className="m-4 self-start">
            <TabsTrigger value="pos">
              <Coffee className="mr-2 h-4 w-4" />
              POS
            </TabsTrigger>
            <TabsTrigger value="tables">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="kitchen">
              <Book className="mr-2 h-4 w-4" />
              Kitchen
            </TabsTrigger>
            <TabsTrigger value="admin">
              <BarChart className="mr-2 h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="pos" className="m-0 p-0 h-full">
                <PosSystem />
            </TabsContent>
            <TabsContent value="tables" className="m-0 p-0">
              <TableManagement />
            </TabsContent>
            <TabsContent value="kitchen" className="m-0 p-0 h-full">
              <KitchenOrders />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0">
              <AdminDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
