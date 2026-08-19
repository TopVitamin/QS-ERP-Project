import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-erp-control font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-erp-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-erp-primary text-white hover:bg-erp-primary-hover',
        success: 'border border-erp-success bg-erp-success text-white hover:bg-erp-success-hover',
        outline: 'border border-erp-border-control bg-erp-surface-panel text-erp-text hover:border-erp-primary hover:bg-erp-primary-soft',
        ghost: 'text-erp-text-muted hover:bg-erp-surface-muted hover:text-erp-primary',
        text: 'text-erp-primary hover:bg-erp-primary-soft hover:text-erp-primary-hover',
        danger: 'text-erp-danger hover:bg-erp-danger-bg',
        link: 'h-auto rounded-none px-0 text-erp-primary hover:underline',
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

export function Button({ className, variant, size, type = 'button', ...props }) {
  return <button type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
