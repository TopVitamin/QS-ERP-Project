import { Pencil } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { Button } from '../ui/button.jsx';
import { DetailField } from '../ui/form-field.jsx';
import { typography } from '../../styles/typography.js';
import { cn } from '../../lib/utils.js';
import { EditorCard } from './DocumentEditorFrame.jsx';

export { DetailField };

export function DocumentDetailFrame({ title, status, children, onBack, onEdit, editLabel = '修改' }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface text-erp-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-erp-border-header bg-erp-surface-panel px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className={cn('truncate', typography.docTitle)}>{title}</h1>
          <StatusBadge>{status}</StatusBadge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="compact" onClick={onBack}>返回列表</Button>
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
