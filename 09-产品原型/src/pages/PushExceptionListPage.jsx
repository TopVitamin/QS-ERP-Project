import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PushExceptionActionDialogs } from '../components/erp/PushExceptionActionDialogs.jsx';
import {
  getPushExceptionColumns,
  getPushExceptionExportFields,
  getPushExceptionFilterFields,
  pushExceptionDocTypeLabels,
  pushExceptionInitialFilters,
  pushExceptionTabItems,
  PUSH_EXCEPTION_STORAGE_KEY,
} from '../lib/pushExceptionLogic.js';
import { matchesDateRange } from '../lib/listFilters.js';
import { matchesMultiSelect } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { loadPushExceptionRows, resolveExceptionProduct, resolveExceptionSourceDocument } from '../lib/pushExceptionLogic.js';

function includesText(value, input) {
  const keyword = String(input || '').trim().toLowerCase();
  if (!keyword) return false;
  return String(value || '').toLowerCase().includes(keyword);
}

/** 查询条件之间按 AND 匹配；页签值先命中本页签的行，其余条件按各页签适用字段过滤（主PRD R03、R07）。 */
function filterRows(row, filters) {
  if (row.tab !== filters.tab) return false;
  if (filters.status && row.status !== filters.status) return false;
  if (!matchesDateRange(row.failTime, filters.failTime)) return false;
  if (!matchesMultiSelect(row.docType, filters.docType)) return false;
  if (filters.docNo && !includesText(row.docNo, filters.docNo)) return false;
  if (!matchesMultiSelect(row.targetSystem, filters.targetSystem)) return false;
  if (!matchesMultiSelect(row.pushContent, filters.pushContent)) return false;
  if (filters.productCode && !includesText(row.productCode, filters.productCode)) return false;
  if (filters.productName && !includesText(row.productName, filters.productName)) return false;
  if (!matchesMultiSelect(row.sourceSystem, filters.sourceSystem)) return false;
  if (filters.sourceNo && !includesText(row.sourceNo, filters.sourceNo)) return false;
  if (!matchesMultiSelect(row.stage, filters.stage)) return false;
  return true;
}

/** 对象标识列：处理记录与「去重推」之外的跳转入口（主PRD R06、R09）。 */
function handleCellClick(column, row, { onFeedback, onOpenPage }) {
  if (column.key === 'docNo' && row.docNo) {
    const target = resolveExceptionSourceDocument(pushExceptionDocTypeLabels[row.docType], row.docNo);
    if (!target) {
      onFeedback?.('单据不存在或不可访问', 'warning');
      return;
    }
    onOpenPage?.(target.pageId, target.row ? { row: target.row } : undefined);
    return;
  }
  if (column.key === 'productCode' && row.productCode) {
    const target = resolveExceptionProduct(row.productCode);
    if (!target) {
      onFeedback?.('商品不存在或不可访问', 'warning');
      return;
    }
    onOpenPage?.(target.pageId, { row: target.row });
  }
}

export function PushExceptionListPage(props) {
  // 默认页签「推送财务ERP」；切换页签由 DocumentListPage 的 tabs.onChange 回调同步（主PRD R03）。
  const [activeTab, setActiveTab] = useState('finance');
  const [dialog, setDialog] = useState(null);
  const rows = useMemo(() => loadPushExceptionRows(), []);
  const columns = useMemo(() => getPushExceptionColumns(activeTab), [activeTab]);
  const filterFields = useMemo(() => getPushExceptionFilterFields(activeTab), [activeTab]);
  const initialVisibility = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, true])), [columns]);
  const columnOptions = useMemo(() => columns.map((column) => ({ key: column.key, label: column.label })), [columns]);

  const exportTarget = useMemo(() => {
    const base = getTransferTarget('integration-push-exceptions');
    return base ? { ...base, fields: getPushExceptionExportFields(activeTab) } : null;
  }, [activeTab]);

  // 行内只有「处理记录」；「推送财务ERP」页签的待处理行另有「去重推」，跳业财结果单据并预填结果单号（主PRD F04）。
  const rowActions = useMemo(() => [
    { id: 'records', label: '处理记录' },
    ...(activeTab === 'finance'
      ? [{ id: 'go-retry', label: '去重推', visibleWhen: (row) => row.status === 'pending' }]
      : []),
  ], [activeTab]);

  function handleRowAction(id, row) {
    if (id === 'records') setDialog({ type: 'records', row });
    if (id === 'go-retry') props.onOpenPage?.('integration-finance-results', { presetFilters: { docNo: row.docNo } });
  }

  const config = {
    title: '推送异常',
    rows,
    storageKey: PUSH_EXCEPTION_STORAGE_KEY,
    // 每个页签是独立的列/筛选项；页签值由初始筛选承载（配合下方 key={activeTab} 重建实例）。
    initialFilters: { ...pushExceptionInitialFilters, tab: activeTab },
    filterRows,
    // 页签用快捷筛选键 `tab` 表达；不显示数量角标，切换后按页签初值重置查询（主PRD R03）。
    tabs: {
      filterKey: 'tab',
      items: pushExceptionTabItems,
      showCounts: false,
      resetOnChange: true,
      onChange: setActiveTab,
    },
    initialVisibility,
    columns,
    columnOptions,
    filterFields,
    initialPinnedKeys: ['docType', 'docNo', 'productCode'],
    defaultSort: { key: 'failTime', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={exportTarget}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
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
    queryMessage: '已执行推送异常查询',
    emptyText: '暂无推送异常记录',
    emptyTextFiltered: '该条件下暂无推送异常记录，可调整查询条件后重试',
  };

  return (
    <>
      {/* 切换页签重建列表页实例：列显隐/列序、筛选项、勾选与页码都按该页签初值重来（主PRD R03） */}
      <DocumentListPage key={activeTab} {...props} config={config} />
      <PushExceptionActionDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
