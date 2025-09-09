
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Bill } from '@/lib/types';
import { format, isSameDay, isSameMonth, isSameYear, startOfDay, startOfMonth, getMonth, getYear, getDay } from 'date-fns';

interface SalesReportProps {
  bills: Bill[];
}

type ReportType = 'daily' | 'monthly' | 'yearly';

const processData = (bills: Bill[], type: ReportType) => {
    const now = new Date();
    let filteredBills: Bill[] = [];
    let reportTitle = '';
    let data: { name: string; revenue: number }[] = [];

    switch (type) {
        case 'daily':
            filteredBills = bills.filter(bill => isSameDay(bill.timestamp, now));
            reportTitle = `Today's Sales Report (${format(now, 'PPP')})`;
            const hours = Array.from({ length: 24 }, (_, i) => ({
                name: format(new Date(0, 0, 0, i), 'ha'),
                revenue: 0,
            }));
            filteredBills.forEach(bill => {
                const hour = bill.timestamp.getHours();
                hours[hour].revenue += bill.total;
            });
            data = hours.filter(h => h.revenue > 0);
            break;
        case 'monthly':
            filteredBills = bills.filter(bill => isSameMonth(bill.timestamp, now) && isSameYear(bill.timestamp, now));
            reportTitle = `This Month's Sales Report (${format(now, 'MMMM yyyy')})`;
            const daysInMonth = new Date(getYear(now), getMonth(now) + 1, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => ({
                name: format(new Date(getYear(now), getMonth(now), i + 1), 'd'),
                revenue: 0,
            }));
            filteredBills.forEach(bill => {
                const day = bill.timestamp.getDate() - 1;
                days[day].revenue += bill.total;
            });
            data = days;
            break;
        case 'yearly':
            filteredBills = bills.filter(bill => isSameYear(bill.timestamp, now));
            reportTitle = `This Year's Sales Report (${format(now, 'yyyy')})`;
            const months = Array.from({ length: 12 }, (_, i) => ({
                name: format(new Date(0, i), 'MMM'),
                revenue: 0,
            }));
            filteredBills.forEach(bill => {
                const month = getMonth(bill.timestamp);
                months[month].revenue += bill.total;
            });
            data = months;
            break;
    }

    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalOrders = filteredBills.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { data, reportTitle, totalRevenue, totalOrders, averageOrderValue };
};

export default function SalesReport({ bills }: SalesReportProps) {
    const [reportType, setReportType] = useState<ReportType>('daily');

    const { data, reportTitle, totalRevenue, totalOrders, averageOrderValue } = useMemo(() => processData(bills, reportType), [bills, reportType]);

  return (
    <div className="w-full space-y-4">
      <Tabs value={reportType} onValueChange={(value) => setReportType(value as ReportType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>
       <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>{reportTitle}</CardTitle>
          <CardDescription>A summary of sales activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">Rs.{totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Order Value</p>
              <p className="text-2xl font-bold">Rs.{averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
          <div className="h-80 w-full">
             {data.length > 0 ? (
                <ResponsiveContainer>
                    <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `Rs.${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No sales data for this period.
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
