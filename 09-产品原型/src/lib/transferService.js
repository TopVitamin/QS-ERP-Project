import { formatDateTime } from './format.js';
import { readMockRows, writeMockRows } from './mockStorage.js';
import { pushNotification } from './notificationStore.js';
import { buildDelimitedBlob, buildSheetBlob, buildWorkbookBlob, downloadBlob, toDelimitedText } from './spreadsheet.js';
import { createTransferTask, readTransferTasks, removeTransferTask, updateTransferTask } from './taskStore.js';
import { exportFieldValue, getImportFields } from './transferTargets.js';

export const currentOperator = '阿盛';
const EXPORT_TASK_DELAY = 1600;

function nextTaskNo(prefix) {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `${prefix}${day}-${String(Date.now()).slice(-5)}`;
}

function fieldInstruction(field) {
  if (field.options) return `可选值：${field.options.map((option) => option.label).join('、')}`;
  if (field.example) return `示例：${field.example}`;
  return '';
}

export async function downloadImportTemplate(target, format) {
  const fields = getImportFields(target);
  const headers = fields.map((field) => field.label);
  const example = fields.map((field) => field.example ?? (field.options ? field.options[0].label : ''));
  const fileName = `${target.label}导入模板`;

  if (format === 'xlsx') {
    const blob = await buildWorkbookBlob([
      { name: '导入模板', headers, rows: [example] },
      {
        name: '填写说明',
        headers: ['字段', '是否必填', '填写说明'],
        rows: fields.map((field) => [field.label, field.required ? '必填' : '选填', fieldInstruction(field)]),
      },
    ]);
    downloadBlob(blob, `${fileName}.xlsx`);
    return;
  }
  downloadBlob(buildDelimitedBlob({ headers, rows: [example], format }), `${fileName}.${format}`);
}

export function buildImportSampleFile(target) {
  const fields = getImportFields(target);
  const headers = fields.map((field) => field.label);
  const text = `\uFEFF${toDelimitedText({ headers, rows: target.sampleRows || [], format: 'csv' })}`;
  return new File([text], `${target.label}-示例数据.csv`, { type: 'text/csv;charset=utf-8' });
}

export function commitImport({ target, fileName, validation }) {
  const existingRows = readMockRows(target.storageKey, target.seedRows || []);
  const existingIndexByKey = new Map();
  existingRows.forEach((row, index) => existingIndexByKey.set(String(row[target.keyField] ?? ''), index));

  const nextRows = [...existingRows];
  const createdRows = [];
  const now = formatDateTime();
  let updatedCount = 0;

  validation.items.forEach((item, index) => {
    if (item.action === 'error') return;
    if (item.action === 'update') {
      const position = existingIndexByKey.get(String(item.values[target.keyField]));
      const merged = { ...nextRows[position] };
      Object.entries(item.values).forEach(([key, value]) => {
        if (value !== '') merged[key] = value;
      });
      if (target.auditField) merged[target.auditField] = target.auditDraftValue;
      merged.updatedAt = now;
      nextRows[position] = merged;
      updatedCount += 1;
      return;
    }
    createdRows.push({
      id: `${target.id}-import-${Date.now()}-${index}`,
      ...target.importDefaults,
      ...item.values,
      ...(target.auditField ? { [target.auditField]: target.auditDraftValue || 'draft' } : {}),
      updatedAt: now,
      creator: currentOperator,
    });
  });

  writeMockRows(target.storageKey, [...createdRows, ...nextRows]);

  const failureItems = validation.items.filter((item) => item.action === 'error');
  const task = {
    id: nextTaskNo('IM'),
    type: 'import',
    targetId: target.id,
    targetLabel: target.label,
    fileName,
    rowCount: validation.summary.total,
    createdCount: createdRows.length,
    updatedCount,
    skippedCount: failureItems.length,
    status: 'done',
    operator: currentOperator,
    createdAt: now,
    createdAtTs: Date.now(),
    finishedAt: now,
    failureFields: getImportFields(target).map((field) => ({ key: field.key, label: field.label })),
    failureRows: failureItems.map((item) => ({ rowNumber: item.rowNumber, values: item.values, errors: item.errors })),
  };
  createTransferTask(task);
  pushNotification({
    title: `导入完成：${fileName}，新增 ${task.createdCount} 条、更新 ${task.updatedCount} 条、跳过 ${task.skippedCount} 条`,
    tag: '导入',
    category: 'transfer',
    link: { pageId: 'import-center' },
  });
  return task;
}

export function downloadImportFailures(task) {
  const headers = [...task.failureFields.map((field) => field.label), '失败原因'];
  const rows = task.failureRows.map((item) => [
    ...task.failureFields.map((field) => item.values[field.key] ?? ''),
    item.errors.join('；'),
  ]);
  downloadBlob(buildDelimitedBlob({ headers, rows, format: 'csv' }), `${task.fileName.replace(/\.[^.]+$/, '')}-失败明细.csv`);
}

export function startExportTask({ target, fileName, format, fields, rows }) {
  const now = formatDateTime();
  const snapshot = rows.map((row) => Object.fromEntries(fields.map((field) => [field.key, exportFieldValue(field, row)])));
  const task = {
    id: nextTaskNo('EX'),
    type: 'export',
    targetId: target.id,
    targetLabel: target.label,
    fileName,
    format,
    rowCount: rows.length,
    fields: fields.map((field) => ({ key: field.key, label: field.label })),
    rows: snapshot,
    status: 'processing',
    operator: currentOperator,
    createdAt: now,
    createdAtTs: Date.now(),
    finishedAt: '',
  };
  createTransferTask(task);
  window.setTimeout(() => completeExportTask(task.id), EXPORT_TASK_DELAY);
  return task;
}

export function completeExportTask(id) {
  const task = readTransferTasks().find((item) => item.id === id);
  if (!task || task.status !== 'processing') return;
  updateTransferTask(id, (current) => ({ ...current, status: 'done', finishedAt: formatDateTime() }));
  pushNotification({
    title: `导出完成：${task.fileName}.${task.format}（${task.rowCount} 条）`,
    tag: '导出',
    category: 'transfer',
    link: { pageId: 'export-center' },
  });
}

export function reconcileTransferTasks() {
  readTransferTasks()
    .filter((task) => task.status === 'processing' && Date.now() - (task.createdAtTs || 0) > 15000)
    .forEach((task) => completeExportTask(task.id));
}

export async function downloadExportTask(task) {
  const headers = task.fields.map((field) => field.label);
  const rows = task.rows.map((row) => task.fields.map((field) => row[field.key] ?? ''));
  const blob = await buildSheetBlob({ headers, rows, format: task.format });
  downloadBlob(blob, `${task.fileName}.${task.format}`);
}

export function deleteTransferTask(id) {
  removeTransferTask(id);
}
