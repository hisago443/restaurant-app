
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';

const logs: any[] = [
];

const typeColors: Record<string, string> = {
    Auth: 'bg-blue-500',
    Order: 'bg-yellow-500',
    Payment: 'bg-green-500',
    Report: 'bg-purple-500',
    POS: 'bg-pink-500',
}

export default function ActivityLog() {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div>
                    <p className="font-medium">{log.user}: <span className="font-normal">{log.action}</span></p>
                    <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                  </div>
                  <Badge className={typeColors[log.type]}>{log.type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
              <ClipboardList className="w-16 h-16 text-gray-300" />
              <p className="mt-4 text-sm font-medium">No activity recorded yet.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
