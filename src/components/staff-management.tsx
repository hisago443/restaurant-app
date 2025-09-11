

"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, Check, X, CircleSlash, Pencil, UserCheck, UserX, UserMinus } from 'lucide-react';
import type { Employee, Advance, Attendance, AttendanceStatus } from '@/lib/types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

const attendanceStatusConfig: Record<AttendanceStatus, { icon: React.ElementType, color: string, label: string, className: string }> = {
  'Present': { icon: UserCheck, color: 'green', label: 'Present', className: 'bg-green-500 hover:bg-green-600 text-white' },
  'Absent': { icon: UserX, color: 'red', label: 'Absent', className: 'bg-red-500 hover:bg-red-600 text-white' },
  'Half-day': { icon: UserMinus, color: 'yellow', label: 'Half-day', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' }
};

interface StaffManagementProps {
  employees: Employee[];
}

export default function StaffManagement({ employees }: StaffManagementProps) {
  const { toast } = useToast();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

  useEffect(() => {
    const unsubAdvances = onSnapshot(collection(db, "advances"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() } as Advance));
        setAdvances(data.sort((a,b) => b.date.getTime() - a.date.getTime()));
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() } as Attendance));
        setAttendance(data);
    });

    return () => {
      unsubAdvances();
      unsubAttendance();
    };
  }, []);

  const advancesForSelectedDate = useMemo(() => advances.filter(
    (advance) => isSameDay(advance.date, selectedDate)
  ), [advances, selectedDate]);
  
  const attendanceForSelectedDate = useMemo(() => attendance.filter(
    (att) => isSameDay(att.date, selectedDate)
  ), [attendance, selectedDate]);

  const datesWithAdvance = useMemo(() => advances.map(a => startOfDay(a.date)), [advances]);
  const datesWithAttendance = useMemo(() => attendance.map(a => startOfDay(a.date)), [attendance]);
  
  const handleSaveAdvance = async (advance: Omit<Advance, 'id'> & {id?: string}) => {
    const { id, ...advanceData } = advance;
    if (id) {
        try {
            await updateDoc(doc(db, "advances", id), advanceData);
            toast({ title: 'Advance Updated' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    } else {
        try {
            await addDoc(collection(db, "advances"), advanceData);
            toast({ title: 'Advance Saved' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed' });
        }
    }
  }

  const handleDeleteAdvance = async (advanceId: string) => {
    try {
        await deleteDoc(doc(db, "advances", advanceId));
        toast({ title: 'Advance Deleted' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Delete Failed' });
    }
  }
  
  const openAdvanceDialog = (advance: Advance | null) => {
    setEditingAdvance(advance);
    setIsAdvanceDialogOpen(true);
  }

  const handleMarkAttendance = async (employeeId: string, status: AttendanceStatus) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const attendanceId = `${employeeId}_${dateKey}`;
    const attendanceDocRef = doc(db, 'attendance', attendanceId);
    
    const record: Omit<Attendance, 'id'> = {
      employeeId,
      date: startOfDay(selectedDate),
      status,
    };

    try {
      await setDoc(attendanceDocRef, record, { merge: true });
      toast({
        title: `Attendance Marked`,
        description: `${employees.find(e => e.id === employeeId)?.name} marked as ${status}.`
      })
    } catch(e) {
      console.error("Error marking attendance: ", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save attendance.' })
    }
  }
  
  const handleSaveNote = async (note: string) => {
    if (!editingAttendance) return;
    try {
      const attendanceRef = doc(db, "attendance", editingAttendance.id);
      await updateDoc(attendanceRef, { notes: note });
      toast({ title: 'Note Saved' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed' });
    }
    setIsNotesDialogOpen(false);
    setEditingAttendance(null);
  }

  const openNotesDialog = (employeeId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const attendanceId = `${employeeId}_${dateKey}`;
    const record = attendance.find(a => a.id === attendanceId);
    if(record) {
      setEditingAttendance(record);
      setIsNotesDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Mark Attendance First', description: 'You must mark attendance before adding a note.' })
    }
  }

  const advancesByEmployee = useMemo(() => {
    return advances.reduce((acc, advance) => {
      if (!acc[advance.employeeId]) {
        acc[advance.employeeId] = [];
      }
      acc[advance.employeeId].push(advance);
      return acc;
    }, {} as Record<string, Advance[]>);
  }, [advances]);

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="attendance">
        <TabsList className="m-2 self-center rounded-lg bg-primary/10 p-2">
          <TabsTrigger value="employees" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Employee List</TabsTrigger>
          <TabsTrigger value="attendance" className="px-6 py-2 text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">Attendance & Advance</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle>Employees</CardTitle>
                    <CardDescription>A read-only list of your restaurant staff and their salary details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Salary (Rs.)</TableHead>
                            <TableHead>Total Advance (Rs.)</TableHead>
                            <TableHead>Remaining Salary (Rs.)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {employees.map((employee) => {
                            const totalAdvance = (advancesByEmployee[employee.id] || []).reduce((sum, a) => sum + a.amount, 0);

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
                            </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Advance History</CardTitle>
                        <CardDescription>A complete log of all salary advances.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-96">
                          <div className="space-y-4 pr-4">
                            {Object.keys(advancesByEmployee).length > 0 ? (
                                Object.entries(advancesByEmployee).map(([employeeId, employeeAdvances]) => {
                                    const employee = employees.find(e => e.id === employeeId);
                                    if (!employee) return null;
                                    
                                    return (
                                        <div key={employeeId} className="p-3 bg-muted rounded-md">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <span className={cn('h-2.5 w-2.5 rounded-full', employee.color)} />
                                                    {employee.name}
                                                </div>
                                            </div>
                                            <ul className="space-y-1">
                                                {employeeAdvances.map(advance => (
                                                    <li key={advance.id} className="flex justify-between items-center p-2 bg-background/50 rounded-md group text-sm">
                                                        <div>
                                                            <span className="font-mono font-semibold">Rs. {advance.amount.toLocaleString()}</span>
                                                            <span className="text-muted-foreground ml-2">on {format(advance.date, 'PPP')}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-muted-foreground text-center p-8">No advance history found.</p>
                            )}
                          </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="attendance">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Select a date to manage records.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  className="rounded-md border"
                  modifiers={{
                    advance: datesWithAdvance,
                    attendance: datesWithAttendance,
                  }}
                  modifiersStyles={{
                    advance: { border: '2px solid hsl(var(--primary))' },
                    attendance: { textDecoration: 'underline' },
                  }}
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Manage for {format(selectedDate, 'PPP')}</CardTitle>
                    <CardDescription>Mark attendance and record salary advances.</CardDescription>
                  </div>
                  <Button onClick={() => openAdvanceDialog(null)}>
                    <span className="mr-2">Rs.</span> Add Advance
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <h3 className="font-semibold mb-2 text-lg">Staff Attendance</h3>
                    <div className="space-y-2">
                        {employees.map(employee => {
                            const attendanceRecord = attendanceForSelectedDate.find(a => a.employeeId === employee.id);
                            return (
                            <div key={employee.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg group">
                                <div className="flex items-center gap-2 font-medium">
                                    <span className={cn('h-2.5 w-2.5 rounded-full', employee.color)} />
                                    {employee.name}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {(Object.keys(attendanceStatusConfig) as AttendanceStatus[]).map(status => {
                                      const isSelected = attendanceRecord?.status === status;
                                      return (
                                        <Button 
                                          key={status} 
                                          variant={isSelected ? 'default' : 'outline'}
                                          size="sm"
                                          onClick={() => handleMarkAttendance(employee.id, status)}
                                          className={cn(isSelected && attendanceStatusConfig[status].className)}
                                        >
                                          {React.createElement(attendanceStatusConfig[status].icon, {className: "h-4 w-4"})}
                                          <span className="ml-2 hidden sm:inline">{attendanceStatusConfig[status].label}</span>
                                        </Button>
                                      )
                                    })}
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openNotesDialog(employee.id)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="font-semibold mb-2 text-lg">Advances Given on {format(selectedDate, 'do MMMM')}</h3>
                    <div className="space-y-2">
                    {advancesForSelectedDate.length > 0 ? (
                        advancesForSelectedDate.map(advance => {
                            const employee = employees.find(e => e.id === advance.employeeId);
                            return (
                                <div key={advance.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg group">
                                    <div className="flex items-center gap-2">
                                        <span className={cn('h-2.5 w-2.5 rounded-full', employee?.color)} />
                                        <div>
                                            <p className="font-semibold">{employee?.name || 'Unknown Employee'}</p>
                                            <p className="text-sm text-muted-foreground font-mono">Rs. {advance.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAdvanceDialog(advance)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this advance?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will delete the advance of Rs. {advance.amount} for {employee?.name}. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteAdvance(advance.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-muted-foreground text-sm text-center pt-4">No advances were given on this date.</p>
                    )}
                    </div>
                </div>
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
      
      <NotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        attendance={editingAttendance}
        onSave={handleSaveNote}
      />
    </div>
  );
}

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
  onSave: (advance: Omit<Advance, 'id' | 'date'> & { id?: string, date: Date }) => void;
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
        date: startOfDay(selectedDate),
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

function NotesDialog({
  open,
  onOpenChange,
  attendance,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: Attendance | null;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  
  useEffect(() => {
    if (attendance) {
      setNote(attendance.notes || '');
    }
  }, [attendance]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add/Edit Note</DialogTitle>
            {attendance && <DialogDescription>For attendance on {format(attendance.date, 'PPP')}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Arrived 30 minutes late."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSave(note)}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}
    
