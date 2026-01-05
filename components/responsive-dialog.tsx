'use client';

import { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer } from 'vaul';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  title
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-background rounded-t-xl p-4 z-50 flex flex-col">
          <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-4 flex-shrink-0" />
          {title && (
            <h2 className="text-lg font-semibold mb-4 flex-shrink-0">{title}</h2>
          )}
          <div className="overflow-y-auto flex-1 -mx-4 px-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
