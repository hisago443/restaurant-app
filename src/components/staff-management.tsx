
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
import { PlusCircle, Edit, Trash2, Check, X, CircleSlash, Pencil, UserCheck, UserX, UserMinus, Banknote, Eye } from 'lucide-react';
import type { Employee, Advance, Attendance, AttendanceStatus } from '@/lib/types';
import { format, isSameDay, startOfDay, isToday, isPast, getMonth, getYear, getDaysInMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { DayContent, DayContentProps } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const attendanceStatusConfig: Record<AttendanceStatus, { icon: React.ElementType, color: string, label: string, className: string }> = {
  'Present': { icon: UserCheck, color: 'green', label: 'Present', className: 'bg-green-500 hover:bg-green-600 text-white' },
  'Absent': { icon: UserX, color: 'red', label: 'Absent', className: 'bg-red-500 hover:bg-red-600 text-white' },
  'Half-day': { icon: UserMinus, color: 'yellow', label: 'Half-day', className: 'bg-yellow-500 hover:bg-yellow-600 text-black' }
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
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [summaryEmployee, setSummaryEmployee] = useState<Employee | null>(null);
  const [isAttendanceListDialogOpen, setIsAttendanceListDialogOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<{ title: string, employees: Employee[] }>({ title: '', employees: [] });

  const [showAdvancesOnCalendar, setShowAdvancesOnCalendar] = useState(false);
  const [showAbsencesOnCalendar, setShowAbsencesOnCalendar] = useState(false);

  const isDateLocked = isPast(selectedDate) && !isToday(selectedDate);

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
  
  const openAdvanceDialog = (advance: Advance | null, employee?: Employee) => {
    setEditingAdvance(advance);
    if (!advance && employee) {
      setEditingAdvance({ employeeId: employee.id } as Advance);
    }
    setIsAdvanceDialogOpen(true);
  }

  const handleMarkAttendance = async (employeeId: string, status: AttendanceStatus) => {
    if (isDateLocked) {
      return;
    }
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
  
  const openSummaryDialog = (employee: Employee) => {
    setSummaryEmployee(employee);
    setIsSummaryDialogOpen(true);
  }

  const openAttendanceListDialog = (status: AttendanceStatus) => {
    const employeeIds = attendanceForSelectedDate.filter(att => att.status === status).map(att => att.employeeId);
    const employeeList = employees.filter(emp => employeeIds.includes(emp.id));
    setAttendanceList({ title: `${status} Employees`, employees: employeeList });
    setIsAttendanceListDialogOpen(true);
  };

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

    const employeeSummaries = useMemo(() => {
    const now = new Date();
    const currentMonth = getMonth(now);
    const currentYear = getYear(now);
    
    return employees.map(employee => {
        const monthlyAdvances = advances.filter(a => 
            a.employeeId === employee.id &&
            getMonth(a.date) === currentMonth &&
            getYear(a.date) === currentYear
        );

        const totalAdvance = monthlyAdvances.reduce((sum, a) => sum + a.amount, 0);
        const remainingSalary = employee.salary - totalAdvance;
        
        return {
            employeeId: employee.id,
            totalAdvance,
            remainingSalary,
        };
    });
  }, [employees, advances]);

  const dailyAttendanceSummary = useMemo(() => {
    const summary = {
      'Present': 0,
      'Absent': 0,
      'Half-day': 0,
    };
    attendanceForSelectedDate.forEach(att => {
      summary[att.status]++;
    });
    return summary;
  }, [attendanceForSelectedDate]);


  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted p-1 h-auto rounded-lg">
          <TabsTrigger value="attendance" className="py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md text-base">Attendance &amp; Advance</TabsTrigger>
          <TabsTrigger value="employees" className="py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md text-base">Employee List</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <Card className="flex flex-col p-0 shadow-lg">
                  <div className='flex justify-center bg-card rounded-t-lg'>
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
                  <div className="p-4 space-y-2 border-t">
                      <div className="flex items-center space-x-2">
                          <Checkbox id="show-advances" checked={showAdvancesOnCalendar} onCheckedChange={(checked) => setShowAdvancesOnCalendar(Boolean(checked))} />
                          <Label htmlFor="show-advances">Show Advance Dates</Label>
                      </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="show-absences" checked={showAbsencesOnCalendar} onCheckedChange={(checked) => setShowAbsencesOnCalendar(Boolean(checked))} />
                          <Label htmlFor="show-absences">Show Absent Dates</Label>
                      </div>
                  </div>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle>Daily Attendance Summary</CardTitle>
                    <CardDescription>For {format(selectedDate, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg cursor-pointer hover:bg-green-200 dark:hover:bg-green-900" onClick={() => openAttendanceListDialog('Present')}>
                            <p className="text-sm text-green-800 dark:text-green-200">Present</p>
                            <p className="text-3xl font-bold">{dailyAttendanceSummary['Present']}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900" onClick={() => openAttendanceListDialog('Half-day')}>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">Half-day</p>
                            <p className="text-3xl font-bold">{dailyAttendanceSummary['Half-day']}</p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg cursor-pointer hover:bg-red-200 dark:hover:bg-red-900" onClick={() => openAttendanceListDialog('Absent')}>
                            <p className="text-sm text-red-800 dark:text-red-200">Absent</p>
                            <p className="text-3xl font-bold">{dailyAttendanceSummary['Absent']}</p>
                        </div>
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
                              <div key={employee.id} className="flex items-center gap-4 p-2 border rounded-lg bg-card">
                                  <div className="flex-grow flex items-center gap-3">
                                      <span className={cn("h-3 w-3 rounded-full", employee.color)} />
                                      <div>
                                          <span className="font-semibold text-base">{employee.name}</span>
                                          <p className="text-xs text-muted-foreground font-mono">{employee.id}</p>
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => openAdvanceDialog(null, employee)} disabled={isDateLocked} className="ml-4">
                                          <Banknote className="h-5 w-5 text-primary" />
                                      </Button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      {(Object.keys(attendanceStatusConfig) as AttendanceStatus[]).map(status => {
                                          const isSelected = attendanceRecord?.status === status;
                                          const config = attendanceStatusConfig[status];
                                          return (
                                              <Button 
                                                  key={status}
                                                  variant={isSelected ? 'default' : 'outline'}
                                                  onClick={() => handleMarkAttendance(employee.id, status)}
                                                  className={cn("h-10 w-24", isSelected && config.className)}
                                                  disabled={isDateLocked}
                                              >
                                                  <config.icon className="mr-2 h-4 w-4"/>
                                                  {config.label}
                                              </Button>
                                          )
                                      })}
                                       <Button variant="ghost" size="icon" onClick={() => openNotesDialog(employee.id)} disabled={!attendanceRecord}>
                                          <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSummaryDialog(employee)}>
                                          <Eye className="h-4 w-4" />
                                      </Button>
                                  </div>
                              </div>
                          )
                      })}
                  </CardContent>
                </Card>
                 <Button size="lg" className="w-full h-14 text-base" onClick={() => openAdvanceDialog(null, undefined)} disabled={isDateLocked}>
                    <Banknote className="mr-4 h-6 w-6" /> Add Salary Advance
                </Button>
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
                                                    <p className="font-medium">{employee?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-200">
                                                <span className="font-bold">Rs. {advance.amount.toLocaleString()}</span>
                                                </div>
                                                {!isDateLocked &&
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openAdvanceDialog(advance, undefined)}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                                }
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
          </div>
        </TabsContent>
        <TabsContent value="employees">
          <Card className="mt-4">
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div>
                  <CardTitle>Employees List</CardTitle>
                  <CardDescription>Manage staff information and view monthly salary details.</CardDescription>
                </div>
                <Button onClick={() => openEmployeeDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground text-base">ID</TableHead>
                      <TableHead className="font-bold text-foreground text-base">Employee</TableHead>
                      <TableHead className="font-bold text-foreground text-base">Role</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">Base Salary</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">Advance Taken</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">Remaining Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee, index) => {
                      const summary = employeeSummaries.find(s => s.employeeId === employee.id);
                      return (
                        <TableRow key={employee.id} className={cn(index % 2 === 0 ? 'bg-muted/50' : 'bg-background')}>
                          <TableCell className="font-mono text-xs">{employee.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                              {employee.name}
                            </div>
                          </TableCell>
                          <TableCell>{employee.role}</TableCell>
                           <TableCell className="border-l bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-600">Rs. {employee.salary.toLocaleString()}</TableCell>
                           <TableCell className="border-l bg-red-50 dark:bg-red-900/20 font-semibold text-red-600">Rs. {summary?.totalAdvance.toLocaleString()}</TableCell>
                          <TableCell className="border-l bg-green-50 dark:bg-green-900/20 font-bold text-green-700">Rs. {summary?.remainingSalary.toLocaleString()}</TableCell>
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
        readOnly={isDateLocked}
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
      {summaryEmployee && 
        <EmployeeSummaryDialog
            open={isSummaryDialogOpen}
            onOpenChange={setIsSummaryDialogOpen}
            employee={summaryEmployee}
            attendance={attendance}
            advances={advancesByEmployee[summaryEmployee.id] || []}
        />
      }

      <Dialog open={isAttendanceListDialogOpen} onOpenChange={setIsAttendanceListDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{attendanceList.title} on {format(selectedDate, 'PPP')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto py-4">
                {attendanceList.employees.length > 0 ? (
                    <ul className="space-y-2">
                        {attendanceList.employees.map(emp => (
                            <li key={emp.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                <span className={cn("h-2 w-2 rounded-full", emp.color)} />
                                <span className="font-medium">{emp.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">({emp.id})</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-center">No employees found for this status.</p>
                )}
            </div>
            <DialogFooter>
                <Button onClick={() => setIsAttendanceListDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
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
  
  const selectedEmployee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const isQuickAdd = !!(existingAdvance && !existingAdvance.id);

  useEffect(() => {
    if (open) {
      if (existingAdvance) {
        setEmployeeId(existingAdvance.employeeId);
        setAmount(String(existingAdvance.amount || ''));
      } else {
        setEmployeeId('');
        setAmount('');
      }
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
          <DialogTitle>{existingAdvance?.amount ? 'Edit' : 'Add'} Advance</DialogTitle>
          <DialogDescription>
            Record an advance for an employee on {format(selectedDate, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isQuickAdd && selectedEmployee ? (
            <div className="space-y-2">
                <Label>Employee</Label>
                <div className="p-2 border rounded-md bg-muted flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", selectedEmployee.color)} />
                    <span className="font-medium">{selectedEmployee.name}</span>
                </div>
            </div>
          ) : (
            <div className="space-y-2">
                <Label>Employee</Label>
                 <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!existingAdvance?.id}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                                <div className="flex items-center gap-2">
                                    <span className={cn("h-2 w-2 rounded-full", e.color)} />
                                    {e.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
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
  readOnly
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: Attendance | null;
  onSave: (note: string) => void;
  readOnly: boolean;
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
            <DialogTitle>{readOnly ? 'View Note' : 'Add/Edit Note'}</DialogTitle>
            {attendance && <DialogDescription>For attendance on {format(attendance.date, 'PPP')}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Arrived 30 minutes late."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              readOnly={readOnly}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {!readOnly && <Button onClick={() => onSave(note)}>Save Note</Button>}
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

function EmployeeSummaryDialog({ open, onOpenChange, employee, attendance, advances }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    attendance: Attendance[];
    advances: Advance[];
}) {
    const { summary, absentDates, halfDayDates, monthlyAdvances } = useMemo(() => {
        if (!employee) return { summary: null, absentDates: [], halfDayDates: [], monthlyAdvances: [] };
        
        const now = new Date();
        const currentMonth = getMonth(now);
        const currentYear = getYear(now);

        const monthlyAttendance = attendance.filter(a => 
            a.employeeId === employee.id &&
            getMonth(a.date) === currentMonth &&
            getYear(a.date) === currentYear
        );

        const employeeMonthlyAdvances = advances.filter(a => 
            getMonth(a.date) === currentMonth &&
            getYear(a.date) === currentYear
        );

        const absentRecords = monthlyAttendance.filter(a => a.status === 'Absent');
        const halfDayRecords = monthlyAttendance.filter(a => a.status === 'Half-day');

        const totalAdvance = employeeMonthlyAdvances.reduce((sum, a) => sum + a.amount, 0);
        const remainingSalary = employee.salary - totalAdvance;

        return {
            summary: {
                presentDays: monthlyAttendance.filter(a => a.status === 'Present').length,
                absentDays: absentRecords.length,
                halfDays: halfDayRecords.length,
                totalAdvance,
                remainingSalary,
            },
            absentDates: absentRecords.map(a => a.date),
            halfDayDates: halfDayRecords.map(a => a.date),
            monthlyAdvances: employeeMonthlyAdvances,
        }
    }, [employee, attendance, advances]);

    if (!employee || !summary) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Monthly Summary for {employee.name}</DialogTitle>
                    <DialogDescription>
                        {format(new Date(), 'MMMM yyyy')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left Column: Attendance */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Attendance Report</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <Card className="p-2 bg-green-100 dark:bg-green-900/30">
                                <CardDescription className="text-sm text-green-800 dark:text-green-200">Present</CardDescription>
                                <CardTitle className="text-2xl">{summary.presentDays}</CardTitle>
                            </Card>
                             <Card className="p-2 bg-yellow-100 dark:bg-yellow-900/30">
                                <CardDescription className="text-sm text-yellow-800 dark:text-yellow-200">Half-days</CardDescription>
                                <CardTitle className="text-2xl">{summary.halfDays}</CardTitle>
                            </Card>
                            <Card className="p-2 bg-red-100 dark:bg-red-900/30">
                                <CardDescription className="text-sm text-red-800 dark:text-red-200">Absent</CardDescription>
                                <CardTitle className="text-2xl">{summary.absentDays}</CardTitle>
                            </Card>
                        </div>
                        <ScrollArea className="h-40 space-y-4">
                            {halfDayDates.length > 0 && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-yellow-700">Half-day Dates:</h4>
                                    <div className="grid grid-cols-3 gap-1 text-sm">
                                        {halfDayDates.map(date => (
                                            <span key={date.toISOString()}>{format(date, 'MMM d')}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {absentDates.length > 0 && (
                                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                                    <h4 className="font-semibold mb-2 text-red-700">Absent Dates:</h4>
                                    <div className="grid grid-cols-3 gap-1 text-sm">
                                        {absentDates.map(date => (
                                            <span key={date.toISOString()}>{format(date, 'MMM d')}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Column: Financials */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Financial Report</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                           <Card className="p-2 bg-blue-100 dark:bg-blue-900/30">
                                <CardDescription className="text-sm text-blue-800 dark:text-blue-200">Base Salary</CardDescription>
                                <CardTitle className="text-xl">Rs. {employee.salary.toLocaleString()}</CardTitle>
                            </Card>
                            <Card className="p-2 bg-red-100 dark:bg-red-900/30">
                                <CardDescription className="text-sm text-red-800 dark:text-red-200">Advance</CardDescription>
                                <CardTitle className="text-xl">Rs. {summary.totalAdvance.toLocaleString()}</CardTitle>
                            </Card>
                            <Card className="p-2 bg-green-100 dark:bg-green-900/30">
                                <CardDescription className="text-sm text-green-800 dark:text-green-200">Remaining</CardDescription>
                                <CardTitle className="text-xl">Rs. {summary.remainingSalary.toLocaleString()}</CardTitle>
                            </Card>
                        </div>
                        <Separator />
                         <div className="space-y-2">
                            <h4 className="font-semibold">Monthly Advances</h4>
                            <ScrollArea className="h-24">
                                {monthlyAdvances.length > 0 ? (
                                    <div className="space-y-1 pr-2">
                                    {monthlyAdvances.map((adv, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm p-1.5 bg-muted/50 rounded-md">
                                            <span>{format(adv.date, 'MMM d')}:</span>
                                            <span className="font-mono font-semibold">Rs. {adv.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center pt-4">No advances this month.</p>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    

    

    
