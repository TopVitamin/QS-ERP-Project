import { Toaster as SonnerToaster } from 'sonner';

const toastBaseClassName = 'border text-[12px] shadow-erp-overlay';

export function AppToaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={56}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: `${toastBaseClassName} border-erp-border-strong bg-erp-surface-panel text-erp-text`,
          title: 'text-[12px] font-medium',
          description: 'text-[12px] text-erp-text-muted',
          success: `${toastBaseClassName} border-erp-success/30 bg-erp-success-bg text-erp-success-hover`,
          error: `${toastBaseClassName} border-erp-danger/30 bg-erp-danger-bg text-erp-danger-hover`,
          warning: `${toastBaseClassName} border-erp-warning/30 bg-erp-warning-bg text-erp-warning`,
          info: `${toastBaseClassName} border-erp-primary/20 bg-erp-info-bg text-erp-primary-hover`,
          closeButton: 'border-erp-border-strong bg-erp-surface-panel text-erp-text-muted',
        },
      }}
    />
  );
}
