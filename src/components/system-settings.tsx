
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Check } from 'lucide-react';

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

    const currentBaseTheme = theme?.replace('dark ', '') || 'default';
    
    const handleThemeChange = (newTheme: string) => {
        const isDark = resolvedTheme === 'dark';
        if (isDark) {
            setTheme(`dark ${newTheme}`);
        } else {
            setTheme(newTheme);
        }
    }

    const handleDarkModeToggle = (checked: boolean) => {
        const newTheme = checked ? `dark ${currentBaseTheme}` : currentBaseTheme;
        setTheme(newTheme);
    }

    return (
        <Card className="border-none shadow-none">
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-4 p-4 rounded-lg border">
                    <Label className="font-bold text-base">Appearance</Label>
                     <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
                     <div className="flex items-center justify-between pt-2">
                        <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                        <Switch 
                            id="dark-mode"
                            checked={resolvedTheme === 'dark'}
                            onCheckedChange={handleDarkModeToggle}
                        />
                    </div>
                </div>
                
                 <div className="space-y-3 p-4 rounded-lg border">
                    <Label className="font-bold text-base">Color Modes</Label>
                    <p className="text-sm text-muted-foreground">Select a color scheme for buttons and accents.</p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        {themes.map((themeOption) => (
                             <Button
                                key={themeOption.name}
                                variant={currentBaseTheme === themeOption.name ? 'default' : 'outline'}
                                onClick={() => handleThemeChange(themeOption.name)}
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
