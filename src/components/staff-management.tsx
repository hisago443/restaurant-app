"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2, DollarSign } from 'lucide-react';
import type { Employee, Advance } from '@/lib/types';
import { format, isSameDay } from 'date-fns';

const initialEmployees: Employee[] = [
  { id: 'E001', name: 'John Doe', role: 'Manager', salary: 50000 },
  { id: 'E002', name: 'Jane Smith', role: 'Chef', salary: 40000 },
  { id: 'E003', name: 'Mike Johnson', role: 'Waiter', salary: 25000 },
];

const initialAdvances: Advance[] = [
  { employeeId: 'E002', date: new Date(2024, 6, 5), amount: 2000 },
  { employeeId: 'E003', date: new Date(2024, 6, 15), amount: 1500 },
];

function AddAdvanceDialog({ open, onOpenChange, employees, onAddAdvance, selectedDate }: { open: boolean, onOpenChange: (open: boolean) => void, employees: Employee[], onAddAdvance: (advance: Omit<Advance, 'date'>) => void, selectedDate: Date }) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');

  const handleSave = () => {
    if (employeeId && amount) {
      onAddAdvance({ employeeId, amount: parseFloat(amount) });
      onOpenChange(false);
      setEmployeeId('');
      setAmount('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Advance</DialogTitle>
          <DialogDescription>
            Record a salary advance for an employee on {format(selectedDate, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select onValueChange={setEmployeeId} value={employeeId}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" placeholder="e.g., 2000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Advance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function StaffManagement() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [advances, setAdvances] = useState<Advance[]>(initialAdvances);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isAddAdvanceDialogOpen, setIsAddAdvanceDialogOpen] = useState(false);

  const advancesForSelectedDate = advances.filter(
    (advance) => selectedDate && isSameDay(advance.date, selectedDate)
  );
  
  const datesWithAdvance = advances.map(a => a.date);
  
  const handleAddAdvance = (advance: Omit<Advance, 'date'>) => {
    if (selectedDate) {
      setAdvances([...advances, { ...advance, date: selectedDate }]);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employee List</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & Salary</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage your restaurant staff.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button onClick={() => setIsAddEmployeeDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Salary (₹)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.id}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.salary.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendance">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Select a date to view attendance and salary details.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    advance: datesWithAdvance,
                  }}
                  modifiersStyles={{
                    advance: {
                      border: '2px solid hsl(var(--primary))',
                      fontWeight: 'bold',
                    }
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Details for {selectedDate ? format(selectedDate, 'PPP') : '...'}</CardTitle>
                    <CardDescription>Advances and other details for the selected date.</CardDescription>
                  </div>
                  <Button onClick={() => setIsAddAdvanceDialogOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" /> Add Advance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">Advances Given</h3>
                {advancesForSelectedDate.length > 0 ? (
                  <ul className="space-y-2">
                    {advancesForSelectedDate.map((advance, index) => {
                      const employee = employees.find(e => e.id === advance.employeeId);
                      return (
                      <li key={index} className="flex justify-between items-center p-2 bg-muted rounded-md">
                        <span>{employee ? employee.name : 'Unknown Employee'}:</span>
                        <span className="font-mono font-bold">₹{advance.amount.toLocaleString()}</span>
                      </li>
                    )})}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No advances on this date.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AddAdvanceDialog 
        open={isAddAdvanceDialogOpen}
        onOpenChange={setIsAddAdvanceDialogOpen}
        employees={employees}
        onAddAdvance={handleAddAdvance}
        selectedDate={selectedDate || new Date()}
      />

      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Employee Name</Label>
              <Input id="name" placeholder="e.g., John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary</Label>
              <Input id="salary" type="number" placeholder="e.g., 30000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsAddEmployeeDialogOpen(false)}>Save Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
