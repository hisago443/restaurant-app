"use client";

import { BarChart, Book, Download, DollarSign, TrendingUp, Settings, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const topItems = [
  { name: 'Cafe Latte', count: 125 },
  { name: 'Cold Coffee', count: 98 },
  { name: 'Black Coffee', count: 85 },
  { name: 'Banana', count: 72 },
  { name: 'Lemonade', count: 66 },
];

export default function AdminDashboard() {
  return (
    <div className="p-4 space-y-4">
      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹4,29,189.00</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+235</div>
            <p className="text-xs text-muted-foreground">+12.2% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <span className="text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1,826.00</div>
            <p className="text-xs text-muted-foreground">+5.3% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Selling Items */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Today's most popular items.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map(item => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reports & Logs */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Reports & Settings</CardTitle>
            <CardDescription>Manage system data and configurations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" size="lg" className="justify-start gap-2">
              <BarChart className="h-5 w-5" />
              <span>Generate Sales Report</span>
            </Button>
            <Button variant="outline" size="lg" className="justify-start gap-2">
              <Download className="h-5 w-5" />
              <span>Export Sales Data (CSV)</span>
            </Button>
            <Button variant="outline" size="lg" className="justify-start gap-2">
              <Book className="h-5 w-5" />
              <span>View Activity Logs</span>
            </Button>
             <Button variant="outline" size="lg" className="justify-start gap-2">
              <Package className="h-5 w-5" />
              <span>Inventory Management</span>
            </Button>
            <Button variant="outline" size="lg" className="justify-start gap-2 col-span-1 sm:col-span-2">
              <Settings className="h-5 w-5" />
              <span>System Settings</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
