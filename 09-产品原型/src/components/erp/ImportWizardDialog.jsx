import { useMemo, useRef, useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.jsx';
import { WizardSteps } from './WizardSteps.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { parseSpreadsheetFile } from '../../lib/spreadsheet.js';
import { getImportFields, validateImportRows } from '../../lib/transferTargets.js';
import { buildImportSampleFile, commitImport, downloadImportFailures, downloadImportTemplate } from '../../lib/transferService.js';

const steps = ['上传文件', '数据校验', '确认导入', '导入结果'];
const previewPageSize = 8;

const actionLabels = { create: '新增', update: '更新', error: '校验不通过' };
const actionTones = { create: 'text-erp-success', update: 'text-erp-primary', error: 'text-erp-danger' };

function displayValue(field, value) {
  if (!value) return '';
  if (field.options) return field.options.find((option) => option.value === value)?.label ?? value;
  return value;
}

export function ImportWizardDialog({ open, onOpenChange, target, onCompleted, onOpenPage }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [validation, setValidation] = useState(null);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const importFields = useMemo(() => (target ? getImportFields(target) : []), [target]);
  const previewPageCount = validation ? Math.max(1, Math.ceil(validation.items.length / previewPageSize)) : 1;
  const previewItems = validation ? validation.items.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize) : [];

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFile(null);
    setParsed(null);
    setValidation(null);
    setParseError('');
    setResult(null);
    setPreviewPage(1);
    setDragging(false);
  }, [open, target?.id]);

  if (!target) return null;

  async function handleFile(fileObject) {
    setParseError('');
    try {
      const table = await parseSpreadsheetFile(fileObject);
      if (!table.headers.length) {
        setFile(fileObject);
        setParseError('未读取到表头，请确认文件第一行是字段名称');
        return;
      }
      const nextValidation = validateImportRows(target, table.headers, table.rows);
      setFile(fileObject);
      if (nextValidation.headerErrors.length) {
        setParseError(nextValidation.headerErrors.join('；'));
        return;
      }
      setParsed({ fileName: fileObject.name, ...table });
      setValidation(nextValidation);
      setPreviewPage(1);
      setStep(2);
    } catch {
      setFile(fileObject);
      setParseError('文件解析失败，请另存为 xlsx / csv / tsv 后重试');
    }
  }

  function submitImport() {
    const task = commitImport({ target, fileName: parsed.fileName, validation });
    setResult(task);
    setStep(4);
    onCompleted?.(task);
  }

  function renderStep() {
    if (step === 1) {
      return (
        <div className="space-y-3">
          <section className="flex items-center justify-between gap-4 rounded-erp-section border border-erp-border-light bg-erp-surface px-4 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-erp-primary" strokeWidth={1.8} />
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-erp-text-title">先下载模板，按模板填写</div>
                <p className="mt-0.5 text-[11px] leading-5 text-erp-text-muted">
                  模板内含字段说明与可选值，列名请保持不变。按「{target.keyLabel}」匹配：已存在则更新非空字段，不存在则新增；导入后统一回到草稿状态待审核。
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => downloadImportTemplate(target, 'xlsx')}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.9} />XLSX 模板
              </Button>
              <Button variant="outline" onClick={() => downloadImportTemplate(target, 'csv')}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.9} />CSV 模板
              </Button>
            </div>
          </section>

          <button
            type="button"
            className={cn(
              'flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-erp-section border border-dashed transition-colors',
              dragging ? 'border-erp-primary bg-erp-primary-soft/40' : 'border-erp-border-control bg-erp-surface hover:border-erp-primary',
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) handleFile(dropped);
            }}
          >
            <UploadCloud className="h-8 w-8 text-erp-text-muted" strokeWidth={1.6} />
            <span className="text-[13px] text-erp-text">点击选择填写好的文件，或将文件拖到此处</span>
            <span className="text-[11px] text-erp-text-muted">支持 .xlsx / .xls / .csv / .tsv，第一行为字段名称</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = '';
              if (selected) handleFile(selected);
            }}
          />
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-erp-text-muted">
            <span>没有现成文件？</span>
            <Button variant="text" size="compact" onClick={() => handleFile(buildImportSampleFile(target))}>载入示例数据</Button>
            <span>示例包含新增、更新和异常行，可直接体验校验流程</span>
          </div>
          {file && (
            <div className="flex items-center gap-2 rounded-erp-section border border-erp-border-light bg-erp-surface px-3 py-2 text-[12px] text-erp-text">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-erp-success" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
              {parsed && <span className="shrink-0 text-erp-text-muted">已读取 {validation.summary.total} 行，进入下一步校验</span>}
            </div>
          )}
          {parseError && (
            <div className="flex items-start gap-2 rounded-erp-section border border-erp-danger/40 bg-erp-danger-bg px-3 py-2.5 text-[12px] text-erp-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      );
    }

    if (step === 2 && validation) {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-erp-text">
            <span>共读取 <span className="font-medium">{validation.summary.total}</span> 行</span>
            <span className="text-erp-success">新增 {validation.summary.create}</span>
            <span className="text-erp-primary">更新 {validation.summary.update}</span>
            <span className="text-erp-danger">校验不通过 {validation.summary.error}</span>
            {validation.unknownColumns.length > 0 && (
              <span className="text-erp-warning" title={validation.unknownColumns.join('、')}>
                未识别的列将忽略：{validation.unknownColumns.slice(0, 3).join('、')}{validation.unknownColumns.length > 3 ? ` 等 ${validation.unknownColumns.length} 列` : ''}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-erp-section border border-erp-border-light">
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-erp-surface-table-head text-erp-text-section">
                  <tr className="h-9 border-b border-erp-border-table-header">
                    <th className="w-14 border-r border-erp-border-table-column px-2 text-center font-normal">行号</th>
                    <th className="w-[110px] border-r border-erp-border-table-column px-2 font-normal">校验结果</th>
                    {importFields.map((field) => (
                      <th key={field.key} className="min-w-[120px] border-r border-erp-border-table-column px-2 font-normal last:border-r-0">{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item) => (
                    <tr key={item.rowNumber} className={cn('h-9 border-b border-erp-border-table-row last:border-b-0', item.action === 'error' && 'bg-erp-danger-bg/50')}>
                      <td className="border-r border-erp-border-table-column px-2 text-center text-erp-text-muted">{item.rowNumber}</td>
                      <td className="border-r border-erp-border-table-column px-2" title={item.errors.join('；')}>
                        <span className={cn('font-medium', actionTones[item.action])}>{actionLabels[item.action]}</span>
                        {item.action === 'error' && <span className="ml-1 text-erp-danger">（{item.errors[0]}）</span>}
                      </td>
                      {importFields.map((field) => (
                        <td
                          key={field.key}
                          className={cn(
                            'truncate border-r border-erp-border-table-column px-2 text-erp-text last:border-r-0',
                            item.errors.some((error) => error.includes(`「${field.label}」`)) && 'text-erp-danger',
                          )}
                          title={displayValue(field, item.values[field.key])}
                        >
                          {displayValue(field, item.values[field.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex h-10 items-center justify-between border-t border-erp-border-light px-3 text-[11px] text-erp-text-muted">
              <span>校验不通过的行会跳过，可在导入结果中下载失败明细</span>
              <div className="flex items-center gap-1.5">
                <span className="mr-1">第 {previewPage} / {previewPageCount} 页</span>
                <Button variant="outline" size="icon" className="h-6 w-6" aria-label="上一页" disabled={previewPage <= 1} onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6" aria-label="下一页" disabled={previewPage >= previewPageCount} onClick={() => setPreviewPage((current) => Math.min(previewPageCount, current + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-erp-section border border-erp-border-light bg-erp-surface p-4 text-[12px]">
            <SummaryField label="导入对象" value={target.label} />
            <SummaryField label="文件" value={parsed?.fileName} />
            <SummaryField label="新增" value={`${validation.summary.create} 条`} tone="text-erp-success" />
            <SummaryField label="更新" value={`${validation.summary.update} 条`} tone="text-erp-primary" />
            <SummaryField label="跳过（校验不通过）" value={`${validation.summary.error} 条`} tone={validation.summary.error ? 'text-erp-danger' : undefined} />
            <SummaryField label="匹配方式" value={`按「${target.keyLabel}」匹配，已存在则更新非空字段`} />
          </section>
          <div className="flex items-start gap-2 rounded-erp-section border border-erp-warning/40 bg-erp-warning-bg px-3 py-2.5 text-[12px] text-erp-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
            <span>导入的数据统一回到「草稿」状态，需人工审核确认后才会生效。</span>
          </div>
        </div>
      );
    }

    if (step === 4 && result) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-erp-success" strokeWidth={1.6} />
          <div>
            <p className="text-[14px] font-medium text-erp-text-title">导入完成</p>
            <p className="mt-1.5 text-[12px] text-erp-text">
              新增 <span className="text-erp-success">{result.createdCount}</span> 条，更新 <span className="text-erp-primary">{result.updatedCount}</span> 条，跳过 <span className={result.skippedCount ? 'text-erp-danger' : ''}>{result.skippedCount}</span> 条
            </p>
            <p className="mt-1 text-[11px] text-erp-text-muted">数据已回到草稿状态，等待审核；任务号 {result.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {result.skippedCount > 0 && (
              <Button variant="outline" onClick={() => downloadImportFailures(result)}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.9} />下载失败明细
              </Button>
            )}
            {onOpenPage && (
              <Button variant="outline" onClick={() => { onOpenChange?.(false); onOpenPage('import-center'); }}>查看导入中心</Button>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  const stepHints = {
    1: '模板列名需与系统字段一致',
    2: '仅导入校验通过的数据',
    3: '导入后需人工审核',
    4: '可前往导入中心查看任务记录',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="flex h-[min(620px,calc(100vh-32px))] w-[min(920px,calc(100vw-32px))] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-erp-border-header p-0">
          <div className="px-4 pb-3 pt-4 pr-12">
            <DialogTitle className="text-[16px]">导入{target.label}{target.demoImport ? '（Mock演示）' : ''}</DialogTitle>
            {target.demoImport && (
              <p className="mt-1 text-[12px] text-erp-warning">本导入仅为Demo Mock，不作为正式{target.label}导入。</p>
            )}
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
                <Button variant="primary" disabled={!parsed} onClick={() => setStep(2)}>下一步</Button>
              </>
            )}
            {step === 2 && validation && (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
                <Button variant="primary" disabled={validation.summary.create + validation.summary.update === 0} onClick={() => setStep(3)}>下一步</Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
                <Button variant="primary" onClick={submitImport}>开始导入</Button>
              </>
            )}
            {step === 4 && <Button variant="primary" onClick={() => onOpenChange?.(false)}>完成</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryField({ label, value, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-erp-text-muted">{label}</span>
      <span className={cn('min-w-0 truncate text-erp-text', tone)} title={String(value ?? '')}>{value ?? EMPTY_PLACEHOLDER}</span>
    </div>
  );
}
