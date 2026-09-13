import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { Calendar } from './calendar.jsx';
import { FieldAffordance, FieldTrigger } from './field.jsx';
import { Popover, PopoverContent, PopoverTrigger } from './popover.jsx';
import { cn } from '../../lib/utils.js';

function parseDateValue(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function DateRangePicker({ value, onChange, placeholder = '请选择日期范围', clearable = true, disabled = false, ariaLabel, className, textSize = 'compact' }) {
  const [open, setOpen] = useState(false);
  const from = parseDateValue(value?.from);
  const to = parseDateValue(value?.to);
  const hasValue = Boolean(from || to);
  const label = from && to
    ? `${format(from, 'yyyy-MM-dd')} ~ ${format(to, from.getFullYear() === to.getFullYear() ? 'MM-dd' : 'yyyy-MM-dd')}`
    : from ? `${format(from, 'yyyy-MM-dd')} ~` : to ? `~ ${format(to, 'yyyy-MM-dd')}` : placeholder;

  function selectRange(range, triggerDate) {
    if (!range && from && triggerDate && isSameDay(triggerDate, from)) {
      onChange?.({ from: format(from, 'yyyy-MM-dd'), to: format(from, 'yyyy-MM-dd') });
      setOpen(false);
      return;
    }
    onChange?.({
      from: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
      to: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
    });
    if (range?.from && range?.to) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <FieldTrigger disabled={disabled} aria-label={ariaLabel} hasValue={hasValue} textSize={textSize} className={cn('justify-between', className)}>
            <span className="truncate">{label}</span>
          </FieldTrigger>
        </PopoverTrigger>
        <FieldAffordance
          hasValue={hasValue}
          clearable={clearable}
          disabled={disabled}
          clearAriaLabel="清除日期范围"
          showChevron={!hasValue}
          onClear={() => onChange?.({ from: '', to: '' })}
        />
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          min={1}
          selected={hasValue ? { from, to } : undefined}
          defaultMonth={from}
          locale={zhCN}
          onSelect={selectRange}
        />
      </PopoverContent>
    </Popover>
  );
}
