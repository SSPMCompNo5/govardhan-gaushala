"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function DateRangePicker({ value, onChange, placeholder = "Pick a date range", className }) {
  const [open, setOpen] = useState(false);
  const range = value ?? { from: undefined, to: undefined };

  const label = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
    }
    if (range?.from) return format(range.from, "LLL dd, y");
    return placeholder;
  }, [range, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={(className ? className + " " : "") + "w-full justify-start"} type="button">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={range}
          onSelect={(r) => {
            const next = r || { from: undefined, to: undefined };
            onChange?.(next);
            if (next?.from && next?.to) setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
