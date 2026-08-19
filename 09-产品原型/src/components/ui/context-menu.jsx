import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { cn } from '../../lib/utils.js';

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export function ContextMenuContent({ className, ...props }) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content className={cn('z-[120] min-w-[132px] rounded-erp-overlay border border-erp-border-strong bg-erp-surface-panel p-1 shadow-erp-overlay', className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({ className, ...props }) {
  return <ContextMenuPrimitive.Item className={cn('flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-erp-control px-2 text-[12px] text-erp-text-section outline-none data-[highlighted]:bg-erp-primary-soft', className)} {...props} />;
}
