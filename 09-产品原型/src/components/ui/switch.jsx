import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils.js';

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-erp-border-control bg-erp-border-light p-px shadow-inner outline-none transition-colors focus-visible:ring-2 focus-visible:ring-erp-primary/30 focus-visible:ring-offset-1 data-[state=checked]:border-erp-primary data-[state=checked]:bg-erp-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3 rounded-full bg-erp-surface-panel shadow-[0_1px_2px_rgb(30_35_80_/_0.22)] transition-transform data-[state=checked]:translate-x-3" />
    </SwitchPrimitive.Root>
  );
}
