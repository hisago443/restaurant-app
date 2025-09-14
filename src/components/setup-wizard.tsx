
"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';

interface SetupWizardProps {
  onComplete: () => void;
}

interface Owner {
  name: string;
  age?: string;
  address?: string;
  mobile?: string;
}

interface Employee {
  name: string;
  role: string;
  salary: string;
}

interface Vendor {
  name: string;
  mobile: string;
}

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Form State
  const [venueName, setVenueName] = useState('');
  const [venueCategory, setVenueCategory] = useState('');
  const [dateOfOpening, setDateOfOpening] = useState<Date | undefined>();
  const [rent, setRent] = useState('');

  const [owners, setOwners] = useState<Owner[]>([{ name: '', age: '', address: '', mobile: '' }]);

  const [employees, setEmployees] = useState<Employee[]>([{ name: '', role: '', salary: '' }]);

  const [vendors, setVendors] = useState<Vendor[]>([{ name: '', mobile: '' }]);

  const handleOwnerChange = (index: number, field: keyof Owner, value: string) => {
    const newOwners = [...owners];
    newOwners[index][field] = value;
    setOwners(newOwners);
  };

  const addOwnerField = () => {
    setOwners([...owners, { name: '', age: '', address: '', mobile: '' }]);
  };
  
  const removeOwnerField = (index: number) => {
    const newOwners = owners.filter((_, i) => i !== index);
    setOwners(newOwners);
  };
  
  const handleEmployeeChange = (index: number, field: keyof Employee, value: string) => {
    const newEmployees = [...employees];
    newEmployees[index][field] = value;
    setEmployees(newEmployees);
  };

  const addEmployeeField = () => {
    setEmployees([...employees, { name: '', role: '', salary: '' }]);
  };
  
  const removeEmployeeField = (index: number) => {
    const newEmployees = employees.filter((_, i) => i !== index);
    setEmployees(newEmployees);
  };

  const handleVendorChange = (index: number, field: keyof Vendor, value: string) => {
    const newVendors = [...vendors];
    newVendors[index][field] = value;
    setVendors(newVendors);
  };

  const addVendorField = () => {
    setVendors([...vendors, { name: '', mobile: '' }]);
  };
  
  const removeVendorField = (index: number) => {
    const newVendors = vendors.filter((_, i) => i !== index);
    setVendors(newVendors);
  };
  
  const handleSkip = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('setupComplete', 'true');
      } catch (e) {
        console.error("Could not access localStorage", e);
      }
    }
    onComplete();
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleFinish = async () => {
    toast({ title: "Saving your setup...", description: "Please wait." });
    try {
      const batch = writeBatch(db);

      // Save Venue Details (we'll store them in a 'settings' collection for simplicity)
      batch.set(doc(db, "settings", "venue"), {
        name: venueName,
        category: venueCategory,
        dateOfOpening: dateOfOpening || null,
        rent: rent ? parseFloat(rent) : 0,
      });

      // Save Owners
      batch.set(doc(db, "settings", "owners"), { list: owners });
      
      // Save Employees
      let employeeIdCounter = 1;
      employees.forEach((emp, index) => {
        if(emp.name && emp.role && emp.salary) {
            const newId = `UA${(employeeIdCounter++).toString().padStart(3, '0')}`;
            const employeeRef = doc(db, "employees", newId);
            batch.set(employeeRef, {
                id: newId,
                name: emp.name,
                role: emp.role,
                salary: parseFloat(emp.salary),
                color: colors[index % colors.length]
            });
        }
      });
      
      // Save Vendors
      vendors.forEach(vendor => {
        if (vendor.name && vendor.mobile) {
          const vendorRef = doc(collection(db, "vendors"));
          batch.set(vendorRef, { name: vendor.name, mobile: vendor.mobile, category: 'General' });
        }
      });

      await batch.commit();

      toast({ title: "Setup Complete!", description: "Your business details have been saved." });
      
      if (dontShowAgain) {
        try {
          localStorage.setItem('setupComplete', 'true');
        } catch (e) {
          console.error("Could not access localStorage", e);
        }
      }
      onComplete();

    } catch (error) {
        console.error("Error saving setup data:", error);
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your setup details. Please try again." });
    }
  };

  const steps = [
    {
      title: "Venue Details",
      description: "Tell us about your business.",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue-name">Venue Name</Label>
            <Input id="venue-name" placeholder="e.g., The Cozy Corner Cafe" value={venueName} onChange={e => setVenueName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="venue-category">Venue Category</Label>
                <Select value={venueCategory} onValueChange={setVenueCategory}>
                    <SelectTrigger id="venue-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cafe">Cafe</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-of-opening">Date of Opening</Label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateOfOpening && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateOfOpening ? format(dateOfOpening, "PPP") : <span>Pick a date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateOfOpening} onSelect={setDateOfOpening} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
           <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent (Optional)</Label>
                <Input id="rent" type="number" placeholder="e.g., 50000" value={rent} onChange={e => setRent(e.target.value)} />
            </div>
        </div>
      )
    },
    {
      title: "Owner Details",
      description: "Who are the owners of the business?",
      content: (
        <div className="space-y-4">
          {owners.map((owner, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative">
              {owners.length > 1 && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeOwnerField(index)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
              )}
              <div className="space-y-2">
                <Label>Owner {index + 1} Name</Label>
                <Input value={owner.name} onChange={e => handleOwnerChange(index, 'name', e.target.value)} placeholder="Full Name" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Age (Optional)</Label>
                    <Input value={owner.age} onChange={e => handleOwnerChange(index, 'age', e.target.value)} type="number" placeholder="e.g., 35" />
                </div>
                <div className="space-y-2">
                    <Label>Mobile (Optional)</Label>
                    <Input value={owner.mobile} onChange={e => handleOwnerChange(index, 'mobile', e.target.value)} placeholder="e.g., 9876543210" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address (Optional)</Label>
                <Textarea value={owner.address} onChange={e => handleOwnerChange(index, 'address', e.target.value)} placeholder="Full Address" />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addOwnerField}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Owner</Button>
        </div>
      )
    },
    {
      title: "Employee Details",
      description: "List your current staff members.",
      content: (
         <div className="space-y-4">
          {employees.map((employee, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative">
              {employees.length > 1 && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeEmployeeField(index)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Employee {index + 1} Name</Label>
                    <Input value={employee.name} onChange={e => handleEmployeeChange(index, 'name', e.target.value)} placeholder="Full Name" />
                </div>
                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={employee.role} onValueChange={value => handleEmployeeChange(index, 'role', value)}>
                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
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
                    <Label>Salary</Label>
                    <Input value={employee.salary} onChange={e => handleEmployeeChange(index, 'salary', e.target.value)} type="number" placeholder="e.g., 25000" />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addEmployeeField}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Employee</Button>
        </div>
      )
    },
    {
      title: "Vendors List",
      description: "Add your suppliers.",
      content: (
        <div className="space-y-4">
          {vendors.map((vendor, index) => (
            <div key={index} className="p-4 border rounded-lg relative">
              {vendors.length > 1 && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeVendorField(index)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Vendor {index + 1} Name</Label>
                    <Input value={vendor.name} onChange={e => handleVendorChange(index, 'name', e.target.value)} placeholder="e.g., Local Veggies Co." />
                </div>
                <div className="space-y-2">
                    <Label>Mobile No.</Label>
                    <Input value={vendor.mobile} onChange={e => handleVendorChange(index, 'mobile', e.target.value)} placeholder="e.g., 9876543210" />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addVendorField}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Vendor</Button>
        </div>
      )
    },
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>Welcome! Let's set up your business.</CardTitle>
          <CardDescription>
            Step {currentStep} of {steps.length}: {currentStepData.title}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6 flex-grow overflow-y-auto">
          {currentStepData.content}
        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col items-stretch gap-4">
            <div className="flex justify-between w-full">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Previous
                </Button>
                {currentStep < steps.length ? (
                    <Button onClick={nextStep}>
                        Next <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                ) : (
                    <Button onClick={handleFinish}>
                        Finish Setup
                    </Button>
                )}
            </div>
            <div className="flex justify-between items-center w-full mt-4">
                <Button variant="link" onClick={handleSkip}>Skip for now</Button>
                <div className="flex items-center space-x-2">
                    <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))} />
                    <Label htmlFor="dont-show-again" className="text-sm text-muted-foreground">
                        Don't show this again
                    </Label>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
