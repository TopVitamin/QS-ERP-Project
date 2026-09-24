import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { SalesReturnNoticeActionDialogs } from '../components/erp/SalesReturnNoticeActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import {
  buildSourceReturnFilterOptions,
  salesReturnNoticeColumns,
  salesReturnNotices,
} from '../data/salesReturnNoticeData.js';
import { salesReturns } from '../data/salesReturnData.js';
import {
  canApplyCancelSalesReturnNotice,
  canCancelSalesReturnNotice,
  canEditSalesReturnNoticeRemark,
  canRetrySalesReturnPush,
  loadSalesReturnNoticeById,
  resolveReturnReceiveMode,
  RETURN_NOTICE_STORAGE_KEY,
  returnNoticeStatusLabels,
  returnReceiveModeLabels,
} from '../lib/salesReturnNoticeLogic.js';

const initialFilters = {
  noticeNo: '',
  sourceReturnNo: '',
  customer: '',
  warehouse: '',
  receiveMode: [],
  status: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

function createFilterFields(rows) {
  return [
    { key: 'noticeNo', label: '单号', type: 'search', placeholder: '请输入销退收货通知单号' },
    { key: 'sourceReturnNo', label: '来源销售退货单', type: 'select', options: buildSourceReturnFilterOptions(rows) },
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...customerOptions] },
    { key: 'warehouse', label: '收货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...logicalWarehouseOptions] },
    statusMultiSelectField('receiveMode', '收货处理方式', returnReceiveModeLabels),
    statusMultiSelectField('status', '单据状态', returnNoticeStatusLabels),
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

const initialVisibility = Object.fromEntries(salesReturnNoticeColumns.map((column) => [column.key, true]));
const columnOptions = salesReturnNoticeColumns.map((column) => ({ key: column.key, label: column.label }));

function matchDateRange(value, range) {
  const day = String(value || '').slice(0, 10);
  if (!day) return true;
  if (range?.from && day < range.from) return false;
  if (range?.to && day > range.to) return false;
  return true;
}

function filterRows(row, filters) {
  const noticeNo = filters.noticeNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!noticeNo || String(row.noticeNo || '').toLowerCase().includes(noticeNo))
    && (!filters.sourceReturnNo || row.sourceReturnNo === filters.sourceReturnNo)
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(resolveReturnReceiveMode(row), filters.receiveMode)
    && matchesMultiSelect(row.status, filters.status)
    && matchDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'noticeNo') {
    onOpenPage?.('sales-return-notice-detail', { row });
    return;
  }
  if (column.key === 'sourceReturnNo') {
    const relatedReturn = salesReturns.find((item) => item.returnNo === row.sourceReturnNo || item.id === row.sourceReturnId);
    onOpenPage?.('sales-return-detail', { row: relatedReturn || { returnNo: row.sourceReturnNo, id: row.sourceReturnId } });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadSalesReturnNoticeById(row.id) || row;

    if (id === 'edit') {
      if (!canEditSalesReturnNoticeRemark(latest)) {
        notify('当前状态不可编辑', 'warning');
        return;
      }
      onOpenPage?.('sales-return-notice-edit', { row: latest });
      return;
    }
    if (id === 'cancel') {
      openDialog({ type: 'cancel', row: latest });
      return;
    }
    if (id === 'apply-cancel') {
      openDialog({ type: 'apply-cancel', row: latest });
      return;
    }
    if (id === 'retry') {
      openDialog({ type: 'retry', row: latest });
    }
  };
}

export function SalesReturnNoticeListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '销退收货通知单',
    rows: salesReturnNotices,
    storageKey: RETURN_NOTICE_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: salesReturnNoticeColumns,
    columnOptions,
    filterFields: createFilterFields(salesReturnNotices),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-return-notice')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={salesReturnNoticeColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditSalesReturnNoticeRemark(row) },
      { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetrySalesReturnPush(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelSalesReturnNotice(row), variant: 'danger' },
      { id: 'apply-cancel', label: '取消', visibleWhen: (row) => canApplyCancelSalesReturnNotice(row), variant: 'danger' },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行销退收货通知单查询',
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <SalesReturnNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
