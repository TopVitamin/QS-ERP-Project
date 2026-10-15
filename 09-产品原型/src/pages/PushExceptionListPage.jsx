import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PushExceptionActionDialogs } from '../components/erp/PushExceptionActionDialogs.jsx';
import { Button } from '../components/ui/button.jsx';
import { SimpleDialog } from '../components/ui/dialog.jsx';
import {
  getPushExceptionColumns,
  getPushExceptionExportFields,
  getPushExceptionFilterFields,
  pushExceptionDocTypeLabels,
  pushExceptionInitialFilters,
  pushExceptionStageLabels,
  pushExceptionTabItems,
  PUSH_EXCEPTION_STORAGE_KEY,
} from '../lib/pushExceptionLogic.js';
import { financeResultDocTypeLabels } from '../data/financeResultData.js';
import { matchesDateRange } from '../lib/listFilters.js';
import { matchesMultiSelect } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { skuOptions } from '../data/masterData.js';
import {
  canRecoverResultException,
  loadPushExceptionRows,
  recoverResultExceptionMock,
  resolveExceptionProduct,
  resolveExceptionSourceDocument,
} from '../lib/pushExceptionLogic.js';

function includesText(value, input) {
  const keyword = String(input || '').trim().toLowerCase();
  if (!keyword) return false;
  return String(value || '').toLowerCase().includes(keyword);
}

/**
 * 结果处理 Mock 演示链路弹窗（《结果处理规则（二版）》§八 M1/M2；SAL-FR12）。
 * 正式系统本页只读：修复映射、解决阻塞原因后由系统按接口机制自动重试处理原记录；
 * 此弹窗仅演示「匹配失败 → 补映射／解决 → 处理原记录（不重复记账）」的完整链路。
 */
function ResultRecoveryDemoDialog({ row, onClose, onComplete }) {
  const demo = row.demoRecover || {};
  const stageLabel = pushExceptionStageLabels[row.stage] || row.stage || '';
  const isProductMatch = row.stage === 'product_match';
  const sku = demo.product ? skuOptions.find((item) => item.value === demo.product) : null;
  const mappingText = demo.product
    ? `${demo.platformSku ? `${demo.platformSku} → ` : ''}${demo.product}${sku?.productName ? ` ${sku.productName}` : ''}`
    : '-';

  function handleConfirm() {
    const result = recoverResultExceptionMock(row.id);
    if (!result.ok) {
      onComplete?.({ message: result.message, type: 'warning', keepOpen: !result.duplicated });
      return;
    }
    onComplete?.({
      message: `已生成销售出库单 ${result.outboundNo} 并关联${result.orderLabel} ${result.orderNo}；异常记录已置为已处理（不重复记账）`,
      type: 'success',
    });
  }

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      title="演示：修复后处理原记录（Mock）"
      description={`来源单号 ${row.sourceNo || ''}（演示数据，不产生第二张结果单）`}
      footer={(
        <>
          <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
          <Button variant="primary" size="compact" onClick={handleConfirm}>
            {isProductMatch ? '补映射并处理原记录（Mock）' : '解决后处理原记录（Mock）'}
          </Button>
        </>
      )}
    >
      <div className="mt-3 space-y-2 text-[12px] leading-5 text-erp-text">
        <p className="text-erp-text-muted">
          正式系统中本页只读：修复映射或解决阻塞原因后，由系统按接口机制自动重试处理原记录；
          此弹窗仅用于原型演示，成功后异常记录自动置为已处理，重复回传不重复记账。
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>查看待处理记录：异常环节「{stageLabel}」，失败原因「{row.failReason || '-'}」。</li>
          {isProductMatch
            ? <li>补商品映射（Mock）：{mappingText}。</li>
            : <li>核实差异并补足逻辑仓库存（Mock）：{demo.warehouse}，保证不出现负库存。</li>}
          <li>
            处理原记录：生成已审核销售出库单并关联来源{demo.kind === 'crossborder' ? '跨境电商订单' : '国内电商订单'} {demo.orderNo}；
            逻辑仓扣减一次（{demo.quantity} 件）；异常记录自动置为已处理，处理记录新增「修复恢复·成功」。
          </li>
        </ol>
      </div>
    </SimpleDialog>
  );
}

/** 查询条件之间按 AND 匹配；页签值先命中本页签的行，其余条件按各页签适用字段过滤（主PRD R03、R07）。 */
function filterRows(row, filters) {
  if (row.tab !== filters.tab) return false;
  // 处理状态多选（OR），默认「待处理」，未选等同全部（主PRD R07；详细稿第2行备注）
  if (!matchesMultiSelect(row.status, filters.status)) return false;
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

/**
 * 固定列：勾选列＋对象标识列固定左侧（列表页 Demo PRD §4.3；《原型开发说明》「固定列」）。
 * 对象标识列为各页签的可跳转主键：结果单号／单据编号／商品编码；结果处理页签的来源单号无跳转，不固定。
 */
const pinnedKeysByTab = {
  finance: ['docNo'],
  warehouse: ['docNo'],
  platform: ['docNo'],
  masterdata: ['productCode'],
  result: [],
};

/** 对象标识列：处理记录与「去重推」之外的跳转入口（主PRD R06、R09）。 */
function handleCellClick(column, row, { onFeedback, onOpenPage }) {
  if (column.key === 'docNo' && row.docNo) {
    // 推送财务ERP页签的 docType 为七类结果单枚举，与其余页签的九类单据枚举不同源（主PRD §4.2、§4.3）
    const docTypeLabel = row.tab === 'finance'
      ? financeResultDocTypeLabels[row.docType]
      : pushExceptionDocTypeLabels[row.docType];
    const target = resolveExceptionSourceDocument(docTypeLabel, row.docNo);
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
  // 跨页跳转可通过 context.presetFilters.tab 预置页签（如采购收货通知单「推送失败原因」旁的去向入口）。
  const presetTab = pushExceptionTabItems.some((item) => item.value === props.context?.presetFilters?.tab)
    ? props.context.presetFilters.tab
    : 'finance';
  const [activeTab, setActiveTab] = useState(presetTab);
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

  // 行内只有「处理记录」；「推送财务ERP」页签的待处理行另有「去重推」；「结果处理」页签的
  // 演示记录提供 Mock「演示处理」（正式系统本页只读，修复后由系统自动处理原记录）。
  const rowActions = useMemo(() => [
    { id: 'records', label: '处理记录' },
    ...(activeTab === 'finance'
      ? [{ id: 'go-retry', label: '去重推', visibleWhen: (row) => row.status === 'pending' }]
      : []),
    ...(activeTab === 'result'
      ? [{ id: 'demo-recover', label: '演示处理', visibleWhen: canRecoverResultException }]
      : []),
  ], [activeTab]);

  function handleRowAction(id, row) {
    if (id === 'records') setDialog({ type: 'records', row });
    if (id === 'go-retry') props.onOpenPage?.('integration-finance-results', { presetFilters: { docNo: row.docNo } });
    if (id === 'demo-recover') setDialog({ type: 'demo-recover', row });
  }

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.keepOpen) return;
    setDialog(null);
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
    initialPinnedKeys: pinnedKeysByTab[activeTab] || [],
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
      {dialog?.type === 'demo-recover' ? (
        <ResultRecoveryDemoDialog
          row={dialog.row}
          onClose={() => setDialog(null)}
          onComplete={handleDialogComplete}
        />
      ) : null}
    </>
  );
}
