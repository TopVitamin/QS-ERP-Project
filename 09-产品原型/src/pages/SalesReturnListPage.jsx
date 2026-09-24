import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { SalesReturnActionDialogs } from '../components/erp/SalesReturnActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import {
  buildSourceOutboundFilterOptions,
  salesReturnColumns,
  salesReturns,
  salesReturnStatusLabels,
} from '../data/salesReturnData.js';
import {
  canAdjustReturnDeadline,
  canApproveSalesReturn,
  canCancelApprovedSalesReturn,
  canCancelPendingSalesReturn,
  canCloseSalesReturn,
  canDeleteDraftSalesReturn,
  canEditSalesReturn,
  canPushReturnNotice,
  canSubmitSalesReturn,
  canWithdrawSalesReturn,
  getSalesReturnCancelBlockReason,
  loadSalesReturnById,
  SALES_RETURN_STORAGE_KEY,
} from '../lib/salesReturnLogic.js';

const initialFilters = {
  returnNo: '',
  customer: '',
  warehouse: '',
  sourceOutboundNo: '',
  auditStatus: [],
  businessStatus: [],
  deadlineRange: { from: '', to: '' },
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

function createFilterFields(rows) {
  return [
    { key: 'returnNo', label: '单号', type: 'search', placeholder: '请输入销售退货单号' },
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...customerOptions] },
    { key: 'warehouse', label: '收货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...logicalWarehouseOptions] },
    { key: 'sourceOutboundNo', label: '来源销售出库单', type: 'select', options: buildSourceOutboundFilterOptions(rows) },
    statusMultiSelectField('auditStatus', '审核状态', salesReturnStatusLabels.auditStatus),
    statusMultiSelectField('businessStatus', '业务状态', salesReturnStatusLabels.businessStatus),
    { key: 'deadlineRange', label: '退货截止日期', type: 'date-range', placeholder: '不限' },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

const initialVisibility = Object.fromEntries(salesReturnColumns.map((column) => [column.key, true]));
const columnOptions = salesReturnColumns.map((column) => ({ key: column.key, label: column.label }));

function matchDateRange(value, range) {
  const day = String(value || '').slice(0, 10);
  if (!day) return true;
  if (range?.from && day < range.from) return false;
  if (range?.to && day > range.to) return false;
  return true;
}

function filterRows(row, filters) {
  const returnNo = filters.returnNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!returnNo || String(row.returnNo || '').toLowerCase().includes(returnNo))
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && (!filters.sourceOutboundNo || row.sourceOutboundNo === filters.sourceOutboundNo)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus)
    && matchDateRange(row.returnDeadline, filters.deadlineRange)
    && matchDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleHeaderAction(id, { onOpenPage }) {
  if (id === 'create') onOpenPage?.('sales-return-create');
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'returnNo') {
    onOpenPage?.('sales-return-detail', { row });
    return;
  }
  if (column.key === 'sourceOutboundNo') {
    if (!row.sourceOutboundNo) return;
    const relatedOutbound = salesOutbounds.find((outbound) => outbound.outboundNo === row.sourceOutboundNo || outbound.id === row.sourceOutboundId);
    onOpenPage?.('sales-outbound-detail', { row: relatedOutbound || { outboundNo: row.sourceOutboundNo, id: row.sourceOutboundId } });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadSalesReturnById(row.id) || row;

    if (id === 'edit') {
      if (!canEditSalesReturn(latest)) {
        notify('仅草稿状态可编辑', 'warning');
        return;
      }
      onOpenPage?.('sales-return-edit', { row: latest });
      return;
    }
    if (id === 'notice') {
      onOpenPage?.('sales-return-notice-create', { sourceReturnId: latest.id, row: latest });
      return;
    }
    if (id === 'cancel') {
      const blockReason = getSalesReturnCancelBlockReason(latest, salesReturnNotices);
      if (blockReason) {
        notify(blockReason, 'warning');
        return;
      }
      openDialog({ type: 'cancel', row: latest });
      return;
    }
    if (id === 'submit' || id === 'approve' || id === 'withdraw' || id === 'close' || id === 'adjustDeadline' || id === 'delete') {
      openDialog({ type: id, row: latest });
    }
  };
}

export function SalesReturnListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '销售退货单',
    rows: salesReturns,
    storageKey: SALES_RETURN_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: salesReturnColumns,
    columnOptions,
    filterFields: createFilterFields(salesReturns),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-return')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={salesReturnColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditSalesReturn(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitSalesReturn(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canEditSalesReturn(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApproveSalesReturn(row) },
      { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawSalesReturn(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelPendingSalesReturn(row) || canCancelApprovedSalesReturn(row, salesReturnNotices), variant: 'danger' },
      { id: 'notice', label: '下推通知单', visibleWhen: (row) => canPushReturnNotice(row) },
      { id: 'close', label: '关闭', visibleWhen: (row) => canCloseSalesReturn(row) },
      { id: 'adjustDeadline', label: '调整截止时间', visibleWhen: (row) => canAdjustReturnDeadline(row) },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行销售退货单查询',
    onHeaderAction: handleHeaderAction,
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      return;
    }
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <SalesReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
