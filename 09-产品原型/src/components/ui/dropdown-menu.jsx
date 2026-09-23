import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { popoverLayerClassName } from './overlay.jsx';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 5, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'max-h-[min(420px,calc(100vh-24px))] min-w-[148px] overflow-y-auto rounded-erp-overlay border border-erp-border-strong bg-erp-surface-panel p-1 text-erp-text shadow-erp-overlay',
          popoverLayerClassName,
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, inset, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex h-7 cursor-pointer select-none items-center gap-2 rounded-erp-control px-2 text-[12px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-erp-primary-soft data-[highlighted]:text-erp-primary-hover',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        'relative flex h-7 cursor-pointer select-none items-center rounded-erp-control pl-7 pr-2 text-[12px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-erp-primary-soft data-[highlighted]:text-erp-primary-hover',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-erp-primary" strokeWidth={2.2} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuSeparator({ className, ...props }) {
  return <DropdownMenuPrimitive.Separator className={cn('my-1 h-px bg-erp-border-light', className)} {...props} />;
}

export function DropdownMenuLabel({ className, inset, ...props }) {
  return <DropdownMenuPrimitive.Label className={cn('px-2 py-1.5 text-[11px] text-erp-text-muted', inset && 'pl-8', className)} {...props} />;
}

export function DropdownMenuSub({ ...props }) {
  return <DropdownMenuPrimitive.Sub {...props} />;
}

export function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
  return (
    <DropdownMenuPrimitive.SubTrigger className={cn('flex h-7 items-center rounded-erp-control px-2 text-[12px] outline-none data-[state=open]:bg-erp-primary-soft data-[highlighted]:bg-erp-primary-soft', inset && 'pl-8', className)} {...props}>
      {children}
      <ChevronRight className="ml-auto h-3.5 w-3.5" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem className={cn('relative flex h-7 cursor-pointer select-none items-center rounded-erp-control py-1.5 pl-8 pr-2 text-[12px] outline-none data-[highlighted]:bg-erp-primary-soft', className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}
