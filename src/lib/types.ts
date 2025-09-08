export interface MenuItem {
  name: string;
  price: number;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
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
