import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { TransferInNoticeActionDialogs } from '../components/erp/TransferInNoticeActionDialogs.jsx';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { transferInNoticeColumns, transferInNotices } from '../data/transferInNoticeData.js';
import { transferOrders } from '../data/transferOrderData.js';
import {
  canRetryPush,
  loadTransferInNoticeById,
  TRANSFER_IN_NOTICE_STORAGE_KEY,
  transferInNoticeStatusLabels,
} from '../lib/transferInNoticeLogic.js';
import { loadTransferOrderById } from '../lib/transferOrderLogic.js';

/**
 * 调入通知单列表（F01）：无新增入口，页头仅导出；行内仅推送失败提供重试推送，不提供取消。
 * 查询区与列见《列表页 Demo PRD》§2、§4；默认按创建时间倒序。
 */

const initialFilters = {
  noticeNo: '',
  sourceOrderNo: '',
  inWarehouse: '',
  status: [],
  product: '',
  createdAtRange: { from: '', to: '' },
};

const filterFields = [
  { key: 'noticeNo', label: '单号', type: 'search', placeholder: '请输入调入通知单号' },
  { key: 'sourceOrderNo', label: '来源分步式调拨单', type: 'search', placeholder: '请输入来源分步式调拨单号' },
  {
    key: 'inWarehouse',
    label: '接收仓',
    type: 'searchable-select',
    placeholder: '全部',
    options: getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false }),
  },
  statusMultiSelectField('status', '单据状态', transferInNoticeStatusLabels),
  { key: 'product', label: '商品', type: 'search', placeholder: '请输入商品编码' },
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
];

const initialVisibility = Object.fromEntries(transferInNoticeColumns.map((column) => [column.key, true]));
const columnOptions = transferInNoticeColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const noticeNo = filters.noticeNo.trim().toLowerCase();
  const sourceOrderNo = filters.sourceOrderNo.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  return (!noticeNo || String(row.noticeNo || '').toLowerCase().includes(noticeNo))
    && (!sourceOrderNo || String(row.sourceOrderNo || '').toLowerCase().includes(sourceOrderNo))
    && (!filters.inWarehouse || row.inWarehouse === filters.inWarehouse)
    && matchesMultiSelect(row.status, filters.status)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!product || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(product)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'noticeNo') {
    onOpenPage?.('inventory-transfer-in-notice-detail', { row });
    return;
  }
  if (column.key === 'sourceOrderNo') {
    const order = loadTransferOrderById(row.sourceOrderId)
      || transferOrders.find((item) => item.orderNo === row.sourceOrderNo);
    onOpenPage?.('inventory-transfer-order-detail', {
      row: order || { orderNo: row.sourceOrderNo, id: row.sourceOrderId },
    });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify }) {
    const latest = loadTransferInNoticeById(row.id) || row;
    if (id !== 'retry') return;
    if (!canRetryPush(latest)) {
      notify('操作失败，单据状态已变更，请刷新后重试', 'warning');
      return;
    }
    openDialog({ type: 'retry', row: latest });
  };
}

export function TransferInNoticeListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '调入通知单',
    rows: transferInNotices,
    storageKey: TRANSFER_IN_NOTICE_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['noticeNo'],
    filterRows,
    initialVisibility,
    columns: transferInNoticeColumns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('transfer-in-notice')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={transferInNoticeColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetryPush(row) },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行调入通知单查询',
    emptyText: '暂无调入通知单',
    emptyTextFiltered: '该条件下暂无调入通知单，可调整查询条件后重试',
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
      <TransferInNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
