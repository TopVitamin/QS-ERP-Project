import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { seedTransferTasks, transferTaskColumns } from '../data/transferTaskData.js';
import { readTransferTasks, TRANSFER_TASKS_STORAGE_KEY } from '../lib/taskStore.js';
import { transferTargets } from '../lib/transferTargets.js';
import { deleteTransferTask, downloadExportTask, downloadImportFailures } from '../lib/transferService.js';

const initialFilters = {
  keyword: '',
  targetLabel: '',
  operator: '',
  createdRange: { from: '', to: '' },
};

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  if (keyword && ![row.id, row.fileName].some((value) => String(value || '').toLowerCase().includes(keyword))) return false;
  if (filters.targetLabel && row.targetLabel !== filters.targetLabel) return false;
  if (filters.operator && row.operator !== filters.operator) return false;
  const createdDay = String(row.createdAt || '').slice(0, 10);
  const range = filters.createdRange || {};
  if (range.from && createdDay < range.from) return false;
  if (range.to && createdDay > range.to) return false;
  return true;
}

function getOperatorOptions() {
  const operators = new Set(readTransferTasks().map((task) => task.operator).filter(Boolean));
  return [...operators].map((operator) => ({ value: operator, label: operator }));
}

function getTargetOptions(type) {
  return transferTargets
    .filter((target) => (type === 'import' ? target.importable !== false : true))
    .map((target) => ({ value: target.label, label: target.label }));
}

const initialVisibility = Object.fromEntries(transferTaskColumns.map((column) => [column.key, true]));
const columnOptions = transferTaskColumns.map((column) => ({ key: column.key, label: column.label }));

function handleRowAction(id, row, { notify }) {
  if (id === 'download') {
    if (row.type === 'import') {
      downloadImportFailures(row);
      notify(`已下载「${row.fileName}」失败明细`, 'success');
      return;
    }
    downloadExportTask(row);
    notify(`已下载「${row.fileName}.${row.format}」`, 'success');
    return;
  }
  if (id === 'delete') {
    deleteTransferTask(row.id);
    notify('任务记录已删除', 'success');
  }
}

function createConfig(type) {
  const isImport = type === 'import';
  return {
    title: isImport ? '导入中心' : '导出中心',
    rows: seedTransferTasks,
    storageKey: TRANSFER_TASKS_STORAGE_KEY,
    initialFilters,
    filterRows: (row, filters) => row.type === type && filterRows(row, filters),
    initialVisibility,
    columns: transferTaskColumns,
    columnOptions,
    filterFields: [
      { key: 'keyword', label: '任务号/文件名', type: 'search', placeholder: '输入任务号或文件名' },
      { key: 'targetLabel', label: '对象', type: 'select', options: getTargetOptions(type) },
      { key: 'operator', label: '操作人', type: 'select', options: getOperatorOptions() },
      { key: 'createdRange', label: '创建时间', type: 'date-range', placeholder: '选择日期范围' },
    ],
    headerActions: [],
    tabs: {
      filterKey: 'status',
      items: [
        { value: '', label: '全部' },
        { value: 'processing', label: '处理中' },
        { value: 'done', label: '已完成' },
        { value: 'failed', label: '失败' },
      ],
    },
    toolbarActions: [],
    rowActions: [
      {
        id: 'download',
        label: isImport ? '下载失败明细' : '下载文件',
        visibleWhen: (row) => (isImport ? row.skippedCount > 0 : row.status === 'done'),
      },
      {
        id: 'delete',
        label: '删除',
        variant: 'danger',
        confirm: {
          title: '确认删除此任务记录？',
          description: '删除后不会再出现在任务列表中。',
          confirmLabel: '确认删除',
          confirmVariant: 'danger',
        },
      },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: isImport ? '已执行导入任务查询' : '已执行导出任务查询',
    onRowAction: handleRowAction,
  };
}

export function ImportCenterPage(props) {
  return <DocumentListPage {...props} config={createConfig('import')} />;
}

export function ExportCenterPage(props) {
  return <DocumentListPage {...props} config={createConfig('export')} />;
}
