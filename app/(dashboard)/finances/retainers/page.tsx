import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RetainersPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Retainers</h1>
        <p className="text-muted-foreground">Manage recurring client retainers</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Coming Soon</h3>
          <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
            Set up recurring monthly retainers for clients. Automatically generate and send
            invoices on a schedule.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
