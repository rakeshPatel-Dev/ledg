import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center px-8",
        caption_label: "text-sm font-bold tracking-tight text-foreground",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          "absolute left-1 flex size-7 items-center justify-center rounded-xl border border-white/20 dark:border-white/10 bg-card/80 p-0 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
        ),
        button_next: cn(
          "absolute right-1 flex size-7 items-center justify-center rounded-xl border border-white/20 dark:border-white/10 bg-card/80 p-0 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full mt-2",
        weekday:
          "text-muted-foreground rounded-md w-9 font-semibold text-[0.7rem] uppercase tracking-wider text-center",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          "flex size-9 items-center justify-center rounded-2xl p-0 font-medium text-xs text-foreground transition-all hover:bg-primary/20 hover:text-primary active:scale-95 outline-none"
        ),
        selected: "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 rounded-2xl",
        today: "bg-accent/80 text-foreground font-bold border border-primary/50 rounded-2xl",
        outside: "text-muted-foreground/40 opacity-50",
        disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
