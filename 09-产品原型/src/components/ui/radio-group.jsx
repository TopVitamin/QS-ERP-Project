import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '../../lib/utils.js';

export function RadioGroup({ className, ...props }) {
  return <RadioGroupPrimitive.Root className={cn('flex items-center gap-3', className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'peer aspect-square size-3.5 shrink-0 rounded-full border border-erp-border-control bg-erp-surface-panel text-erp-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-erp-primary/30 data-[state=checked]:border-erp-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-1.5 rounded-full bg-erp-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
