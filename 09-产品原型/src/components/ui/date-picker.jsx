import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { Calendar } from './calendar.jsx';
import { FieldAffordance, FieldTrigger } from './field.jsx';
import { Popover, PopoverContent, PopoverTrigger } from './popover.jsx';
import { cn } from '../../lib/utils.js';

export function DatePicker({ value, onChange, placeholder = '请选择日期', clearable = true, disabled = false, ariaLabel, className, textSize = 'compact', invalid = false, id }) {
  const [open, setOpen] = useState(false);
  const hasValue = value instanceof Date && !Number.isNaN(value.getTime());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <FieldTrigger
            id={id}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            hasValue={hasValue}
            textSize={textSize}
            className={cn('justify-between', className)}
          >
            <span className="truncate">{hasValue ? format(value, 'yyyy-MM-dd') : placeholder}</span>
          </FieldTrigger>
        </PopoverTrigger>
        <FieldAffordance
          hasValue={hasValue}
          clearable={clearable}
          disabled={disabled}
          clearAriaLabel="清除日期"
          showChevron={!hasValue}
          onClear={() => onChange?.(undefined)}
        />
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={hasValue ? value : undefined}
          defaultMonth={hasValue ? value : undefined}
          locale={zhCN}
          onSelect={(nextDate) => {
            onChange?.(nextDate);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
