"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Employee, Advance } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

const initialEmployees: Employee[] = [
  { id: 'E001', name: 'John Doe', role: 'Manager', salary: 50000, color: 'bg-blue-500' },
  { id: 'E002', name: 'Jane Smith', role: 'Chef', salary: 40000, color: 'bg-green-500' },
  { id: 'E003', name: 'Mike Johnson', role: 'Waiter', salary: 25000, color: 'bg-yellow-500' },
];

const initialAdvances: Advance[] = [
  { employeeId: 'E002', date: new Date(2024, 6, 5), amount: 2000 },
  { employeeId: 'E003', date: new Date(2024, 6, 15), amount: 1500 },
];

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

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
            <Label htmlFor="amount">Amount (Rs.)</Label>
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
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
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

  const handleAddEmployee = (employee: Omit<Employee, 'color' | 'id'> & { id?: string }) => {
    const newEmployee: Employee = {
      id: employee.id || `E${Date.now()}`,
      name: employee.name,
      role: employee.role,
      salary: employee.salary,
      color: colors[employees.length % colors.length]
    };
    setEmployees([...employees, newEmployee]);
  }
  
  const handleEditEmployee = (employee: Employee) => {
      setEmployees(employees.map(e => e.id === employee.id ? employee : e));
      setEditingEmployee(null);
  }

  const handleDeleteEmployee = (employeeId: string) => {
      setEmployees(employees.filter(e => e.id !== employeeId));
  }
  
  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
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
                <Button onClick={() => { setEditingEmployee(null); setIsAddEmployeeDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Salary (Rs.)</TableHead>
                    <TableHead>Advance (Rs.)</TableHead>
                    <TableHead>Remaining Salary (Rs.)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const totalAdvance = advances
                      .filter(a => a.employeeId === employee.id)
                      .reduce((sum, a) => sum + a.amount, 0);

                    const remainingSalary = employee.salary - totalAdvance;

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                            {employee.name}
                          </div>
                        </TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell className="bg-slate-100 dark:bg-slate-800">{employee.salary.toLocaleString()}</TableCell>
                        <TableCell className="bg-slate-300 dark:bg-slate-600">{totalAdvance.toLocaleString()}</TableCell>
                        <TableCell className="bg-slate-200 dark:bg-slate-700">{remainingSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete {employee.name}'s record.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    <span className="mr-2">Rs.</span> Add Advance
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
                        <div className="flex items-center gap-2">
                          {employee && <span className={cn('h-2 w-2 rounded-full', employee.color)} />}
                          <span>{employee ? employee.name : 'Unknown Employee'}:</span>
                        </div>
                        <span className="font-mono font-bold">Rs.{advance.amount.toLocaleString()}</span>
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

      <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isAddEmployeeDialogOpen || isEditEmployeeDialogOpen}
        onOpenChange={editingEmployee ? setIsEditEmployeeDialogOpen : setIsAddEmployeeDialogOpen}
        employee={editingEmployee}
        onSave={(employeeData) => {
            if (editingEmployee) {
                handleEditEmployee({ ...editingEmployee, ...employeeData });
            } else {
                handleAddEmployee(employeeData as Omit<Employee, 'color'> & {id: string});
            }
        }}
      />
    </div>
  );
}

function EmployeeDialog({ open, onOpenChange, employee, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null; onSave: (data: Omit<Employee, 'color'> & {id?: string}) => void;}) {
    const [id, setId] = useState(employee?.id || '');
    const [name, setName] = useState(employee?.name || '');
    const [role, setRole] = useState(employee?.role || '');
    const [salary, setSalary] = useState(employee?.salary.toString() || '');
    
    const handleSave = () => {
        onSave({ id, name, role, salary: parseFloat(salary) });
        onOpenChange(false);
    }

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <DialogHeader>
                    <DialogTitle>{employee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">Employee ID</Label>
                        <Input id="id" placeholder="e.g., E004" value={id} onChange={(e) => setId(e.target.value)} disabled={!!employee} />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="name">Employee Name</Label>
                    <Input id="name" placeholder="e.g., John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Chef">Chef</SelectItem>
                        <SelectItem value="Waiter">Waiter</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input id="salary" type="number" placeholder="e.g., 30000" value={salary} onChange={(e) => setSalary(e.target.value)}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Employee</Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    );
}
