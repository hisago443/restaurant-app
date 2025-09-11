
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarProps } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Check, X, CircleSlash, Pencil, UserCheck, UserX, UserMinus, Banknote } from 'lucide-react';
import type { Employee, Advance, Attendance, AttendanceStatus } from '@/lib/types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { DayContent, DayContentProps } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const attendanceStatusConfig: Record<AttendanceStatus, { icon: React.ElementType, color: string, label: string, className: string }> = {
  'Present': { icon: UserCheck, color: 'green', label: 'Present', className: 'bg-green-500 hover:bg-green-600 text-white' },
  'Absent': { icon: UserX, color: 'red', label: 'Absent', className: 'bg-red-500 hover:bg-red-600 text-white' },
  'Half-day': { icon: UserMinus, color: 'yellow', label: 'Half-day', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' }
};

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

interface StaffManagementProps {
  employees: Employee[];
}

export default function StaffManagement({ employees: initialEmployees }: StaffManagementProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showAdvancesOnCalendar, setShowAdvancesOnCalendar] = useState(false);
  const [showAbsencesOnCalendar, setShowAbsencesOnCalendar] = useState(false);

  useEffect(() => {
    const unsubEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
      setEmployees(data);
    });

    const unsubAdvances = onSnapshot(collection(db, "advances"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() } as Advance));
        setAdvances(data.sort((a,b) => b.date.getTime() - a.date.getTime()));
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() } as Attendance));
        setAttendance(data);
    });

    return () => {
      unsubEmployees();
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

  const datesWithAdvance = useMemo(() => {
    if (!showAdvancesOnCalendar) return [];
    return advances.map(a => startOfDay(a.date));
  }, [advances, showAdvancesOnCalendar]);
  
  const datesWithAbsence = useMemo(() => {
    if (!showAbsencesOnCalendar) return [];
    return attendance
      .filter(a => a.status === 'Absent')
      .map(a => startOfDay(a.date));
  }, [attendance, showAbsencesOnCalendar]);

  const generateNewEmployeeId = () => {
    const existingIds = employees.map(e => parseInt(e.id.replace('UA', ''), 10)).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `UA${(maxId + 1).toString().padStart(3, '0')}`;
  }
  
  const handleSaveEmployee = async (employeeData: Omit<Employee, 'id' | 'color'> & { id?: string }) => {
    const { id, ...data } = employeeData;
    if (id) {
        try {
            const employeeRef = doc(db, "employees", id);
            await setDoc(employeeRef, data, { merge: true });
            toast({ title: 'Employee Updated' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    } else {
        try {
            const newId = generateNewEmployeeId();
            const employeeRef = doc(db, "employees", newId);
            const newEmployeeData = {
                ...data,
                id: newId,
                color: colors[employees.length % colors.length]
            };
            await setDoc(employeeRef, newEmployeeData);
            toast({ title: 'Employee Added', description: `${data.name} saved with ID ${newId}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed' });
        }
    }
  };
  
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, "employees", employeeId));
      toast({ title: 'Employee Deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Delete Failed' });
    }
  };
  
  const openEmployeeDialog = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };
  
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

  const CustomDay = (props: DayContentProps) => {
    const { date } = props;
    const dayAdvances = showAdvancesOnCalendar ? advances.filter(a => isSameDay(a.date, date)) : [];
    const dayAbsences = showAbsencesOnCalendar ? attendance.filter(a => isSameDay(a.date, date) && a.status === 'Absent') : [];

    const events = [
      ...dayAdvances.map(a => ({ type: 'advance', employeeId: a.employeeId })),
      ...dayAbsences.map(a => ({ type: 'absence', employeeId: a.employeeId }))
    ];
    
    const uniqueEmployeeIds = new Set(events.map(e => e.employeeId));

    return (
        <div className="relative h-full w-full flex items-center justify-center">
            <DayContent {...props} />
            {uniqueEmployeeIds.size > 0 && (
                <div className="absolute bottom-0.5 flex items-center justify-center space-x-1">
                    {Array.from(uniqueEmployeeIds).slice(0, 5).map(employeeId => {
                        const employee = employees.find(e => e.id === employeeId);
                        if (!employee) return null;
                        
                        const wasAbsent = dayAbsences.some(a => a.employeeId === employeeId);
                        
                        return (
                            <TooltipProvider key={employeeId}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span 
                                            className={cn(
                                                "h-2.5 w-2.5 rounded-full",
                                                employee.color,
                                                wasAbsent && "ring-1 ring-offset-1 ring-destructive"
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{employee.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    })}
                </div>
            )}
        </div>
    );
  }

  const totalAdvanceForDay = useMemo(() => {
    return advancesForSelectedDate.reduce((sum, advance) => sum + advance.amount, 0);
  }, [advancesForSelectedDate]);


  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-primary text-black p-1 h-auto rounded-lg">
          <TabsTrigger value="attendance" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-black text-lg">Attendance &amp; Advance</TabsTrigger>
          <TabsTrigger value="employees" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-black text-lg">Employee List</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <Card className="flex flex-col p-0 border-black shadow-lg">
                  <div className='flex justify-center bg-blue-100 dark:bg-blue-900/20 rounded-t-lg'>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setSelectedDate(date || new Date())}
                        className="rounded-t-lg"
                        components={{ DayContent: CustomDay }}
                        modifiers={{
                          advance: datesWithAdvance,
                          absent: datesWithAbsence,
                        }}
                        modifiersStyles={{
                          advance: { border: '2px solid hsl(var(--primary))' },
                          absent: { 
                            backgroundColor: 'hsl(var(--destructive) / 0.2)',
                            color: 'hsl(var(--destructive))',
                          },
                        }}
                    />
                  </div>
                  <div className="p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                          <Checkbox id="show-advances" checked={showAdvancesOnCalendar} onCheckedChange={(checked) => setShowAdvancesOnCalendar(Boolean(checked))} />
                          <Label htmlFor="show-advances" className="font-bold">Show Advance Dates</Label>
                      </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="show-absences" checked={showAbsencesOnCalendar} onCheckedChange={(checked) => setShowAbsencesOnCalendar(Boolean(checked))} />
                          <Label htmlFor="show-absences" className="font-bold">Show Absent Dates</Label>
                      </div>
                  </div>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Advances for {format(selectedDate, 'PPP')}</CardTitle>
                    {totalAdvanceForDay > 0 && (
                        <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-200">
                          <span className="font-bold">Total: Rs. {totalAdvanceForDay.toLocaleString()}</span>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="max-h-48 overflow-y-auto pt-2">
                        {advancesForSelectedDate.length > 0 ? (
                            <div className="space-y-2">
                                {advancesForSelectedDate.map(advance => {
                                    const employee = employees.find(e => e.id === advance.employeeId);
                                    return (
                                    <div key={advance.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg group">
                                        <div className='flex items-center gap-2'>
                                            <span className={cn("h-2.5 w-2.5 rounded-full", employee?.color)} />
                                            <div>
                                                <p className="font-medium text-lg">{employee?.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-200">
                                              <span className="text-xl font-bold">Rs. {advance.amount.toLocaleString()}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openAdvanceDialog(advance)}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center py-4">
                                <p className="text-muted-foreground text-sm">No advances on this date.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Attendance for {format(selectedDate, 'PPP')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {employees.map(employee => {
                          const attendanceRecord = attendanceForSelectedDate.find(a => a.employeeId === employee.id);
                          return (
                              <div key={employee.id} className="flex items-center gap-4 p-2 border rounded-lg bg-muted/30">
                                  <div className="flex-grow flex items-center gap-3">
                                      <span className={cn("h-3 w-3 rounded-full", employee.color)} />
                                      <span className="font-semibold text-lg">{employee.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      {(Object.keys(attendanceStatusConfig) as AttendanceStatus[]).map(status => {
                                          const isSelected = attendanceRecord?.status === status;
                                          const config = attendanceStatusConfig[status];
                                          return (
                                              <Button 
                                                  key={status}
                                                  variant={isSelected ? 'default' : 'outline'}
                                                  onClick={() => handleMarkAttendance(employee.id, status)}
                                                  className={cn("h-10 w-32", isSelected && config.className)}
                                              >
                                                  {React.createElement(config.icon, {className: "mr-2 h-5 w-5"})}
                                                  {config.label}
                                              </Button>
                                          )
                                      })}
                                      <TooltipProvider>
                                          <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" onClick={() => openNotesDialog(employee.id)}>
                                              <Pencil className="h-4 w-4" />
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Add/Edit Note</TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  </div>
                              </div>
                          )
                      })}
                  </CardContent>
                </Card>
                <Button size="lg" className="w-full h-16 text-lg" onClick={() => openAdvanceDialog(null)}>
                    <Banknote className="mr-4 h-8 w-8" /> Add Salary Advance
                </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="employees">
          <Card className="bg-muted/30 mt-4">
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div>
                  <CardTitle>Employees &amp; Advances</CardTitle>
                  <CardDescription>Manage staff salary and advance information.</CardDescription>
                </div>
                <Button onClick={() => openEmployeeDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground border-r text-lg">ID</TableHead>
                      <TableHead className="font-bold text-foreground border-r text-lg">Employee</TableHead>
                      <TableHead className="font-bold text-foreground border-r text-lg">Role</TableHead>
                      <TableHead className="font-bold text-foreground border-r text-lg">Salary</TableHead>
                      <TableHead className="font-bold text-foreground border-r text-lg">Total Advance</TableHead>
                      <TableHead className="font-bold text-foreground text-lg">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const totalAdvance = (advancesByEmployee[employee.id] || []).reduce((sum, a) => sum + a.amount, 0);
                      const remainingSalary = employee.salary - totalAdvance;
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-mono text-sm border-r font-bold">{employee.id}</TableCell>
                          <TableCell className="border-r font-bold">
                            <div className="flex items-center gap-2 font-medium">
                              <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                              {employee.name}
                            </div>
                          </TableCell>
                          <TableCell className="border-r font-bold">{employee.role}</TableCell>
                          <TableCell className="font-mono text-sm bg-blue-100 text-black border-r font-bold">₹{employee.salary.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-sm bg-red-100 text-black border-r font-bold">₹{totalAdvance.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-sm bg-green-100 text-black font-bold">₹{remainingSalary.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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

      <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isEmployeeDialogOpen}
        onOpenChange={setIsEmployeeDialogOpen}
        employee={editingEmployee}
        onSave={(employeeData) => {
            handleSaveEmployee(employeeData as Omit<Employee, 'id'|'color'> & {id?: string});
            setIsEmployeeDialogOpen(false);
            setEditingEmployee(null);
        }}
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
            <Label>Employee</Label>
            <div className="grid grid-cols-3 gap-2">
                {employees.map(e => (
                    <Button 
                        key={e.id}
                        variant={employeeId === e.id ? 'default' : 'outline'}
                        onClick={() => setEmployeeId(e.id)}
                        disabled={!!existingAdvance}
                        className="flex items-center justify-start gap-2"
                    >
                        <span className={cn("h-2 w-2 rounded-full", e.color)} />
                        {e.name}
                    </Button>
                ))}
            </div>
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

function EmployeeDialog({ open, onOpenChange, employee, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null; onSave: (data: Omit<Employee, 'id' | 'color'> & {id?: string}) => void;}) {
    const [name, setName] = useState(employee?.name || '');
    const [role, setRole] = useState(employee?.role || '');
    const [salary, setSalary] = useState(employee?.salary?.toString() || '');
    
    useEffect(() => {
        if (open) {
            setName(employee?.name || '');
            setRole(employee?.role || '');
            setSalary(employee?.salary?.toString() || '');
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
                        <SelectItem value="Head Chef">Head Chef</SelectItem>
                        <SelectItem value="Chef">Chef</SelectItem>
                        <SelectItem value="Waiter">Waiter</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                        <SelectItem value="Helper">Helper</SelectItem>
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





    

    

    