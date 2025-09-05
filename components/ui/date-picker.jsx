"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }) {
  const [open, setOpen] = useState(false);
  const date = value ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground", className)}
          type="button"
        >
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange?.(d || null);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
