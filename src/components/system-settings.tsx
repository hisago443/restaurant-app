"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SystemSettings() {
    const { toast } = useToast();
    
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
