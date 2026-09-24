import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { FinanceResultActionDialogs } from '../components/erp/FinanceResultActionDialogs.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import {
  financeResultColumns,
  financeResultFilterFields,
  financeResultInitialFilters,
  FINANCE_RESULT_STORAGE_KEY,
} from '../data/financeResultData.js';
import { resolveResultDocument } from '../lib/inventoryResultDocs.js';
import { matchesDateRange, matchesMultiSelect } from '../lib/listFilters.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import {
  canOpsRetryFinanceResult,
  canRetryFinanceResult,
  loadFinanceResultRows,
  normalizeFinanceResultRows,
} from '../lib/financeResultLogic.js';

/** 查询条件之间按 AND 匹配；类型与推送状态多选按 OR；结果单号模糊；仓库对直接调拨单按来源或目标命中（主PRD R07）。 */
function filterRows(row, filters) {
  if (!matchesMultiSelect(row.docType, filters.docType)) return false;
  const docNo = String(filters.docNo || '').trim().toLowerCase();
  if (docNo && !String(row.docNo || '').toLowerCase().includes(docNo)) return false;
  if (!matchesDateRange(row.businessDate, filters.businessDate)) return false;
  if (filters.warehouse) {
    const warehouseCodes = row.docType === 'direct_transfer' ? [row.fromWarehouse, row.toWarehouse] : [row.warehouse];
    if (!warehouseCodes.includes(filters.warehouse)) return false;
  }
  if (!matchesMultiSelect(row.financeErpPushStatus, filters.financeErpPushStatus)) return false;
  if (!matchesDateRange(row.lastPushTime, filters.lastPushTime)) return false;
  return true;
}

const initialVisibility = Object.fromEntries(financeResultColumns.map((column) => [column.key, true]));
const columnOptions = financeResultColumns.map((column) => ({ key: column.key, label: column.label }));

/** 行内操作按推送状态互斥：推送失败可重推，推送成功可异常运维重推，所有状态可看推送记录（列表页 Demo PRD §6）。 */
const rowActions = [
  { id: 'records', label: '推送记录' },
  { id: 'retry', label: '重推', visibleWhen: canRetryFinanceResult },
  { id: 'ops-retry', label: '异常运维重推', visibleWhen: canOpsRetryFinanceResult },
];

/** 结果单号点击进入对应模块的结果单详情（只读）；不存在或不可访问时提示并停留列表（主PRD R09、AC09）。 */
function handleCellClick(column, row, { onFeedback, onOpenPage }) {
  if (column.key !== 'docNo' || !row.docNo) return;
  const target = resolveResultDocument(row.docTypeLabel, row.docNo);
  if (!target) {
    onFeedback?.('结果单不存在或不可访问', 'warning');
    return;
  }
  onOpenPage?.(target.pageId, { row: target.row });
}

export function FinanceResultListPage(props) {
  const [dialog, setDialog] = useState(null);
  const rows = useMemo(() => loadFinanceResultRows(), []);

  function handleRowAction(id, row) {
    if (id === 'records' || id === 'retry' || id === 'ops-retry') setDialog({ type: id, row });
  }

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.keepOpen) return;
    setDialog(null);
  }

  const config = {
    title: '业财结果单据',
    rows,
    storageKey: FINANCE_RESULT_STORAGE_KEY,
    normalizeRows: normalizeFinanceResultRows,
    initialFilters: financeResultInitialFilters,
    filterRows,
    initialVisibility,
    columns: financeResultColumns,
    columnOptions,
    filterFields: financeResultFilterFields,
    defaultSort: { key: 'businessDate', direction: 'desc' },
    initialPinnedKeys: ['docType', 'docNo'],
    // 跨页预填：第二阶段「推送异常」的「去重推」按 { docNo } 跳到本页并直接生效
    presetFilters: props.context?.presetFilters,
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('integration-finance-results')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={financeResultColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions,
    onRowAction: handleRowAction,
    onCellClick: handleCellClick,
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行业财结果单据查询',
    emptyText: '暂无业财结果单据',
    emptyTextFiltered: '该条件下暂无业财结果单据，可调整查询条件后重试',
  };

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <FinanceResultActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onPushFinished={(outcome) => props.onFeedback?.(outcome.message, outcome.type)}
      />
    </>
  );
}
