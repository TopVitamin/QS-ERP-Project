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
  form: 'w-[min(768px,calc(100vw-32px))]',
  xl: 'w-[800px]',
};

const dialogSizeByColumns = {
  1: 'md',
  2: 'lg',
  4: 'xl',
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
              className="absolute right-3 top-3 z-10 h-7 w-7 text-erp-text-muted hover:text-erp-text"
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
  titleExtra,
  description,
  children,
  footer,
  size,
  columns,
  framed,
  className,
  showClose = true,
}) {
  const resolvedSize = size ?? dialogSizeByColumns[columns] ?? 'md';
  const isFramed = framed ?? columns != null;

  if (isFramed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent
          size={resolvedSize}
          className={cn('flex flex-col gap-0 overflow-hidden p-0', className)}
          showClose={showClose}
        >
          {(title || titleExtra || description) && (
            <DialogHeader className="shrink-0 space-y-0 border-b border-erp-border-header p-0">
              <div className="px-4 pb-3 pt-4 pr-12">
                {(title || titleExtra) ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    {title ? <DialogTitle className="text-[16px]">{title}</DialogTitle> : null}
                    {titleExtra}
                  </div>
                ) : null}
                {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
              </div>
            </DialogHeader>
          )}
          <div className="min-h-0 overflow-y-auto px-4 py-4">
            {children}
          </div>
          {footer ? (
            <DialogFooter className="mt-0 shrink-0 justify-end border-t border-erp-border-header px-4 py-3">
              {footer}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size={resolvedSize} className={className} showClose={showClose}>
        {(title || titleExtra || description) && (
          <DialogHeader>
            {(title || titleExtra) ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                {title ? <DialogTitle>{title}</DialogTitle> : null}
                {titleExtra}
              </div>
            ) : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
