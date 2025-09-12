"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SystemSettings() {
    const { toast } = useToast();
    
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [restaurantName, setRestaurantName] = useState("Up & Above Assistant");

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your new settings have been applied.",
        });
    };

    return (
        <Card className="border-none shadow-none">
            <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="notifications" className="font-medium">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive daily sales summaries via email.</p>
                    </div>
                    <Switch 
                        id="notifications" 
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                    />
                </div>
                <div className="space-y-2 p-4 rounded-lg border">
                    <Label htmlFor="restaurant-name" className="font-medium">Restaurant Name</Label>
                    <Input 
                        id="restaurant-name" 
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave}>Save Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}
