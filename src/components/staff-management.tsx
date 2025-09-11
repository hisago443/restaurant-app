

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2, Check, X, CircleSlash, Pencil, UserCheck, UserX, UserMinus } from 'lucide-react';
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

  const [showAdvancesOnCalendar, setShowAdvancesOnCalendar] = useState(false);
  const [showAbsencesOnCalendar, setShowAbsencesOnCalendar] = useState(false);

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

  const CustomDay = (props: DayContentProps) => {
    const { date } = props;
    const dayAdvances = showAdvancesOnCalendar ? advances.filter(a => isSameDay(a.date, date)) : [];
    const dayAbsences = showAbsencesOnCalendar ? attendance.filter(a => isSameDay(a.date, date) && a.status === 'Absent') : [];

    const events = [
      ...dayAdvances.map(a => ({ type: 'advance', employeeId: a.employeeId })),
      ...dayAbsences.map(a => ({ type: 'absence', employeeId: a.employeeId }))
    ];
    
    // Use a Set to only show one dot per employee per day, even if they have multiple events
    const uniqueEmployeeIds = new Set(events.map(e => e.employeeId));

    return (
        <div className="relative h-full w-full flex items-center justify-center">
            <DayContent {...props} />
            {uniqueEmployeeIds.size > 0 && (
                <div className="absolute bottom-1.5 flex items-center justify-center space-x-1.5">
                    {Array.from(uniqueEmployeeIds).map(employeeId => {
                        const employee = employees.find(e => e.id === employeeId);
                        if (!employee) return null;
                        
                        const wasAbsent = dayAbsences.some(a => a.employeeId === employeeId);
                        
                        return (
                            <div 
                                key={employeeId} 
                                className={cn(
                                    "h-3 w-3 rounded-full",
                                    employee.color,
                                    wasAbsent && "ring-2 ring-offset-1 ring-destructive"
                                )}
                                title={employee.name}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    );
  }


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
                                <TableCell className="font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200">{employee.salary.toLocaleString()}</TableCell>
                                <TableCell className="font-mono bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200">{totalAdvance.toLocaleString()}</TableCell>
                                <TableCell className="font-mono bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200">{remainingSalary.toLocaleString()}</TableCell>
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
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center justify-center p-2 bg-violet-50 dark:bg-violet-900/20">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  className="rounded-md border bg-background"
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
                 <div className="space-y-2 mt-4 p-4 border rounded-md w-full bg-background/50">
                    <h4 className="font-semibold text-sm mb-2">Calendar Highlights:</h4>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-advances" checked={showAdvancesOnCalendar} onCheckedChange={(checked) => setShowAdvancesOnCalendar(Boolean(checked))} />
                        <Label htmlFor="show-advances">Show Advances Given</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-absences" checked={showAbsencesOnCalendar} onCheckedChange={(checked) => setShowAbsencesOnCalendar(Boolean(checked))} />
                        <Label htmlFor="show-absences">Show Absent Days</Label>
                    </div>
                 </div>
            </Card>
            <div className="space-y-6">
               <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-md">
                <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-200">Add Salary Advance</CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                        Log an advance for any employee for the selected date: {format(selectedDate, 'PPP')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button size="lg" className="w-full h-12 text-base" onClick={() => openAdvanceDialog(null)}>
                        <PlusCircle className="mr-2 h-5 w-5" /> Add Salary Advance
                    </Button>
                </CardContent>
              </Card>

               <Card className="bg-violet-50 dark:bg-violet-900/20">
                <CardHeader>
                    <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Staff Attendance</CardTitle>
                        <CardDescription>Manage for {format(selectedDate, 'PPP')}</CardDescription>
                    </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {employees.map(employee => {
                            const attendanceRecord = attendanceForSelectedDate.find(a => a.employeeId === employee.id);
                            return (
                            <div key={employee.id} className="flex justify-between items-center p-2 bg-background/50 rounded-lg group">
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
                                            onClick={() => handleMarkAttendance(employee.id, status)}
                                            className={cn("h-16 w-24 flex flex-col items-center justify-center gap-1 text-xs", isSelected && attendanceStatusConfig[status].className)}
                                        >
                                            {React.createElement(attendanceStatusConfig[status].icon, {className: "h-5 w-5"})}
                                            <span>{attendanceStatusConfig[status].label}</span>
                                        </Button>
                                      )
                                    })}
                                    <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openNotesDialog(employee.id)}>
                                                  <Pencil className="h-4 w-4" />
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>Add/Edit Note</p>
                                          </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                </CardContent>
              </Card>

              <Card className="bg-violet-50 dark:bg-violet-900/20">
                <CardHeader>
                    <CardTitle className="text-lg">Advances Given on {format(selectedDate, 'do MMMM')}</CardTitle>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-2">
                    {advancesForSelectedDate.length > 0 ? (
                        advancesForSelectedDate.map(advance => {
                            const employee = employees.find(e => e.id === advance.employeeId);
                            const totalAdvance = (advancesByEmployee[advance.employeeId] || []).reduce((sum, a) => sum + a.amount, 0);
                            return (
                                <div key={advance.id} className="flex justify-between items-center p-3 bg-background/50 rounded-lg group">
                                    <div className="flex items-center gap-2">
                                        <span className={cn('h-2.5 w-2.5 rounded-full', employee?.color)} />
                                        <div>
                                            <p className="font-semibold">{employee?.name || 'Unknown Employee'}</p>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                Today: Rs. {advance.amount.toLocaleString()} / Total: Rs. {totalAdvance.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-muted-foreground text-sm text-center pt-4">No advances were given on this date.</p>
                    )}
                    </div>
                 </CardContent>
              </Card>
            </div>
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
    

    



