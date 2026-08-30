import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { getFieldControlClassName } from './field.jsx';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, hideIcon = false, textSize = 'compact', variant = 'underline', ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        getFieldControlClassName(textSize, variant),
        'relative justify-between pr-8 text-erp-text data-[placeholder]:text-erp-placeholder [&>span]:line-clamp-1 [&>span]:flex-1 [&>span]:text-left',
        className,
      )}
      {...props}
    >
      {children}
      {!hideIcon && (
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="pointer-events-none absolute right-2 top-1.5 h-3.5 w-3.5 shrink-0 text-erp-text-muted" strokeWidth={2} />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, position = 'popper', ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-[100] max-h-72 overflow-hidden rounded-erp-overlay border border-erp-border-strong bg-erp-surface-panel text-erp-text shadow-erp-overlay',
          position === 'popper' && 'w-[var(--radix-select-trigger-width)] translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex h-7 w-full cursor-pointer select-none items-center rounded-erp-control px-2 pr-7 text-[12px] outline-none data-[highlighted]:bg-erp-primary-soft data-[highlighted]:text-erp-primary-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="h-3.5 w-3.5 text-erp-primary" strokeWidth={2.2} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
