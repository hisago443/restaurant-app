

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

export interface HomeDeliveryDetails {
    name: string;
    mobile: string;
    houseNo?: string;
    street?: string;
    landmark?: string;
    pincode: string;
    additionalInfo?: string;
}

export interface Table {
  id: number;
  status: TableStatus;
  reservationDetails?: {
    name: string;
    time: string;
    mobile?: string;
  }
}

export type OrderType = 'Dine-In' | 'Home Delivery';

export interface Order {
  id: string;
  items: OrderItem[];
  tableId: number; // For Dine-in, -1 for Home Delivery
  status: 'Pending' | 'In Preparation' | 'Completed';
  deliveryDetails?: HomeDeliveryDetails;
}

export interface Bill {
  id: string;
  orderItems: OrderItem[];
  tableId: number;
  total: number;
  receiptPreview: string;
  timestamp: Date;
  deliveryDetails?: HomeDeliveryDetails;
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
  type: 'single' | 'separate' | 'category';
  categories?: string[];
}


// Zod schema for serializable Bill
export const BillSchema = z.object({
  id: z.string(),
  total: z.number(),
  timestamp: z.string().describe('ISO date string'),
});

// Zod schema for serializable Employee
export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  salary: z.number(),
});

// Zod schema for GenerateReport input
export const GenerateReportInputSchema = z.object({
  reportType: z.enum(['daily', 'monthly', 'yearly']).describe('The type of report to generate.'),
  billHistory: z.array(BillSchema).describe('A list of all bills.'),
  employees: z.array(EmployeeSchema).describe('A list of all employees.'),
  recipientEmail: z.string().email().describe('The email address to send the report to.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

// Zod schema for GenerateReport output
export const GenerateReportOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;
