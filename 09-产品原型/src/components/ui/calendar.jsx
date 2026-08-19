import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { cn } from '../../lib/utils.js';

function CalendarDayButton({ className, modifiers, ...props }) {
  const ref = useRef(null);
  const isSelected = modifiers.selected
    && !modifiers.range_start
    && !modifiers.range_end
    && !modifiers.range_middle;

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-erp-control text-[12px] text-erp-text-section outline-none transition-colors',
        'hover:bg-erp-primary-soft hover:text-erp-primary-hover',
        'focus-visible:ring-2 focus-visible:ring-erp-primary/30',
        isSelected && 'bg-erp-primary text-white hover:bg-erp-primary-hover hover:text-white',
        modifiers.today && !isSelected && 'border border-erp-primary text-erp-primary',
        modifiers.outside && 'text-erp-text-placeholder',
        modifiers.disabled && 'cursor-not-allowed text-erp-border-control opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('bg-erp-surface-panel p-3 [--cell-size:2rem]', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-3', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          'inline-flex size-8 items-center justify-center rounded-erp-control text-erp-text-muted outline-none hover:bg-erp-primary-soft hover:text-erp-primary focus-visible:ring-2 focus-visible:ring-erp-primary/30',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          'inline-flex size-8 items-center justify-center rounded-erp-control text-erp-text-muted outline-none hover:bg-erp-primary-soft hover:text-erp-primary focus-visible:ring-2 focus-visible:ring-erp-primary/30',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-8 w-full items-center justify-center px-8',
          defaultClassNames.month_caption,
        ),
        caption_label: cn('text-[13px] font-medium text-erp-text', defaultClassNames.caption_label),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none text-center text-[11px] font-normal text-erp-text-subtle',
          defaultClassNames.weekday,
        ),
        week: cn('mt-1 flex w-full', defaultClassNames.week),
        day: cn('relative p-0 text-center', defaultClassNames.day),
        outside: cn('text-erp-text-placeholder', defaultClassNames.outside),
        disabled: cn('text-erp-border-control opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn('size-4', chevronClassName)} strokeWidth={2} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}
