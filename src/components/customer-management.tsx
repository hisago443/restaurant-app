
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Search, User, Phone, Mail, MapPin, Bookmark } from 'lucide-react';
import type { Bill, Customer, PendingBill, Table as TableType } from '@/lib/types';
import { format } from 'date-fns';
import { Textarea } from './ui/textarea';

interface CustomerManagementProps {
  billHistory: Bill[];
  tables: TableType[];
}

function AddOrEditCustomerDialog({
  open,
  onOpenChange,
  onSave,
  existingCustomer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'firstSeen' | 'lastSeen' | 'totalVisits' | 'totalSpent'> & { id?: string }) => void;
  existingCustomer: Customer | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (existingCustomer) {
      setName(existingCustomer.name);
      setPhone(existingCustomer.phone);
      setEmail(existingCustomer.email || '');
      setAddress(existingCustomer.address || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
    }
  }, [existingCustomer, open]);

  const handleSave = () => {
    if (name && phone) {
      onSave({
        id: existingCustomer?.id,
        name,
        phone,
        email,
        address,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input id="customer-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone Number</Label>
            <Input id="customer-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., 9876543210" disabled={!!existingCustomer} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email (Optional)</Label>
            <Input id="customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., jane.d@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Address (Optional)</Label>
            <Textarea id="customer-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full Address" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReservationHistoryDialog({
  isOpen,
  onOpenChange,
  customer,
  reservations,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  reservations: TableType[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservation History for {customer.name}</DialogTitle>
          <DialogDescription>A log of all past and current table reservations.</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto py-4">
          {reservations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>Table {table.id}</TableCell>
                    <TableCell>{table.reservationDetails?.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground pt-8">No reservation history found for this customer.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function CustomerManagement({ billHistory, tables }: CustomerManagementProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [dedicatedCustomers, setDedicatedCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Customer | 'reservations'>('lastSeen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewingReservationsFor, setViewingReservationsFor] = useState<Customer | null>(null);

  useEffect(() => {
    const unsubPending = onSnapshot(collection(db, 'pendingBills'), (snapshot) => {
      const bills = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          transactions: (data.transactions || []).map((tx: any) => ({...tx, date: tx.date.toDate()})),
        } as PendingBill;
      });
      setPendingBills(bills.filter(b => b.type === 'customer'));
    });
    
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
        const custs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                firstSeen: data.firstSeen.toDate(),
                lastSeen: data.lastSeen.toDate(),
            } as Customer;
        });
        setDedicatedCustomers(custs);
    });

    return () => {
      unsubPending();
      unsubCustomers();
    };
  }, []);

  const aggregatedCustomers = useMemo(() => {
    const customerMap = new Map<string, Customer>();

    // 1. Add dedicated customers first
    dedicatedCustomers.forEach(cust => {
        customerMap.set(cust.id, { ...cust });
    });

    // 2. Process bills and update or add customers
    billHistory.forEach(bill => {
      if (!bill.customerDetails || !bill.customerDetails.phone) return;

      const { phone, name, email, address } = bill.customerDetails;
      const existing = customerMap.get(phone);

      if (existing) {
        existing.totalSpent += bill.total;
        existing.totalVisits += 1;
        if (bill.timestamp > existing.lastSeen) {
          existing.lastSeen = bill.timestamp;
        }
      } else {
        customerMap.set(phone, {
          id: phone,
          phone,
          name,
          email: email || '',
          address: address || '',
          firstSeen: bill.timestamp,
          lastSeen: bill.timestamp,
          totalVisits: 1,
          totalSpent: bill.total,
        });
      }
    });

    // 3. Process pending bills for customers not in bills or dedicated list yet
    pendingBills.forEach(pBill => {
      if (pBill.mobile && !customerMap.has(pBill.mobile)) {
        const firstTxDate = pBill.transactions.length > 0 ? pBill.transactions[0].date : new Date();
         customerMap.set(pBill.mobile, {
          id: pBill.mobile,
          phone: pBill.mobile,
          name: pBill.name,
          email: '',
          address: '',
          firstSeen: firstTxDate,
          lastSeen: firstTxDate,
          totalVisits: 1, // At least one interaction
          totalSpent: 0,
        });
      }
    });
    
    setCustomers(Array.from(customerMap.values()));
    return Array.from(customerMap.values());
  }, [billHistory, pendingBills, dedicatedCustomers]);

  const customerReservations = useMemo(() => {
    const reservationMap = new Map<string, TableType[]>();
    tables.forEach(table => {
      if (table.status === 'Reserved' && table.reservationDetails?.mobile) {
        const mobile = table.reservationDetails.mobile;
        const customerReservations = reservationMap.get(mobile) || [];
        customerReservations.push(table);
        reservationMap.set(mobile, customerReservations);
      }
    });
    return reservationMap;
  }, [tables]);


  const sortedAndFilteredCustomers = useMemo(() => {
    let filtered = customers;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowerTerm) || 
        c.phone.includes(lowerTerm)
      );
    }

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'reservations') {
        const aReservations = customerReservations.get(a.phone)?.length || 0;
        const bReservations = customerReservations.get(b.phone)?.length || 0;
        if (aReservations > bReservations) comparison = 1;
        else if (aReservations < bReservations) comparison = -1;
      } else if (sortField) {
        if (a[sortField] > b[sortField]) {
            comparison = 1;
        } else if (a[sortField] < b[sortField]) {
            comparison = -1;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, searchTerm, sortField, sortDirection, customerReservations]);

  const handleSort = (field: keyof Customer | 'reservations') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'| 'firstSeen' | 'lastSeen' | 'totalVisits' | 'totalSpent'> & {id?: string}) => {
    const { id, phone, ...data } = customerData;
    const customerId = id || phone; // Use phone as ID if new

    if (!customerId) {
        toast({ variant: 'destructive', title: 'Phone number is required.' });
        return;
    }
    
    const customerRef = doc(db, 'customers', customerId);

    try {
        await setDoc(customerRef, {
            ...data,
            id: customerId,
            phone: customerId,
            firstSeen: new Date(),
            lastSeen: new Date(),
            totalVisits: 0,
            totalSpent: 0,
        }, { merge: true }); // Use merge to avoid overwriting visit data if it exists

        toast({ title: 'Customer Saved', description: `${data.name} has been saved.` });
    } catch (error) {
        console.error("Error saving customer:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save customer details.' });
    }
  };
  
  const openDialog = (customer: Customer | null) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <CardTitle>Customer Relationship Management</CardTitle>
              <CardDescription>View and manage your customer database.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => openDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">Customer</TableHead>
                  <TableHead onClick={() => handleSort('totalVisits')} className="cursor-pointer">Total Visits</TableHead>
                  <TableHead onClick={() => handleSort('totalSpent')} className="cursor-pointer">Total Spent</TableHead>
                  <TableHead onClick={() => handleSort('lastSeen')} className="cursor-pointer">Last Visit</TableHead>
                  <TableHead onClick={() => handleSort('reservations')} className="cursor-pointer">Reservations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredCustomers.map(customer => {
                  const reservations = customerReservations.get(customer.phone) || [];
                  return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{customer.totalVisits}</TableCell>
                    <TableCell className="font-mono font-semibold">Rs. {customer.totalSpent.toFixed(2)}</TableCell>
                    <TableCell>{format(customer.lastSeen, 'PPP')}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        disabled={reservations.length === 0}
                        onClick={() => setViewingReservationsFor(customer)}
                        className="flex items-center gap-2"
                      >
                        <Bookmark className="h-4 w-4" />
                        {reservations.length}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AddOrEditCustomerDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCustomer}
        existingCustomer={editingCustomer}
      />
      {viewingReservationsFor && (
        <ReservationHistoryDialog
          isOpen={!!viewingReservationsFor}
          onOpenChange={(open) => !open && setViewingReservationsFor(null)}
          customer={viewingReservationsFor}
          reservations={customerReservations.get(viewingReservationsFor.phone) || []}
        />
      )}
    </div>
  );
}
