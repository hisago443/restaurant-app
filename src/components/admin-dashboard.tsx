
"use client";

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Book, Download, TrendingUp, Settings, Package, User, ShoppingCart, History, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import SalesReport from './sales-report';
import ActivityLog from './activity-log';
import InventoryManagement from './inventory-management';
import SystemSettings from './system-settings';
import BillHistory from './bill-history';
import type { Bill, Employee, OrderItem } from '@/lib/types';
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isSameDay } from 'date-fns';


const topItems: { name: string; count: number }[] = [];

// Mock data for CSV export
const salesData = [
    { date: '2024-07-27', orderId: 'K001', amount: 11.00, items: '2x Latte, 1x Croissant' },
    { date: '2024-07-27', orderId: 'K002', amount: 11.50, items: '1x Turkey Club, 1x Iced Tea' },
    { date: '2024-07-27', orderId: 'K003', amount: 2.50, items: '1x Espresso' },
];

interface AdminDashboardProps {
  billHistory: Bill[];
  employees: Employee[];
}

export default function AdminDashboard({ billHistory, employees }: AdminDashboardProps) {
  const { toast } = useToast();
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [autoSendDaily, setAutoSendDaily] = useState(false);
  const [autoSendMonthly, setAutoSendMonthly] = useState(false);

  const todaysBills = useMemo(() => billHistory.filter(bill => isSameDay(new Date(bill.timestamp), new Date())), [billHistory]);
  
  const totalRevenue = useMemo(() => todaysBills.reduce((sum, bill) => sum + bill.total, 0), [todaysBills]);
  const totalOrders = useMemo(() => todaysBills.length, [todaysBills]);
  const averageOrderValue = useMemo(() => (totalOrders > 0 ? totalRevenue / totalOrders : 0), [totalRevenue, totalOrders]);

  const topSellingItems = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    todaysBills.forEach(bill => {
      bill.orderItems.forEach((item: OrderItem) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    return Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [todaysBills]);


  const handleExportCSV = () => {
    if (billHistory.length === 0) return;
    const header = 'id,tableId,total,timestamp,items\n';
    const rows = billHistory.map(bill => {
        const items = bill.orderItems.map(item => `${item.quantity}x ${item.name}`).join('; ');
        return `${bill.id},${bill.tableId},${bill.total},"${new Date(bill.timestamp).toISOString()}","${items}"`;
    }).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${header}${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sales_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSendReport = async (reportType: 'daily' | 'monthly' | 'yearly') => {
    setIsReportLoading(true);
    toast({
      title: 'Generating Report...',
      description: `Please wait while we generate the ${reportType} report. This may take a moment.`,
    });

    const input = {
      reportType,
      recipientEmail: 'upandabove.bir@gmail.com',
    };

    try {
      const result = await generateAndSendReport(input);
      if (result.success) {
        toast({
          title: 'Report Sent!',
          description: `The ${reportType} report has been sent successfully.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      console.error(`Failed to send ${reportType} report:`, e);
      toast({
        variant: 'destructive',
        title: 'Report Failed',
        description: e.message || `Could not send the ${reportType} report. Please try again.`,
      });
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Revenue</CardTitle>
            <span className="text-green-600 font-bold">Rs.</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-700 dark:text-green-300">Today's total sales</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalOrders}</div>
            <p className="text-xs text-blue-700 dark:text-blue-300">Today's total orders</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">Rs. {averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Average per order</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-800 dark:text-violet-200">Active Staff</CardTitle>
            <User className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">{employees.length}</div>
            <p className="text-xs text-violet-700 dark:text-violet-300">Total employees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Selling Items */}
        <Card className="lg:col-span-3 bg-muted/30">
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
                {topSellingItems.length > 0 ? (
                  topSellingItems.map(item => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No items sold yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reports & Settings */}
        <Card className="lg:col-span-4 bg-muted/30">
          <CardHeader>
            <CardTitle>Reports & Settings</CardTitle>
            <CardDescription>Manage system data and configurations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <BarChart className="h-5 w-5" />
                  <span>View Sales Reports</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Sales Reports</DialogTitle>
                    <DialogDescription>A summary of sales activity across different periods.</DialogDescription>
                  </DialogHeader>
                  <SalesReport bills={billHistory} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="justify-start gap-2">
                  <History className="h-5 w-5" />
                  <span>View Bill History</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Bill History</DialogTitle>
                  <DialogDescription>A log of all completed transactions.</DialogDescription>
                </DialogHeader>
                <BillHistory bills={billHistory} />
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
                 <Button variant="outline" size="lg" className="justify-start gap-2">
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
             <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Email Reports</CardTitle>
                <CardDescription>Send summary reports to the administrator.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                  <div className='flex flex-wrap gap-2'>
                    <Button variant="secondary" onClick={() => handleSendReport('daily')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Daily Report
                    </Button>
                    <Button variant="secondary" onClick={() => handleSendReport('monthly')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Monthly Report
                    </Button>
                    <Button variant="secondary" onClick={() => handleSendReport('yearly')} disabled={isReportLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Send Yearly Report
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-daily" checked={autoSendDaily} onCheckedChange={setAutoSendDaily} />
                      <Label htmlFor="auto-daily">Auto-send Daily Report</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                      <Switch id="auto-monthly" checked={autoSendMonthly} onCheckedChange={setAutoSendMonthly} />
                      <Label htmlFor="auto-monthly">Auto-send Monthly Report</Label>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
