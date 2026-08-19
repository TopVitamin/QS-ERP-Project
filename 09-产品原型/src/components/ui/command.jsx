import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Command({ className, ...props }) {
  return <CommandPrimitive className={cn('flex h-full w-full flex-col overflow-hidden rounded-erp-overlay text-erp-text', className)} {...props} />;
}

export function CommandInput({ className, ...props }) {
  return (
    <div className="flex h-8 items-center gap-2 border-b border-erp-border-light px-2.5">
      <Search className="size-3.5 shrink-0 text-erp-text-subtle" strokeWidth={1.9} />
      <CommandPrimitive.Input className={cn('h-full min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-erp-placeholder', className)} {...props} />
    </div>
  );
}

export const CommandList = ({ className, ...props }) => <CommandPrimitive.List className={cn('max-h-64 overflow-y-auto overflow-x-hidden p-1', className)} {...props} />;
export const CommandEmpty = ({ className, ...props }) => <CommandPrimitive.Empty className={cn('py-6 text-center text-[12px] text-erp-text-subtle', className)} {...props} />;
export const CommandGroup = ({ className, ...props }) => <CommandPrimitive.Group className={cn('overflow-hidden p-1 text-erp-text', className)} {...props} />;
export const CommandSeparator = ({ className, ...props }) => <CommandPrimitive.Separator className={cn('mx-1 h-px bg-erp-border-light', className)} {...props} />;

export function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'relative flex h-7 cursor-pointer select-none items-center rounded-erp-control px-2 text-[12px] outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45 data-[selected=true]:bg-erp-primary-soft data-[selected=true]:text-erp-primary-hover',
        className,
      )}
      {...props}
    />
  );
}
