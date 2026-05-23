import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: string;
  stickyFooter?: ReactNode;
}

export function ResponsiveModal({
  open, onOpenChange, title, description, children, icon, maxWidth = 'max-w-lg', stickyFooter,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
        <DrawerContent className="max-h-[92dvh] flex flex-col outline-none">
          <DrawerHeader className="text-left px-6 pt-5 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              {icon && <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>}
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-lg font-bold leading-tight truncate">{title}</DrawerTitle>
                {description && <DrawerDescription className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</DrawerDescription>}
              </div>
            </div>
          </DrawerHeader>
          <div className="px-6 py-4 overflow-y-auto flex-1 ios-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
          {stickyFooter && (
            <div className="px-6 py-4 border-t border-border shrink-0 bg-background/80 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {stickyFooter}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidth} max-h-[80vh] flex flex-col`}>
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            {icon}
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
          {children}
        </div>
        {stickyFooter && (
          <div className="pt-4 border-t border-border shrink-0">
            {stickyFooter}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
