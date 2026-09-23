import { Pencil } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { Button } from '../ui/button.jsx';
import { DetailField } from '../ui/form-field.jsx';
import { typography } from '../../styles/typography.js';
import { cn } from '../../lib/utils.js';
import { EditorCard } from './DocumentEditorFrame.jsx';

export { DetailField };

/** 弹窗内只读详情分区：纯标题 + 内容，不用 EditorCard 的折叠与卡片边框。 */
export function DialogViewSection({ title, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      {title ? <h3 className={typography.sectionTitle}>{title}</h3> : null}
      {children}
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

export function DocumentDetailFrame({
  title,
  status,
  statuses,
  children,
  headerActions,
  onBack,
  onEdit,
  editLabel = '修改',
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface text-erp-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-erp-border-header bg-erp-surface-panel px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className={cn('truncate', typography.docTitle)}>{title}</h1>
          <StatusBadgeList statuses={statuses} status={status} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="compact" onClick={onBack}>返回列表</Button>
          {headerActions}
          {onEdit && (
            <Button variant="primary" size="compact" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
              {editLabel}
            </Button>
          )}
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

export { EditorCard };
