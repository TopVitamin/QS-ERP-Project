import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { ExportWizardDialog } from './ExportWizardDialog.jsx';
import { ImportWizardDialog } from './ImportWizardDialog.jsx';

export function ImportExportActions({ target, scopeSource, defaultColumnKeys, notify, onOpenPage, onCompleted }) {
  const [dialogType, setDialogType] = useState(null);
  if (!target) return null;

  function openImport() {
    if (target.importable === false) {
      notify?.('该模块导入字段与校验规则待确认，暂未开放', 'info');
      return;
    }
    setDialogType('import');
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="outline" size="compact" aria-label={`导入${target.label}`} onClick={openImport}>
        <Upload className="h-3.5 w-3.5" strokeWidth={1.9} />
        <span>导入</span>
      </Button>
      <Button variant="outline" size="compact" aria-label={`导出${target.label}`} onClick={() => setDialogType('export')}>
        <Download className="h-3.5 w-3.5" strokeWidth={1.9} />
        <span>导出</span>
      </Button>

      {dialogType === 'import' && (
        <ImportWizardDialog
          open
          target={target}
          onOpenChange={(next) => { if (!next) setDialogType(null); }}
          onOpenPage={onOpenPage}
          onCompleted={(task) => {
            notify?.(`导入完成：新增 ${task.createdCount} 条、更新 ${task.updatedCount} 条`, 'success');
            onCompleted?.(task);
          }}
        />
      )}
      {dialogType === 'export' && (
        <ExportWizardDialog
          open
          target={target}
          scopeSource={scopeSource}
          defaultColumnKeys={defaultColumnKeys}
          onOpenChange={(next) => { if (!next) setDialogType(null); }}
          onOpenPage={onOpenPage}
          onCompleted={(task) => {
            notify?.(`导出任务已创建：${task.id}`, 'success');
            onCompleted?.(task);
          }}
        />
      )}
    </span>
  );
}
