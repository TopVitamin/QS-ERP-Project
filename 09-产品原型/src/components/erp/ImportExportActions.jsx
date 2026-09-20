import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { ExportWizardDialog } from './ExportWizardDialog.jsx';
import { ImportWizardDialog } from './ImportWizardDialog.jsx';

export function ImportExportActions({ target, scopeSource, defaultColumnKeys, notify, onOpenPage, onCompleted }) {
  const [dialogType, setDialogType] = useState(null);
  if (!target) return null;

  const showImport = target.importable !== false || target.demoImport;
  const importLabel = target.demoImport ? '导入（Mock）' : '导入';

  return (
    <span className="inline-flex items-center gap-2">
      {showImport && (
        <Button variant="outline" size="compact" aria-label={importLabel} onClick={() => setDialogType('import')}>
          <Upload className="h-3.5 w-3.5" strokeWidth={1.9} />
          <span>{importLabel}</span>
        </Button>
      )}
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
            notify?.(target.demoImport
              ? `导入完成（Mock演示）：新增 ${task.createdCount} 条、更新 ${task.updatedCount} 条`
              : `导入完成：新增 ${task.createdCount} 条、更新 ${task.updatedCount} 条`, 'success');
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
