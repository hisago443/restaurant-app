
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

export default function SystemSettings() {
    const { toast } = useToast();
    
    const [restaurantName, setRestaurantName] = useState("Up & Above Assistant");
    const [restaurantLocation, setRestaurantLocation] = useState("");
    const [dateOfOpening, setDateOfOpening] = useState<Date | undefined>();
    const [hasPartners, setHasPartners] = useState(false);
    const [partnerDetails, setPartnerDetails] = useState("");

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
                            <div className="space-y-2">
                                <Label htmlFor="partner-details">Partner Details</Label>
                                <Textarea 
                                    id="partner-details"
                                    value={partnerDetails}
                                    onChange={(e) => setPartnerDetails(e.target.value)}
                                    placeholder="e.g., John Doe - 50%, Jane Smith - 50%"
                                />
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
