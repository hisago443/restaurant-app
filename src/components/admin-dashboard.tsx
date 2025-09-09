"use client";

import { useState } from 'react';
import { BarChart, Book, Download, TrendingUp, Settings, Package, User, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import SalesReport from './sales-report';
import ActivityLog from './activity-log';
import InventoryManagement from './inventory-management';
import SystemSettings from './system-settings';

const topItems = [
  { name: 'Cafe Latte', count: 125 },
  { name: 'Cold Coffee', count: 98 },
  { name: 'Black Coffee', count: 85 },
  { name: 'Banana', count: 72 },
  { name: 'Lemonade', count: 66 },
];

// Mock data for CSV export
const salesData = [
    { date: '2024-07-27', orderId: 'K001', amount: 11.00, items: '2x Latte, 1x Croissant' },
    { date: '2024-07-27', orderId: 'K002', amount: 11.50, items: '1x Turkey Club, 1x Iced Tea' },
    { date: '2024-07-27', orderId: 'K003', amount: 2.50, items: '1x Espresso' },
];

export default function AdminDashboard() {

  const handleExportCSV = () => {
    const header = Object.keys(salesData[0]).join(',');
    const rows = salesData.map(row => Object.values(row).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${header}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sales_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Revenue</CardTitle>
            <span className="text-green-600 font-bold">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">₹4,29,189.00</div>
            <p className="text-xs text-green-700 dark:text-green-300">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">+235</div>
            <p className="text-xs text-blue-700 dark:text-blue-300">+12.2% from yesterday</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">₹1,826.00</div>
            <p className="text-xs text-amber-700 dark:text-amber-300">+5.3% from last week</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-800 dark:text-violet-200">Active Staff</CardTitle>
            <User className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">3</div>
            <p className="text-xs text-violet-700 dark:text-violet-300">Currently on duty</p>
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

        {/* Reports & Settings */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Reports & Settings</CardTitle>
            <CardDescription>Manage system data and configurations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <BarChart className="h-5 w-5" />
                  <span>Generate Sales Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Sales Report</DialogTitle>
                    <DialogDescription>A summary of sales activity.</DialogDescription>
                  </DialogHeader>
                  <SalesReport />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="lg" className="justify-start gap-2" onClick={handleExportCSV}>
              <Download className="h-5 w-5" />
              <span>Export Sales Data (CSV)</span>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <Book className="h-5 w-5" />
                  <span>View Activity Logs</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activity Log</DialogTitle>
                  <DialogDescription>Recent activities across the system.</DialogDescription>
                </DialogHeader>
                <ActivityLog />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <Package className="h-5 w-5" />
                  <span>Inventory Management</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Inventory Management</DialogTitle>
                    <DialogDescription>Track and manage your stock levels.</DialogDescription>
                  </DialogHeader>
                  <InventoryManagement />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                 <Button variant="outline" size="lg" className="justify-start gap-2 col-span-1 sm:col-span-2">
                    <Settings className="h-5 w-5" />
                    <span>System Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                    <DialogTitle>System Settings</DialogTitle>
                    <DialogDescription>Manage general application settings.</DialogDescription>
                  </DialogHeader>
                  <SystemSettings />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
