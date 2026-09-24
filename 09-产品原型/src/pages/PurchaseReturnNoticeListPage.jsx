import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PurchaseReturnNoticeActionDialogs } from '../components/erp/PurchaseReturnNoticeActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import {
  buildSourceReturnFilterOptions,
  purchaseReturnNoticeColumns,
  purchaseReturnNotices,
} from '../data/purchaseReturnNoticeData.js';
import { purchaseReturns } from '../data/purchaseReturnData.js';
import {
  canApplyCancelReturnNotice,
  canCancelReturnNotice,
  canEditReturnNoticeRemark,
  canRetryReturnPush,
  loadReturnNoticeById,
  resolveReturnShipMode,
  returnNoticeStatusLabels,
  returnShipModeLabels,
  RETURN_NOTICE_STORAGE_KEY,
} from '../lib/purchaseReturnNoticeLogic.js';
import { loadReturnById } from '../lib/purchaseReturnLogic.js';

/**
 * 采退发货通知单列表（F01）：页头仅导出，无新增入口；单据状态多选筛选与行内取消/重试。
 * 查询区、列与状态 tone 见列表页 Demo PRD §2、§4；行操作矩阵见 §6.1。
 */

const initialFilters = {
  noticeNo: '',
  sourceReturnNo: '',
  supplier: '',
  warehouse: '',
  shipMode: [],
  status: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

function createFilterFields(rows) {
  return [
    { key: 'noticeNo', label: '单号', type: 'search', placeholder: '请输入采退发货通知单号' },
    { key: 'sourceReturnNo', label: '来源采购退货单', type: 'select', options: buildSourceReturnFilterOptions(rows) },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...getSelectableSupplierOptions()] },
    { key: 'warehouse', label: '出库仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...getSelectableLogicalWarehouseOptions()] },
    statusMultiSelectField('shipMode', '发货处理方式', returnShipModeLabels),
    statusMultiSelectField('status', '单据状态', returnNoticeStatusLabels),
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

const initialVisibility = Object.fromEntries(purchaseReturnNoticeColumns.map((column) => [column.key, true]));
const columnOptions = purchaseReturnNoticeColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const noticeNo = filters.noticeNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!noticeNo || String(row.noticeNo || '').toLowerCase().includes(noticeNo))
    && (!filters.sourceReturnNo || row.sourceReturnNo === filters.sourceReturnNo)
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(resolveReturnShipMode(row), filters.shipMode)
    && matchesMultiSelect(row.status, filters.status)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'noticeNo') {
    onOpenPage?.('purchase-return-notice-detail', { row });
    return;
  }
  if (column.key === 'sourceReturnNo') {
    const relatedReturn = loadReturnById(row.sourceReturnId)
      || purchaseReturns.find((item) => item.returnNo === row.sourceReturnNo);
    onOpenPage?.('purchase-return-detail', {
      row: relatedReturn || { returnNo: row.sourceReturnNo, id: row.sourceReturnId },
    });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadReturnNoticeById(row.id) || row;

    if (id === 'edit') {
      if (!canEditReturnNoticeRemark(latest)) {
        notify('当前状态不可编辑', 'warning');
        return;
      }
      onOpenPage?.('purchase-return-notice-edit', { row: latest });
      return;
    }
    if (id === 'cancel' || id === 'apply-cancel' || id === 'retry') {
      openDialog({ type: id, row: latest });
    }
  };
}

export function PurchaseReturnNoticeListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '采退发货通知单',
    rows: purchaseReturnNotices,
    storageKey: RETURN_NOTICE_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: purchaseReturnNoticeColumns,
    columnOptions,
    filterFields: createFilterFields(purchaseReturnNotices),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('purchase-return-notice')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={purchaseReturnNoticeColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditReturnNoticeRemark(row) },
      { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetryReturnPush(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelReturnNotice(row), variant: 'danger' },
      { id: 'apply-cancel', label: '取消', visibleWhen: (row) => canApplyCancelReturnNotice(row), variant: 'danger' },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行采退发货通知单查询',
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
      <PurchaseReturnNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
