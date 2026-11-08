import * as React from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date",
  disabled,
  side = "top",
  align = "start",
  id,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const displayDate = React.useMemo(() => {
    if (!selectedDate) return placeholder;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (value === todayStr) return `Today, ${format(selectedDate, "MMM d")}`;
    return format(selectedDate, "MMM d, yyyy");
  }, [selectedDate, value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-2xl border border-input bg-card px-3.5 text-sm text-foreground shadow-elev-field transition-[box-shadow,border-color,background-color] duration-200 outline-none",
          "hover:border-border hover:bg-card focus-visible:border-ring focus-visible:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs sm:text-sm font-medium">{displayDate}</span>
      </PopoverTrigger>
      <PopoverContent align={align} side={side} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              const formatted = format(date, "yyyy-MM-dd");
              onChange?.(formatted);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
