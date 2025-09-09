export interface MenuItem {
  name: string;
  price: number;
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
  name: string;
  role: string;
  salary: number;
  color: string;
}

export interface Attendance {
  date: Date;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface Advance {
  employeeId: string;
  date: Date;
  amount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
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
