import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel?: React.ReactNode;
  setSelectedLabel: (label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a <Select>");
  }
  return context;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
}: SelectProps) {
  const [valueState, setValueState] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : valueState;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setValueState(newValue);
      }
      onValueChange?.(newValue);
      setOpen(false);
    },
    [isControlled, onValueChange]
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
  }, [open]);

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      selectedLabel,
      setSelectedLabel,
    }),
    [value, handleValueChange, open, selectedLabel]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative min-w-0 w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-1", className)} {...props}>
      {children}
    </div>
  );
}

export function SelectValue({
  placeholder,
  className,
  children,
}: {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { selectedLabel } = useSelectContext();

  const display = children ?? selectedLabel ?? placeholder;

  return (
    <span className={cn("block truncate text-left", className)}>
      {display}
    </span>
  );
}

export function SelectTrigger({
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-input bg-card/80 px-4 text-sm text-foreground shadow-xs backdrop-blur-md transition-all outline-none",
        "hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        "min-w-0 overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {children}
      </div>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180 text-foreground"
        )}
      />
    </button>
  );
}

export function SelectContent({
  className,
  children,
  side = "top",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" }) {
  const { open } = useSelectContext();

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute left-0 z-[100] max-h-60 w-full overflow-y-auto rounded-2xl border border-white/25 dark:border-white/10 bg-card/95 p-1.5 text-foreground shadow-2xl backdrop-blur-2xl backdrop-saturate-180 transition-all outline-none animate-in fade-in-0 zoom-in-95 duration-150",
        side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: SelectItemProps) {
  const { value: selectedValue, onValueChange, setSelectedLabel } = useSelectContext();
  const isSelected = selectedValue === value;

  React.useEffect(() => {
    if (isSelected) {
      setSelectedLabel(children);
    }
  }, [isSelected, children, setSelectedLabel]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-disabled={disabled ? "" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onValueChange?.(value);
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pl-3 pr-9 text-sm outline-none transition-colors",
        isSelected
          ? "bg-accent/80 font-medium text-foreground"
          : "hover:bg-accent/50 hover:text-foreground text-muted-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      <span className="block truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-3 flex items-center justify-center">
          <Check className="size-4 text-primary" />
        </span>
      )}
    </div>
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  );
}
