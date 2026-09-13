import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.jsx';
import { overlayClassName } from './overlay.jsx';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(overlayClassName, className)}
      {...props}
    />
  );
}

const dialogSizeClassName = {
  sm: 'w-[360px]',
  md: 'w-[480px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
};

export function DialogContent({ className, size = 'md', showClose = true, children, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[140] max-h-[calc(100vh-48px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-erp-dialog border border-erp-border-strong bg-erp-surface-panel p-5 text-erp-text shadow-erp-dialog outline-none',
          dialogSizeClassName[size],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="关闭"
              className="absolute right-3 top-3 h-7 w-7 text-erp-text-muted hover:text-erp-text"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('space-y-1 pr-8', className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn('mt-5 flex justify-end gap-2', className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title className={cn('text-[15px] font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description className={cn('text-[12px] leading-5 text-erp-text-muted', className)} {...props} />;
}

/** 通用弹窗：标题 + 描述 + 自定义内容 + 底部按钮区 */
export function SimpleDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size={size} showClose={showClose}>
        {(title || description) && (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
