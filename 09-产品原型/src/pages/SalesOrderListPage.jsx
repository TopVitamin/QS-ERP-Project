import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { SalesOrderActionDialogs } from '../components/erp/SalesOrderActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { salesOrders, salesOrderColumns, salesOrderStatusLabels } from '../data/salesOrderData.js';
import {
  canCancelApprovedOrder,
  canCancelPendingOrder,
  canAdjustDeliveryDate,
  canCloseOrder,
  canDeleteDraftOrder,
  canPushDeliveryNotice,
  loadOrderById,
  SALES_ORDER_STORAGE_KEY,
} from '../lib/salesOrderLogic.js';

const initialFilters = {
  dateRange: { from: '', to: '' },
  orderNo: '',
  customer: '',
  warehouse: '',
  auditStatus: [],
  businessStatus: [],
  shipStatus: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

const filterFields = [
  { key: 'orderNo', label: '单号', type: 'search', placeholder: '请输入销售订单号' },
  { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...customerOptions] },
  { key: 'warehouse', label: '发货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...logicalWarehouseOptions] },
  statusMultiSelectField('auditStatus', '审核状态', salesOrderStatusLabels.auditStatus),
  statusMultiSelectField('businessStatus', '业务状态', salesOrderStatusLabels.businessStatus),
  statusMultiSelectField('shipStatus', '发货状态', salesOrderStatusLabels.shipStatus),
  { key: 'dateRange', label: '交期', type: 'date-range', placeholder: '不限' },
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
  { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
];

const initialVisibility = Object.fromEntries(salesOrderColumns.map((column) => [column.key, true]));
const columnOptions = salesOrderColumns.map((column) => ({ key: column.key, label: column.label }));

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
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus)
    && matchesMultiSelect(row.shipStatus, filters.shipStatus)
    && matchDateRange(row.deliveryDate, filters.dateRange)
    && matchDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleHeaderAction(id, { onOpenPage }) {
  if (id === 'create') {
    onOpenPage?.('sales-order-create');
  }
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') onOpenPage?.('sales-order-detail', { row });
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { state, notify, onOpenPage }) {
    const latest = loadOrderById(row.id) || row;

    if (id === 'edit') {
      if (latest.auditStatus !== 'draft' || latest.businessStatus !== 'normal') {
        notify('仅草稿状态可编辑', 'warning');
        return;
      }
      onOpenPage?.('sales-order-edit', { row: latest });
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
      onOpenPage?.('sales-delivery-notice-create', { sourceOrderId: latest.id, row: latest });
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
      notify('销售订单已删除', 'success');
    }
  };
}

const orderListConfig = {
  title: '销售订单',
  rows: salesOrders,
  storageKey: SALES_ORDER_STORAGE_KEY,
  initialFilters,
  filterRows,
  initialVisibility,
  columns: salesOrderColumns,
  columnOptions,
  filterFields,
  defaultSort: { key: 'createdAt', direction: 'desc' },
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('sales-order')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={salesOrderColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
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
    { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteDraftOrder(row), variant: 'danger', confirm: { title: '确认删除此销售订单？', description: '删除后记录将从列表移除。', confirmLabel: '确认删除', confirmVariant: 'danger' } },
    { id: 'approve', label: '审核', visibleWhen: (row) => row.auditStatus === 'pending' && row.businessStatus === 'normal' },
    { id: 'reject', label: '撤回', visibleWhen: (row) => row.auditStatus === 'pending' && row.businessStatus === 'normal' },
    { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelPendingOrder(row) || canCancelApprovedOrder(row) },
    { id: 'notice', label: '下推通知单', visibleWhen: (row) => canPushDeliveryNotice(row) },
    { id: 'close', label: '关闭', visibleWhen: (row) => canCloseOrder(row) },
    { id: 'adjustDate', label: '调整交期', visibleWhen: (row) => canAdjustDeliveryDate(row) },
  ],
  resetMessage: '筛选条件已重置',
  queryMessage: '已执行销售订单查询',
  onHeaderAction: handleHeaderAction,
  onCellClick: handleCellClick,
};

export function SalesOrderListPage(props) {
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
      <SalesOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
