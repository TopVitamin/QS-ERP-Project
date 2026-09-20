import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PurchaseOrderActionDialogs } from '../components/erp/PurchaseOrderActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { supplierOptions, warehouseOptions } from '../data/masterData.js';
import { orders, orderStatusLabels, tableColumns } from '../data/orderData.js';
import {
  canCancelApprovedOrder,
  canCancelPendingOrder,
  canAdjustDeliveryDate,
  canCloseOrder,
  canDeleteDraftOrder,
  canPushNotice,
  loadOrderById,
  ORDER_STORAGE_KEY,
} from '../lib/purchaseOrderLogic.js';

const initialFilters = {
  dateRange: { from: '', to: '' },
  orderNo: '',
  supplier: '',
  warehouse: '',
  auditStatus: [],
  businessStatus: [],
  receiveStatus: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

const filterFields = [
  { key: 'dateRange', label: '单据日期', type: 'date-range', placeholder: '不限' },
  { key: 'orderNo', label: '单号', type: 'search', placeholder: '请输入采购订单号' },
  { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...supplierOptions] },
  { key: 'warehouse', label: '收货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...warehouseOptions] },
  statusMultiSelectField('auditStatus', '审核状态', orderStatusLabels.auditStatus),
  statusMultiSelectField('businessStatus', '业务状态', orderStatusLabels.businessStatus),
  statusMultiSelectField('receiveStatus', '收货状态', orderStatusLabels.receiveStatus),
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
  { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
];

const initialVisibility = Object.fromEntries(tableColumns.map((column) => [column.key, true]));
const columnOptions = tableColumns.map((column) => ({ key: column.key, label: column.label }));

function matchDateRange(value, range) {
  const day = String(value || '').slice(0, 10);
  if (!day) return true;
  if (range?.from && day < range.from) return false;
  if (range?.to && day > range.to) return false;
  return true;
}

function filterRows(row, filters) {
  const orderNo = filters.orderNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!orderNo || String(row.orderNo || '').toLowerCase().includes(orderNo))
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus)
    && matchesMultiSelect(row.receiveStatus, filters.receiveStatus)
    && matchDateRange(row.date, filters.dateRange)
    && matchDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleHeaderAction(id, { notify, onOpenPage }) {
  if (id === 'create') {
    onOpenPage?.('purchase-order-create');
    return;
  }
  notify(id, 'info');
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') onOpenPage?.('purchase-order-detail', { row });
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { state, notify, onOpenPage }) {
    const latest = loadOrderById(row.id) || row;

    if (id === 'edit') {
      if (latest.auditStatus !== 'draft' || latest.businessStatus !== 'normal') {
        notify('仅草稿状态可编辑', 'warning');
        return;
      }
      onOpenPage?.('purchase-order-edit', { row: latest });
      return;
    }
    if (id === 'submit') {
      openDialog({ type: 'submit', row: latest });
      return;
    }
    if (id === 'approve') {
      openDialog({ type: 'approve', row: latest });
      return;
    }
    if (id === 'reject') {
      openDialog({ type: 'reject', row: latest });
      return;
    }
    if (id === 'notice') {
      onOpenPage?.('purchase-receipt-notice-create', { sourceOrderId: latest.id, row: latest });
      return;
    }
    if (id === 'adjustDate') {
      openDialog({ type: 'adjustDate', row: latest });
      return;
    }
    if (id === 'close') {
      openDialog({ type: 'close', row: latest });
      return;
    }
    if (id === 'cancel') {
      openDialog({ type: 'cancel', row: latest });
      return;
    }
    if (id === 'delete') {
      if (latest.auditStatus !== 'draft' || latest.businessStatus !== 'normal') {
        notify('仅草稿状态可删除', 'warning');
        return;
      }
      state.removeRows([latest.id]);
      notify('采购订单已删除', 'success');
    }
  };
}

const orderListConfig = {
  title: '采购订单',
  rows: orders,
  storageKey: ORDER_STORAGE_KEY,
  initialFilters,
  filterRows,
  initialVisibility,
  columns: tableColumns,
  columnOptions,
  filterFields,
  defaultSort: { key: 'createdAt', direction: 'desc' },
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('purchase-order')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={tableColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={ctx.notify}
          onOpenPage={ctx.onOpenPage}
        />
      ),
    },
  ],
  toolbarActions: [],
  rowActionsMaxVisible: 3,
  rowActions: [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canDeleteDraftOrder(row) },
    { id: 'submit', label: '提交', visibleWhen: (row) => canDeleteDraftOrder(row) },
    { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteDraftOrder(row), variant: 'danger', confirm: { title: '确认删除此采购订单？', description: '删除后记录将从列表移除。', confirmLabel: '确认删除', confirmVariant: 'danger' } },
    { id: 'approve', label: '审核', visibleWhen: (row) => row.auditStatus === 'pending' && row.businessStatus === 'normal' },
    { id: 'reject', label: '撤回', visibleWhen: (row) => row.auditStatus === 'pending' && row.businessStatus === 'normal' },
    { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelPendingOrder(row) || canCancelApprovedOrder(row) },
    { id: 'notice', label: '下推通知单', visibleWhen: (row) => canPushNotice(row) },
    { id: 'close', label: '关闭', visibleWhen: (row) => canCloseOrder(row) },
    { id: 'adjustDate', label: '调整交期', visibleWhen: (row) => canAdjustDeliveryDate(row) },
  ],
  resetMessage: '筛选条件已重置',
  queryMessage: '已执行采购订单查询',
  onHeaderAction: handleHeaderAction,
  onCellClick: handleCellClick,
};

export function PurchaseOrderListPage(props) {
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      return;
    }
    setDialog(null);
  }

  const config = {
    ...orderListConfig,
    onRowAction: createRowActionHandler(setDialog),
  };

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <PurchaseOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
