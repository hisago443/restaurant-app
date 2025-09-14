
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
  reservationDetails?: {
    name: string;
    time: string;
  }
}

export interface Order {
  id: string;
  items: OrderItem[];
  tableId: number;
  status: 'Pending' | 'In Preparation' | 'Completed';
}

export interface Bill {
  id: string;
  orderItems: OrderItem[];
  tableId: number;
  total: number;
  receiptPreview: string;
  timestamp: Date;
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
  creditLimit: number;
  transactions: PendingBillTransaction[];
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

    