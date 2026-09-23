import { Check, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from './StatusBadge.jsx';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { typography } from '../../styles/typography.js';
import { cn } from '../../lib/utils.js';

export function EditorCard({ title, actions, children, className = '' }) {
  const [open, setOpen] = useState(true);

  return (
    <section className={cn('overflow-hidden rounded-erp-section border border-erp-border-card bg-erp-surface-panel', className)}>
      {(title || actions) && (
        <div className="flex min-h-12 items-center justify-between border-b border-erp-border-header px-4 py-2.5">
          {title && (
            <h2 className={cn('min-w-0', typography.sectionTitle)}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-erp-control px-0.5 py-0.5 text-left hover:text-erp-primary"
                aria-expanded={open}
                aria-label={`${open ? '收起' : '展开'}${title}`}
                onClick={() => setOpen((current) => !current)}
              >
                <span>{title}</span>
                {open ? <ChevronDown className="h-4 w-4" strokeWidth={2} /> : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
              </button>
            </h2>
          )}
          {open && actions && <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {open && children}
    </section>
  );
}

function StatusBadgeList({ statuses, status }) {
  const items = statuses?.length
    ? statuses
    : status
      ? [{ label: status }]
      : [];

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <StatusBadge key={item.label} tone={item.tone}>{item.label}</StatusBadge>
      ))}
    </div>
  );
}

export function DocumentEditorFrame({
  title,
  status,
  statuses,
  children,
  onCancel,
  onSave,
  onSaveAndSubmit,
  submitLabel = '提交审核',
  saveLabel = '保存',
  dirty = false,
  showSubmit = true,
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface text-erp-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-erp-border-header bg-erp-surface-panel px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={cn('truncate', typography.docTitle)}>{title}</h1>
              <StatusBadgeList statuses={statuses} status={status} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty ? (
            <ConfirmDialog
              trigger={<Button variant="outline" size="compact">取消</Button>}
              title="确认离开此页面？"
              description="当前修改尚未保存，离开后内容将丢失。"
              confirmLabel="确认离开"
              cancelLabel="继续编辑"
              confirmVariant="primary"
              onConfirm={onCancel}
            />
          ) : (
            <Button variant="outline" size="compact" onClick={onCancel}>取消</Button>
          )}
          <Button variant="outline" size="compact" onClick={onSave}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.9} />
            {saveLabel}
          </Button>
          {showSubmit && onSaveAndSubmit ? (
            <Button variant="primary" size="compact" onClick={onSaveAndSubmit}>
              <Check className="h-3.5 w-3.5" strokeWidth={1.9} />
              {submitLabel}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-full space-y-3 px-4 py-3">
          {children}
        </div>
      </div>
    </main>
  );
}
