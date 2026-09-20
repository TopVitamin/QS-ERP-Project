import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { supplierOptions, warehouseOptions } from '../data/masterData.js';
import { orders } from '../data/orderData.js';
import { receiptNotices } from '../data/receiptNoticeData.js';
import {
  buildSourceNoticeFilterOptions,
  buildSourceOrderFilterOptions,
  inboundColumns,
  inboundOrders,
} from '../data/inboundData.js';
import {
  auditStatusLabels,
  INBOUND_STORAGE_KEY,
  kingdeePushStatusLabels,
} from '../lib/inboundLogic.js';

const initialFilters = {
  inboundNo: '',
  sourceNoticeNo: '',
  sourceOrderNo: '',
  supplier: '',
  warehouse: '',
  auditStatus: [],
  kingdeePushStatus: [],
  productCode: '',
  barcode: '',
};

function createFilterFields(rows) {
  return [
    { key: 'inboundNo', label: '单号', type: 'search', placeholder: '请输入采购入库单号' },
    { key: 'sourceNoticeNo', label: '来源采购收货通知单', type: 'select', options: buildSourceNoticeFilterOptions(rows) },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'select', options: buildSourceOrderFilterOptions(rows) },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...supplierOptions] },
    statusMultiSelectField('auditStatus', '审核状态', auditStatusLabels),
    statusMultiSelectField('kingdeePushStatus', '金蝶推送状态', kingdeePushStatusLabels),
    { key: 'warehouse', label: '入库仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...warehouseOptions] },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
  ];
}

const initialVisibility = Object.fromEntries(inboundColumns.map((column) => [column.key, true]));
const columnOptions = inboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const inboundNo = filters.inboundNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!inboundNo || String(row.inboundNo || '').toLowerCase().includes(inboundNo))
    && (!filters.sourceNoticeNo || row.sourceNoticeNo === filters.sourceNoticeNo)
    && (!filters.sourceOrderNo || row.sourceOrderNo === filters.sourceOrderNo)
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.kingdeePushStatus, filters.kingdeePushStatus)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'inboundNo') {
    onOpenPage?.('purchase-inbound-detail', { row });
    return;
  }
  if (column.key === 'sourceNoticeNo') {
    const relatedNotice = receiptNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo || notice.id === row.sourceNoticeId);
    onOpenPage?.('purchase-receipt-notice-detail', { row: relatedNotice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId } });
    return;
  }
  if (column.key === 'sourceOrderNo') {
    const relatedOrder = orders.find((order) => order.orderNo === row.sourceOrderNo || order.id === row.sourceOrderId);
    onOpenPage?.('purchase-order-detail', { row: relatedOrder || { orderNo: row.sourceOrderNo, id: row.sourceOrderId } });
  }
}

export function PurchaseInboundListPage(props) {
  const listConfig = useMemo(() => ({
    title: '采购入库单',
    rows: inboundOrders,
    storageKey: INBOUND_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: inboundColumns,
    columnOptions,
    filterFields: createFilterFields(inboundOrders),
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('purchase-inbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={inboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行采购入库单查询',
    onCellClick: handleCellClick,
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
