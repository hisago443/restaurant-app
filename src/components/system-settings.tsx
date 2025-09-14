

"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface Partner {
    name: string;
    mobile: string;
}

export default function SystemSettings() {
    const { toast } = useToast();
    
    const [restaurantName, setRestaurantName] = useState("Up & Above Assistant");
    const [restaurantLocation, setRestaurantLocation] = useState("");
    const [dateOfOpening, setDateOfOpening] = useState<Date | undefined>();
    const [hasPartners, setHasPartners] = useState(false);
    
    const [partners, setPartners] = useState<Partner[]>([]);
    const [currentPartnerName, setCurrentPartnerName] = useState('');
    const [currentPartnerMobile, setCurrentPartnerMobile] = useState('');

    const handleAddPartner = () => {
        if (currentPartnerName && currentPartnerMobile) {
            if (partners.some(p => p.mobile === currentPartnerMobile)) {
                toast({
                    variant: 'destructive',
                    title: 'Partner exists',
                    description: 'A partner with this mobile number is already added.',
                });
                return;
            }
            setPartners([...partners, { name: currentPartnerName, mobile: currentPartnerMobile }]);
            setCurrentPartnerName('');
            setCurrentPartnerMobile('');
        } else {
            toast({
                variant: 'destructive',
                title: 'Missing Details',
                description: 'Please provide both a name and a mobile number.',
            });
        }
    };

    const handleRemovePartner = (mobile: string) => {
        setPartners(partners.filter(p => p.mobile !== mobile));
    };

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your new settings have been applied.",
        });
    };

    return (
        <Card className="border-none shadow-none">
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-4 p-4 rounded-lg border">
                    <div className="space-y-2">
                        <Label htmlFor="restaurant-name" className="font-medium">Restaurant Name</Label>
                        <Input 
                            id="restaurant-name" 
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="restaurant-location" className="font-medium">Restaurant Location</Label>
                        <Input 
                            id="restaurant-location" 
                            value={restaurantLocation}
                            onChange={(e) => setRestaurantLocation(e.target.value)}
                            placeholder="e.g., 123 Main St, Anytown"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date-of-opening" className="font-medium">Date of Opening</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateOfOpening && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateOfOpening ? format(dateOfOpening, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateOfOpening}
                                onSelect={setDateOfOpening}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="has-partners" className="font-medium">Are there partners?</Label>
                        <Switch
                            id="has-partners"
                            checked={hasPartners}
                            onCheckedChange={setHasPartners}
                        />
                    </div>
                    {hasPartners && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <Label>Partner Details</Label>
                                {partners.length > 0 && (
                                    <div className="space-y-2 rounded-md border p-2">
                                        {partners.map((partner, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{partner.name}</p>
                                                    <p className="text-sm text-muted-foreground">{partner.mobile}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemovePartner(partner.mobile)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <div className="flex-grow space-y-1">
                                        <Label htmlFor="partner-name" className="text-xs">Partner Name</Label>
                                        <Input 
                                            id="partner-name"
                                            value={currentPartnerName}
                                            onChange={(e) => setCurrentPartnerName(e.target.value)}
                                            placeholder="e.g., Jane Smith"
                                        />
                                    </div>
                                    <div className="flex-grow space-y-1">
                                        <Label htmlFor="partner-mobile" className="text-xs">Mobile No.</Label>
                                        <Input 
                                            id="partner-mobile"
                                            value={currentPartnerMobile}
                                            onChange={(e) => setCurrentPartnerMobile(e.target.value)}
                                            placeholder="e.g., 9876543210"
                                        />
                                    </div>
                                    <Button variant="secondary" onClick={handleAddPartner}>Add</Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="flex justify-end">
                    <Button onClick={handleSave}>Save Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}
