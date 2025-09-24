

import { z } from 'zod';

export interface MenuItemHistory {
  name: string;
  price: number;
  changedAt: Date;
}

export interface MenuItem {
  name: string;
  price: number;
  code: string;
  history?: MenuItemHistory[];
  category?: string; // Added to easily identify item's main category
}

export interface MenuSubCategory {
  name: string;
  items: MenuItem[];
}

export interface MenuCategory {
  category: string;
  subCategories: MenuSubCategory[];
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';

export interface Table {
  id: number;
  status: TableStatus;
  name?: string;
  seats?: number;
  reservationDetails?: {
    name: string;
    time: string;
    mobile?: string;
  }
}

export type OrderType = 'Dine-In' | 'Take-Away' | 'Home-Delivery';

export interface CustomerDetails {
    name: string;
    phone: string;
    address: string;
    houseNo?: string;
    street?: string;
    landmark?: string;
    email?: string;
}

export interface Customer {
  id: string; // phone number can serve as a unique ID
  name: string;
  phone: string;
  email?: string;
  address?: string;
  firstSeen: Date;
  lastSeen: Date;
  totalVisits: number;
  totalSpent: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  tableId?: number | null;
  status: 'Pending' | 'In Preparation' | 'Completed';
  orderType: OrderType;
  customerDetails?: CustomerDetails;
}

export interface Bill {
  id: string;
  orderItems: OrderItem[];
  tableId?: number | null;
  total: number;
  receiptPreview: string;
  timestamp: Date;
  orderType: OrderType;
  customerDetails?: CustomerDetails;
}


export interface Employee {
  id: string;
  name:string;
  role: string;
  salary: number;
  color: string;
}

export interface Advance {
  id: string;
  employeeId: string;
  date: Date;
  amount: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-day';

export interface Attendance {
  id: string; // Composite key: `${employeeId}_${yyyy-MM-dd}`
  employeeId: string;
  date: Date;
  status: AttendanceStatus;
  notes?: string;
}

export interface Vendor {
    id: string;
    name: string;
    category: string;
    phone?: string;
}

export interface Expense {
    id: string;
    date: Date;
    category: string;
    description: string;
    amount: number;
    vendorId?: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  capacity: number;
  unit: string;
}

export interface ActivityLogEntry {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  type: 'Auth' | 'Order' | 'Payment' | 'Report' | 'POS';
}

export interface PendingBillTransaction {
  id: string;
  amount: number;
  date: Date;
  description?: string;
}

export interface PendingBill {
  id: string;
  name: string;
  type: 'customer' | 'vendor';
  transactions: PendingBillTransaction[];
  mobile?: string;
}

export interface KOTPreference {
  type: 'single' |'separate' | 'category';
  categories?: string[];
}


// Schemas for report generation
export const BillSchema = z.object({
  id: z.string(),
  total: z.number(),
  timestamp: z.string().describe('ISO date string'),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  salary: z.number(),
});

export const ExpenseSchema = z.object({
  id: z.string(),
  date: z.string().describe('ISO date string'),
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  vendorId: z.string().nullish(),
});

export const PendingBillTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  date: z.string().describe('ISO date string'),
  description: z.string().optional(),
});

export const PendingBillSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['customer', 'vendor']),
  transactions: z.array(PendingBillTransactionSchema),
  mobile: z.string().optional(),
});

export const AttendanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string().describe('ISO date string'),
  status: z.enum(['Present', 'Absent', 'Half-day']),
  notes: z.string().optional(),
});

export const AdvanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string().describe('ISO date string'),
  amount: z.number(),
});


// Zod schema for GenerateReport input
export const GenerateReportInputSchema = z.object({
  reportType: z.enum(['daily', 'monthly', 'yearly']).describe('The type of report to generate.'),
  billHistory: z.array(z.any()).describe('A list of all bills.'),
  employees: z.array(z.any()).describe('A list of all employees.'),
  expenses: z.array(z.any()).describe('A list of all recorded expenses.'),
  pendingBills: z.array(z.any()).describe('A list of all pending bills (both customer and vendor).'),
  attendance: z.array(z.any()).describe('A list of all attendance records.'),
  advances: z.array(z.any()).describe('A list of all salary advances.'),
  tables: z.array(z.any()).describe('A list of all tables.'),
  inventory: z.array(z.any()).describe('A list of all inventory items.'),
  customerSummary: z.array(z.any()).describe('A summary of customer data including total visits and spending.'),
  recipientEmail: z.string().email().describe('The email address to send the report to.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

// Zod schema for GenerateReport output
export const GenerateReportOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

    
