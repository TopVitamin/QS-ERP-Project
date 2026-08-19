import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Checkbox({ className, checked, ...props }) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        'peer h-3.5 w-3.5 shrink-0 rounded-[3px] border border-erp-border-control bg-erp-surface-panel text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-erp-primary/30 data-[state=checked]:border-erp-primary data-[state=checked]:bg-erp-primary data-[state=indeterminate]:border-erp-primary data-[state=indeterminate]:bg-erp-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {checked === 'indeterminate' ? (
          <span className="block h-0.5 w-2 rounded-sm bg-white" />
        ) : (
          <Check className="h-3 w-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
