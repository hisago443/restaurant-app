"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SystemSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Manage general application settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Toggle the application theme.</p>
                    </div>
                    <Switch id="dark-mode" />
                </div>
                <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="notifications" className="font-medium">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive daily sales summaries via email.</p>
                    </div>
                    <Switch id="notifications" defaultChecked />
                </div>
                <div className="space-y-2 p-4 rounded-lg border">
                    <Label htmlFor="restaurant-name" className="font-medium">Restaurant Name</Label>
                    <Input id="restaurant-name" defaultValue="Up & Above Assistant" />
                </div>
                <div className="flex justify-end">
                    <Button>Save Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}
