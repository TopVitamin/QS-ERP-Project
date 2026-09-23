import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/utils.js';
import { popoverLayerClassName } from './overlay.jsx';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className, align = 'center', sideOffset = 5, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'overflow-hidden rounded-erp-overlay border border-erp-border-strong bg-erp-surface-panel text-erp-text shadow-erp-overlay outline-none',
          popoverLayerClassName,
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
