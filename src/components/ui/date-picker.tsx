import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  min,
  max,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Convertir string YYYY-MM-DD a Date (usar hora local para evitar problemas de zona horaria)
  const date = value ? (() => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
  })() : undefined;
  
  // Formatear fecha para mostrar en formato dd/mm/yyyy
  const displayValue = date 
    ? format(date, 'dd/MM/yyyy')
    : '';

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convertir Date a formato YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      onChange(formattedDate);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal pl-10 relative",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(date) => {
            let disabled = false;
            
            if (min) {
              const [year, month, day] = min.split('-').map(Number);
              const minDate = new Date(year, month - 1, day);
              minDate.setHours(0, 0, 0, 0);
              const dateToCheck = new Date(date);
              dateToCheck.setHours(0, 0, 0, 0);
              if (dateToCheck < minDate) {
                disabled = true;
              }
            }
            
            if (max) {
              const [year, month, day] = max.split('-').map(Number);
              const maxDate = new Date(year, month - 1, day);
              maxDate.setHours(23, 59, 59, 999);
              const dateToCheck = new Date(date);
              dateToCheck.setHours(0, 0, 0, 0);
              if (dateToCheck > maxDate) {
                disabled = true;
              }
            }
            
            return disabled;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

