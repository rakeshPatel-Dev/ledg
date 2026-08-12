import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover components must be used within a <Popover>");
  }
  return context;
}

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({
  open: openProp,
  onOpenChange,
  children,
}: PopoverProps) {
  const [openState, setOpenState] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setOpenState(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, setOpen]);

  const contextValue = React.useMemo(
    () => ({ open, setOpen }),
    [open, setOpen]
  );

  return (
    <PopoverContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative min-w-0 w-full">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = usePopoverContext();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      className={cn("w-full outline-none", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}

export function PopoverContent({
  className,
  children,
  align = "start",
  side = "top",
  ...props
}: PopoverContentProps) {
  const { open } = usePopoverContext();

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-[100] max-w-[90vw] rounded-3xl border border-white/25 dark:border-white/10 bg-card/95 p-3 text-foreground shadow-2xl backdrop-blur-2xl backdrop-saturate-180 outline-none animate-in fade-in-0 zoom-in-95 duration-150",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
