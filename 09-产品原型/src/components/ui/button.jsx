import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-erp-control font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-erp-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-erp-primary text-white hover:bg-erp-primary-hover disabled:bg-erp-primary/50',
        success: 'border border-erp-success bg-erp-success text-white hover:bg-erp-success-hover disabled:border-erp-border-light disabled:bg-erp-surface-muted disabled:text-erp-text-disabled',
        outline: 'border border-erp-border-control bg-erp-surface-panel text-erp-text hover:border-erp-primary hover:bg-erp-primary-soft disabled:border-erp-border-light disabled:text-erp-text-disabled',
        ghost: 'text-erp-text-muted hover:bg-erp-surface-muted hover:text-erp-primary disabled:text-erp-text-disabled',
        text: 'text-erp-primary hover:bg-erp-primary-soft hover:text-erp-primary-hover disabled:text-erp-text-disabled',
        danger: 'text-erp-danger hover:bg-erp-danger-bg disabled:text-erp-text-disabled',
        link: 'h-auto rounded-none px-0 text-erp-primary hover:underline disabled:text-erp-text-disabled',
      },
      size: {
        compact: 'h-7 gap-1 px-2.5 text-[12px]',
        icon: 'h-7 w-7 text-[12px]',
        default: 'h-8 gap-1.5 px-3 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'compact',
    },
  },
);

export const Button = forwardRef(function Button({ className, variant, size, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});

export { buttonVariants };
