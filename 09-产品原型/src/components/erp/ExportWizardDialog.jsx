import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, GripVertical, Search, X } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { WizardSteps } from './WizardSteps.jsx';
import { cn } from '../../lib/utils.js';
import { getExportFields } from '../../lib/transferTargets.js';
import { startExportTask } from '../../lib/transferService.js';

const steps = ['选择范围', '选择字段', '导出设置', '提交结果'];
const formatOptions = [
  { value: 'xlsx', label: 'XLSX', description: 'Excel 工作簿，适合再编辑' },
  { value: 'csv', label: 'CSV', description: '逗号分隔，通用性最好' },
  { value: 'tsv', label: 'TSV', description: '制表符分隔，适合程序处理' },
];

function formatDateStamp() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

export function ExportWizardDialog({ open, onOpenChange, target, scopeSource, defaultColumnKeys, onCompleted, onOpenPage }) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [dragKey, setDragKey] = useState(null);
  const [format, setFormat] = useState('xlsx');
  const [fileName, setFileName] = useState('');
  const [task, setTask] = useState(null);

  const fields = useMemo(() => (target ? getExportFields(target) : []), [target]);
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const scopeOptions = useMemo(() => {
    const options = [{ value: 'all', label: '全部数据', count: scopeSource?.all?.length ?? 0, description: '导出模块内全部数据' }];
    if (scopeSource?.filtered) options.push({ value: 'filtered', label: '当前筛选结果', count: scopeSource.filtered.length, description: '仅导出当前查询条件下的数据' });
    if (scopeSource?.selected) options.push({ value: 'selected', label: '已选中数据', count: scopeSource.selected.length, description: '仅导出列表中勾选的数据' });
    return options;
  }, [scopeSource]);
  const scopeRows = scope === 'filtered' ? scopeSource.filtered : scope === 'selected' ? scopeSource.selected : scopeSource?.all ?? [];
  const selectedFields = selectedKeys.map((key) => fieldByKey.get(key)).filter(Boolean);
  const visibleFields = keyword ? fields.filter((field) => field.label.includes(keyword)) : fields;

  useEffect(() => {
    if (!open || !target) return;
    const initialKeys = (defaultColumnKeys?.length ? defaultColumnKeys : fields.map((field) => field.key)).filter((key) => fieldByKey.has(key));
    setStep(1);
    setScope(scopeOptions.some((option) => option.value === 'filtered') ? 'filtered' : 'all');
    setSelectedKeys(initialKeys.length ? initialKeys : fields.map((field) => field.key));
    setKeyword('');
    setDragKey(null);
    setFormat('xlsx');
    setFileName(`${target.label}-${formatDateStamp()}`);
    setTask(null);
  }, [open, target?.id]);

  if (!target) return null;

  function toggleField(key) {
    setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function selectAllVisible() {
    setSelectedKeys((current) => [...new Set([...current, ...visibleFields.map((field) => field.key)])]);
  }

  function handleDragOver(event, targetKey) {
    event.preventDefault();
    if (!dragKey || dragKey === targetKey) return;
    setSelectedKeys((current) => {
      const from = current.indexOf(dragKey);
      const to = current.indexOf(targetKey);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, dragKey);
      return next;
    });
  }

  function submitExport() {
    const nextTask = startExportTask({ target, fileName, format, fields: selectedFields, rows: scopeRows });
    setTask(nextTask);
    setStep(4);
    onCompleted?.(nextTask);
  }

  function renderStep() {
    if (step === 1) {
      return (
        <div className="space-y-3">
          {scopeOptions.map((option) => {
            const active = scope === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-erp-section border px-4 py-3 text-left transition-colors',
                  active ? 'border-erp-primary bg-erp-primary-soft/40' : 'border-erp-border-light hover:border-erp-primary',
                )}
                onClick={() => setScope(option.value)}
              >
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-erp-primary' : 'border-erp-border-control')}>
                  {active && <span className="h-2 w-2 rounded-full bg-erp-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] text-erp-text">
                    {option.label}
                    <span className="text-[11px] text-erp-text-muted">共 {option.count} 条</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-erp-text-muted">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex h-full min-h-0 gap-3">
          <section className="flex min-w-0 flex-1 flex-col rounded-erp-section border border-erp-border-light" aria-label="可选字段">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-erp-border-light px-3">
              <span className="text-[12px] font-medium text-erp-text-section">可选字段（{fields.length}）</span>
              <div className="flex items-center gap-1">
                <Button variant="text" size="compact" onClick={selectAllVisible}>全选</Button>
                <Button variant="text" size="compact" disabled={!selectedKeys.length} onClick={() => setSelectedKeys([])}>清空</Button>
              </div>
            </div>
            <div className="shrink-0 border-b border-erp-border-light p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-erp-text-placeholder" strokeWidth={1.9} />
                <Input variant="boxed" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索字段名称" aria-label="搜索字段名称" className="pl-7" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {visibleFields.map((field) => {
                const checked = selectedKeys.includes(field.key);
                return (
                  <label key={field.key} className="flex h-8 cursor-pointer items-center gap-2 rounded-erp-control px-2 hover:bg-erp-surface-hover">
                    <Checkbox checked={checked} onCheckedChange={() => toggleField(field.key)} aria-label={`选择字段${field.label}`} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-erp-text" title={field.label}>{field.label}</span>
                  </label>
                );
              })}
              {!visibleFields.length && <div className="flex h-16 items-center justify-center text-[12px] text-erp-text-muted">没有匹配的字段</div>}
            </div>
          </section>

          <aside className="flex w-[260px] shrink-0 flex-col rounded-erp-section border border-erp-border-light" aria-label="已选字段">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-erp-border-light px-3">
              <span className="text-[12px] font-medium text-erp-text-section">已选字段（{selectedFields.length}）</span>
              <span className="text-[11px] text-erp-text-muted">拖动排序</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {selectedFields.map((field) => (
                <div
                  key={field.key}
                  onDragOver={(event) => handleDragOver(event, field.key)}
                  className={cn('group flex h-8 items-center gap-1.5 rounded-erp-control px-1.5 hover:bg-erp-surface-hover', dragKey === field.key && 'bg-erp-primary-soft')}
                >
                  <span
                    draggable
                    onDragStart={() => setDragKey(field.key)}
                    onDragEnd={() => setDragKey(null)}
                    className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-erp-text-placeholder"
                    aria-hidden="true"
                  >
                    <GripVertical className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-erp-text" title={field.label}>{field.label}</span>
                  <button
                    type="button"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-erp-control text-erp-text-muted opacity-0 transition-opacity hover:bg-erp-danger-bg hover:text-erp-danger group-hover:opacity-100"
                    onClick={() => toggleField(field.key)}
                    aria-label={`移除字段${field.label}`}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              ))}
              {!selectedFields.length && <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-erp-text-muted">至少选择一个字段</div>}
            </div>
          </aside>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <section>
            <h3 className="mb-2 text-[13px] font-medium text-erp-text-title">文件格式</h3>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((option) => {
                const active = format === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'rounded-erp-section border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-erp-primary bg-erp-primary-soft/40' : 'border-erp-border-light hover:border-erp-primary',
                    )}
                    onClick={() => setFormat(option.value)}
                  >
                    <span className={cn('block text-[13px]', active ? 'font-medium text-erp-primary' : 'text-erp-text')}>{option.label}</span>
                    <span className="mt-0.5 block text-[11px] text-erp-text-muted">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-erp-text-title">文件名</span>
              <div className="flex items-center gap-2">
                <Input variant="boxed" value={fileName} onChange={(event) => setFileName(event.target.value)} aria-label="文件名" className="max-w-[360px]" />
                <span className="text-[12px] text-erp-text-muted">.{format}</span>
              </div>
            </label>
          </section>

          <section className="rounded-erp-section border border-erp-border-light bg-erp-surface px-4 py-3 text-[12px] text-erp-text">
            将导出「{scopeOptions.find((option) => option.value === scope)?.label}」共 <span className="font-medium">{scopeRows.length}</span> 条，字段 <span className="font-medium">{selectedFields.length}</span> 个，格式 <span className="font-medium">{format.toUpperCase()}</span>。
            <span className="text-erp-text-muted">提交后进入导出中心；完成后可在导出中心下载，并收到消息通知。</span>
          </section>
        </div>
      );
    }

    if (step === 4 && task) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-erp-success" strokeWidth={1.6} />
          <div>
            <p className="text-[14px] font-medium text-erp-text-title">导出任务已创建</p>
            <p className="mt-1.5 text-[12px] text-erp-text">
              任务号 {task.id}，共 {task.rowCount} 条；完成后会在消息中心通知。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPage && (
              <Button variant="outline" onClick={() => { onOpenChange?.(false); onOpenPage('export-center'); }}>查看导出中心</Button>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  const stepHints = {
    1: '根据当前列表筛选或勾选决定导出数据',
    2: '导出顺序与右侧字段顺序一致',
    3: '所有导出均以任务形式生成',
    4: '可在导出中心下载结果',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="flex h-[min(600px,calc(100vh-32px))] w-[min(820px,calc(100vw-32px))] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-erp-border-header p-0">
          <div className="px-4 pb-3 pt-4 pr-12">
            <DialogTitle className="text-[16px]">导出{target.label}</DialogTitle>
          </div>
          <div className="px-4 pb-3">
            <WizardSteps steps={steps} current={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{renderStep()}</div>

        <DialogFooter className="mt-0 shrink-0 justify-between border-t border-erp-border-header px-4 py-3">
          <span className="text-[11px] text-erp-text-muted">{stepHints[step]}</span>
          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
                <Button variant="outline" onClick={() => onOpenChange?.(false)}>取消</Button>
                <Button variant="primary" onClick={() => setStep(2)}>下一步</Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
                <Button variant="primary" disabled={!selectedFields.length} onClick={() => setStep(3)}>下一步</Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
                <Button variant="primary" disabled={!fileName.trim()} onClick={submitExport}>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.9} />提交导出任务
                </Button>
              </>
            )}
            {step === 4 && <Button variant="primary" onClick={() => onOpenChange?.(false)}>完成</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
