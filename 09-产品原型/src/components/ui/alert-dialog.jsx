import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils.js';
import { Button } from './button.jsx';
import { overlayClassName } from './overlay.jsx';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;

export function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(overlayClassName, className)}
      {...props}
    />
  );
}

export function AlertDialogContent({ className, children, ...props }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[140] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-erp-dialog border border-erp-border-strong bg-erp-surface-panel p-5 text-erp-text shadow-erp-dialog outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

/** 二次确认：取消 + 确认 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  confirmVariant = 'primary',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogTitle className="text-[15px] font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[12px] leading-5 text-erp-text-muted">{description}</AlertDialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** 信息提示：仅一个确认按钮 */
export function InfoDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '知道了',
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogTitle className="text-[15px] font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[12px] leading-5 text-erp-text-muted">{description}</AlertDialogDescription>
        <div className="mt-5 flex justify-end">
          <AlertDialogAction asChild>
            <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
