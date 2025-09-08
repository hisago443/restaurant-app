import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const logs = [
  { id: 1, user: 'Admin', action: 'Logged In', timestamp: '2024-07-27 10:00:12', type: 'Auth' },
  { id: 2, user: 'Jane Smith', action: 'Updated order K003 to "Completed"', timestamp: '2024-07-27 10:05:45', type: 'Order' },
  { id: 3, user: 'John Doe', action: 'Processed payment for table 5', timestamp: '2024-07-27 10:12:30', type: 'Payment' },
  { id: 4, user: 'Admin', action: 'Generated sales report', timestamp: '2024-07-27 10:15:00', type: 'Report' },
  { id: 5, user: 'Mike Johnson', action: 'Cleared order', timestamp: '2024-07-27 10:20:00', type: 'POS' },
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
