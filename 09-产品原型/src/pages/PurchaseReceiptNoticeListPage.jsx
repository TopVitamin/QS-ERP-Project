import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PurchaseReceiptNoticeActionDialogs } from '../components/erp/PurchaseReceiptNoticeActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { supplierOptions, warehouseOptions } from '../data/masterData.js';
import { orders } from '../data/orderData.js';
import {
  buildSourceOrderFilterOptions,
  receiptNoticeColumns,
  receiptNotices,
} from '../data/receiptNoticeData.js';
import {
  canApplyCancelNotice,
  canCancelNotice,
  canEditRemark,
  canRetryPush,
  loadNoticeById,
  NOTICE_STORAGE_KEY,
  noticeStatusLabels,
  receiptModeLabels,
  resolveReceiptMode,
} from '../lib/receiptNoticeLogic.js';

const initialFilters = {
  noticeNo: '',
  sourceOrderNo: '',
  supplier: '',
  warehouse: '',
  receiptMode: [],
  status: [],
  createdAtRange: { from: '', to: '' },
  productCode: '',
  barcode: '',
};

function matchDateRange(value, range) {
  const day = String(value || '').slice(0, 10);
  if (!day) return true;
  if (range?.from && day < range.from) return false;
  if (range?.to && day > range.to) return false;
  return true;
}

function createFilterFields(rows) {
  return [
    { key: 'noticeNo', label: '单号', type: 'search', placeholder: '请输入采购收货通知单号' },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'select', options: buildSourceOrderFilterOptions(rows) },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...supplierOptions] },
    { key: 'warehouse', label: '收货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...warehouseOptions] },
    statusMultiSelectField('receiptMode', '收货处理方式', receiptModeLabels),
    statusMultiSelectField('status', '单据状态', noticeStatusLabels),
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

const initialVisibility = Object.fromEntries(receiptNoticeColumns.map((column) => [column.key, true]));
const columnOptions = receiptNoticeColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const noticeNo = filters.noticeNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!noticeNo || String(row.noticeNo || '').toLowerCase().includes(noticeNo))
    && (!filters.sourceOrderNo || row.sourceOrderNo === filters.sourceOrderNo)
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(resolveReceiptMode(row), filters.receiptMode)
    && matchesMultiSelect(row.status, filters.status)
    && matchDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'noticeNo') {
    onOpenPage?.('purchase-receipt-notice-detail', { row });
    return;
  }
  if (column.key === 'sourceOrderNo') {
    const relatedOrder = orders.find((order) => order.orderNo === row.sourceOrderNo || order.id === row.sourceOrderId);
    onOpenPage?.('purchase-order-detail', { row: relatedOrder || { orderNo: row.sourceOrderNo, id: row.sourceOrderId } });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadNoticeById(row.id) || row;

    if (id === 'edit') {
      if (!canEditRemark(latest)) {
        notify('当前状态不可编辑', 'warning');
        return;
      }
      onOpenPage?.('purchase-receipt-notice-edit', { row: latest });
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

export function PurchaseReceiptNoticeListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '采购收货通知单',
    rows: receiptNotices,
    storageKey: NOTICE_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: receiptNoticeColumns,
    columnOptions,
    filterFields: createFilterFields(receiptNotices),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('purchase-receipt-notice')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={receiptNoticeColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditRemark(row) },
      { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetryPush(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelNotice(row) },
      { id: 'apply-cancel', label: '取消', visibleWhen: (row) => canApplyCancelNotice(row) },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行采购收货通知单查询',
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
      <PurchaseReceiptNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
