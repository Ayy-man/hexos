'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface ResponsiveTableProps<T> {
  data: T[];
  columns?: any[];
  renderCard: (item: T, index: number) => ReactNode;
  renderTable?: (data: T[]) => ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  renderCard,
  renderTable,
  className = ''
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop: Show table */}
      {renderTable && (
        <div className="hidden md:block">
          {renderTable(data)}
        </div>
      )}

      {/* Mobile: Show cards */}
      <div className={`md:hidden space-y-3 ${className}`}>
        {data.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No items to display
          </Card>
        ) : (
          data.map((item, i) => (
            <Card key={i} className="p-4">
              {renderCard(item, i)}
            </Card>
          ))
        )}
      </div>
    </>
  );
}
