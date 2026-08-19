import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils.js';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 4, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-[150] max-w-64 rounded-erp-overlay border border-erp-sidebar-border bg-erp-sidebar-surface px-2 py-1 text-[12px] leading-5 text-white shadow-erp-overlay outline-none',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** 单行文字提示，最常用写法 */
export function HintTooltip({ content, children, side = 'top', ...props }) {
  if (!content) return children;

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
