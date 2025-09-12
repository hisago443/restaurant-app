
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

const themes = [
    { name: 'default', label: 'Default', color: 'hsl(250 60% 65%)' },
    { name: 'ocean', label: 'Ocean', color: 'hsl(210 70% 60%)' },
    { name: 'sunset', label: 'Sunset', color: 'hsl(25 80% 60%)' },
    { name: 'lavender', label: 'Lavender', color: 'hsl(260 60% 70%)' },
]

export default function SystemSettings() {
    const { toast } = useToast();
    const { theme, setTheme, resolvedTheme } = useTheme();
    
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [restaurantName, setRestaurantName] = useState("Up & Above Assistant");

    useEffect(() => {
        setIsDarkMode(resolvedTheme === 'dark');
    }, [resolvedTheme]);

    const handleDarkModeToggle = (checked: boolean) => {
        setTheme(checked ? 'dark' : 'light')
    }


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
                        <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Toggle the application theme.</p>
                    </div>
                    <Switch
                        id="dark-mode"
                        checked={isDarkMode}
                        onCheckedChange={handleDarkModeToggle}
                    />
                </div>
                 <div className="space-y-4 p-4 rounded-lg border">
                    <Label className="font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground">Select a color theme for the application.</p>
                    <div className="flex items-center gap-4 pt-2">
                        {themes.map((themeOption) => (
                            <div key={themeOption.name} className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => setTheme(themeOption.name)}
                                    className={cn(
                                        'h-12 w-12 rounded-full border-2 transition-all flex items-center justify-center',
                                        theme === themeOption.name ? 'border-primary' : 'border-transparent'
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full" style={{ backgroundColor: themeOption.color }}>
                                        {theme === themeOption.name && <Check className="h-6 w-6 text-white m-2" />}
                                    </div>
                                </button>
                                <span className="text-xs font-medium">{themeOption.label}</span>
                            </div>
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
