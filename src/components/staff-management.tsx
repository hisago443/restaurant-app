
"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Employee, Advance } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

function AddOrEditAdvanceDialog({
  open,
  onOpenChange,
  employees,
  onSave,
  selectedDate,
  existingAdvance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSave: (advance: Omit<Advance, 'date' | 'id'> & { date: Date; id?: string }) => void;
  selectedDate: Date;
  existingAdvance: Advance | null;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
    if (existingAdvance) {
      setEmployeeId(existingAdvance.employeeId);
      setAmount(String(existingAdvance.amount));
    } else {
      setEmployeeId('');
      setAmount('');
    }
  }, [existingAdvance, open]);

  const handleSave = () => {
    if (employeeId && amount) {
      onSave({
        id: existingAdvance?.id,
        employeeId,
        amount: parseFloat(amount),
        date: selectedDate,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingAdvance ? 'Edit' : 'Add'} Advance</DialogTitle>
          <DialogDescription>
            Record an advance for an employee on {format(selectedDate, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select onValueChange={setEmployeeId} value={employeeId} disabled={!!existingAdvance}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
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

interface StaffManagementProps {
  employees: Employee[];
}


export default function StaffManagement({ employees }: StaffManagementProps) {
  const { toast } = useToast();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "advances"), (snapshot) => {
        const advancesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, date: data.date.toDate() } as Advance;
        });
        setAdvances(advancesData);
    });
    return () => unsub();
  }, []);
  
  const advancesForSelectedDate = advances.filter(
    (advance) => selectedDate && isSameDay(advance.date, selectedDate)
  );
  
  const datesWithAdvance = advances.map(a => a.date);
  
  const handleSaveAdvance = async (advance: Advance) => {
    if (advance.id) {
        // Update existing advance
        try {
            const advanceRef = doc(db, "advances", advance.id);
            await updateDoc(advanceRef, { amount: advance.amount });
            toast({ title: 'Advance Updated', description: 'The advance has been updated.' });
        } catch (error) {
            console.error("Error updating advance: ", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the advance.' });
        }
    } else {
        // Add new advance
        try {
            const { id, ...newAdvance } = advance;
            await addDoc(collection(db, "advances"), newAdvance);
            toast({ title: 'Advance Saved', description: 'The advance has been recorded.' });
        } catch (error) {
            console.error("Error adding advance: ", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the advance.' });
        }
    }
  }

  const handleDeleteAdvance = async (advanceId: string) => {
    try {
        await deleteDoc(doc(db, "advances", advanceId));
        toast({ title: 'Advance Deleted', description: 'The advance has been removed.' });
    } catch (error) {
        console.error("Error deleting advance: ", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the advance.' });
    }
  }
  
  const generateNewEmployeeId = () => {
    const existingIds = employees.map(e => parseInt(e.id.replace('UA', ''), 10)).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `UA${(maxId + 1).toString().padStart(3, '0')}`;
  }

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      const newId = generateNewEmployeeId();
      const employeeRef = doc(db, "employees", newId);
      await setDoc(employeeRef, {...employee, id: newId});
      toast({ title: 'Employee Added', description: `${employee.name} saved with ID ${newId}.` });
    } catch (error) {
      console.error("Error adding employee: ", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the employee.' });
    }
  };

  const handleAddEmployee = (employee: Omit<Employee, 'id' | 'color'>) => {
    const newEmployee: Omit<Employee, 'id'> = {
      ...employee,
      color: colors[employees.length % colors.length]
    };
    addEmployee(newEmployee);
  }
  
  const updateEmployee = async (employee: Employee) => {
    try {
      const employeeRef = doc(db, "employees", employee.id);
      await setDoc(employeeRef, {
        name: employee.name,
        role: employee.role,
        salary: employee.salary,
        color: employee.color,
      }, { merge: true });
      toast({ title: 'Employee Updated', description: 'Employee information has been updated.' });
    } catch (error) {
      console.error("Error updating employee: ", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update employee details.' });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
      updateEmployee(employee);
      setEditingEmployee(null);
  }

  const deleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, "employees", employeeId));
      toast({ title: 'Employee Deleted', description: 'Employee has been removed from the database.' });
    } catch (error) {
      console.error("Error deleting employee: ", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the employee.' });
    }
  };

  const handleDeleteEmployee = (employeeId: string) => {
      deleteEmployee(employeeId);
  }
  
  const openEditEmployeeDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  }

  const openAdvanceDialog = (advance: Advance | null) => {
    setEditingAdvance(advance);
    setIsAdvanceDialogOpen(true);
  }

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="employees">
        <TabsList className="m-2 self-center rounded-lg bg-primary/10 p-2">
          <TabsTrigger value="employees" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Employee List</TabsTrigger>
          <TabsTrigger value="attendance" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Attendance & Advance</TabsTrigger>
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
                    <TableHead>Salary (₹)</TableHead>
                    <TableHead>Advance (₹)</TableHead>
                    <TableHead>Remaining Salary (₹)</TableHead>
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
                        <TableCell className="font-mono text-xs text-muted-foreground">{employee.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                            {employee.name}
                          </div>
                        </TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200">{employee.salary.toLocaleString()}</TableCell>
                        <TableCell className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200">{totalAdvance.toLocaleString()}</TableCell>
                        <TableCell className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200">{remainingSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditEmployeeDialog(employee)}>
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
                <CardDescription>Select a date to view attendance and advance details.</CardDescription>
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
                  <Button onClick={() => openAdvanceDialog(null)}>
                    <span className="mr-2">₹</span> Add Advance
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
                      <li key={index} className="flex justify-between items-center p-2 bg-muted rounded-md group">
                        <div className="flex items-center gap-2">
                          {employee && <span className={cn('h-2 w-2 rounded-full', employee.color)} />}
                          <span>{employee ? employee.name : 'Unknown Employee'}:</span>
                          <span className="font-mono font-bold">₹{advance.amount.toLocaleString()}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdvanceDialog(advance)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this advance?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will delete the advance of ₹{advance.amount} for {employee?.name}. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteAdvance(advance.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
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

      <AddOrEditAdvanceDialog 
        open={isAdvanceDialogOpen}
        onOpenChange={setIsAdvanceDialogOpen}
        employees={employees}
        onSave={handleSaveAdvance}
        selectedDate={selectedDate || new Date()}
        existingAdvance={editingAdvance}
      />

      <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isAddEmployeeDialogOpen || isEditEmployeeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEmployee(null);
            setIsAddEmployeeDialogOpen(false);
            setIsEditEmployeeDialogOpen(false);
          } else if (editingEmployee) {
            setIsEditEmployeeDialogOpen(true);
          } else {
            setIsAddEmployeeDialogOpen(true);
          }
        }}
        employee={editingEmployee}
        onSave={(employeeData) => {
            if (editingEmployee) {
                handleEditEmployee({ ...editingEmployee, ...employeeData });
            } else {
                handleAddEmployee(employeeData as Omit<Employee, 'id' | 'color'>);
            }
        }}
      />
    </div>
  );
}

function EmployeeDialog({ open, onOpenChange, employee, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null; onSave: (data: Omit<Employee, 'id' | 'color'> & {id?: string}) => void;}) {
    
    const [name, setName] = useState(employee?.name || '');
    const [role, setRole] = useState(employee?.role || '');
    const [salary, setSalary] = useState(employee?.salary.toString() || '');
    
    useEffect(() => {
        if (open) {
            setName(employee?.name || '');
            setRole(employee?.role || '');
            setSalary(employee?.salary.toString() || '');
        }
    }, [open, employee]);
    
    const handleSave = () => {
        const data: Omit<Employee, 'color' | 'id'> & {id?: string} = { name, role, salary: parseFloat(salary) };
        if (employee) {
            data.id = employee.id;
        }
        onSave(data);
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
                    <Label htmlFor="name">Employee Name</Label>
                    <Input id="name" placeholder="e.g., John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole} required>
                        <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Chef">Chef</SelectItem>
                        <SelectItem value="Waiter">Waiter</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                        <SelectItem value="Bar Tender">Bar Tender</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input id="salary" type="number" placeholder="e.g., 30000" value={salary} onChange={(e) => setSalary(e.target.value)} required/>
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

    