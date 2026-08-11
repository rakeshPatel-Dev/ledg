import type { ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 outline-none">
          <div
            className={cn(
              "flex max-h-[88dvh] flex-col rounded-t-4xl bg-card shadow-xl outline-none",
              className
            )}
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
            </div>
            {(title || description) && (
              <div className="flex flex-col gap-0.5 px-5 pt-2 pb-3">
                {title ? (
                  <Drawer.Title className="text-lg font-bold tracking-tight">
                    {title}
                  </Drawer.Title>
                ) : null}
                {description ? (
                  <Drawer.Description className="text-sm text-muted-foreground">
                    {description}
                  </Drawer.Description>
                ) : null}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-8">{children}</div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
