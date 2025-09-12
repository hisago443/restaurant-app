
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function SystemSettings() {
    const { toast } = useToast();
    const { theme, setTheme, resolvedTheme } = useTheme();
    
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [restaurantName, setRestaurantName] = useState("Up & Above Assistant");

    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your new settings have been applied.",
        });
    };

    const themes = [
        { name: 'default', label: 'Default' },
        { name: 'ocean', label: 'Ocean' },
        { name: 'sunset', label: 'Sunset' },
        { name: 'lavender', label: 'Lavender' },
    ];
    
    // The `theme` variable can be "dark", "light", "system", or "ocean", "dark ocean", etc.
    // We need to extract the base theme name (e.g., "ocean") from the combined string.
    const currentBaseTheme = theme?.split(' ').pop() || 'default';

    return (
        <Card className="border-none shadow-none">
            <CardContent className="space-y-6 pt-6">
                 <div className="space-y-2 p-4 rounded-lg border">
                    <Label className="font-medium">Appearance</Label>
                     <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
                     <div className="flex items-center justify-between pt-2">
                        <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                        <Switch 
                            id="dark-mode"
                            checked={resolvedTheme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        />
                    </div>
                </div>
                
                 <div className="space-y-2 p-4 rounded-lg border">
                    <Label className="font-medium">Color Theme</Label>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        {themes.map((themeOption) => (
                             <Button
                                key={themeOption.name}
                                variant={currentBaseTheme === themeOption.name ? 'default' : 'outline'}
                                onClick={() => setTheme(themeOption.name)}
                                className="justify-start"
                            >
                                {currentBaseTheme === themeOption.name && <Check className="mr-2 h-4 w-4" />}
                                {themeOption.label}
                            </Button>
                        ))}
                    </div>
                </div>

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

