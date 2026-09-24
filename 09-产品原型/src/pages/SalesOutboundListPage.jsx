import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { customerOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { normalizeSalesRows } from '../lib/documentNameSnapshots.js';
import { salesOrders } from '../data/salesOrderData.js';
import { salesDeliveryNotices } from '../data/salesDeliveryNoticeData.js';
import {
  buildSourceNoticeFilterOptions,
  buildSourceSalesOrderFilterOptions,
  salesOutboundColumns,
  salesOutbounds,
} from '../data/salesOutboundData.js';
import {
  auditStatusLabels,
  financeErpPushStatusLabels,
  SALES_OUTBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesOutboundLogic.js';

const initialFilters = {
  outboundNo: '',
  sourceNoticeNo: '',
  sourceOrderNo: '',
  externalOrderNo: '',
  sourceType: [],
  customer: '',
  warehouse: '',
  auditStatus: [],
  financeErpPushStatus: [],
  productCode: '',
  barcode: '',
};

function createFilterFields(rows) {
  return [
    { key: 'outboundNo', label: '单号', type: 'search', placeholder: '请输入销售出库单号' },
    { key: 'sourceNoticeNo', label: '来源销售发货通知单', type: 'select', options: buildSourceNoticeFilterOptions(rows) },
    { key: 'sourceOrderNo', label: '来源销售订单', type: 'select', options: buildSourceSalesOrderFilterOptions(rows) },
    { key: 'externalOrderNo', label: '外部原始订单', type: 'search', placeholder: '请输入外部原始订单号' },
    statusMultiSelectField('sourceType', '来源类型', sourceTypeLabels),
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...customerOptions] },
    statusMultiSelectField('auditStatus', '审核状态', auditStatusLabels),
    statusMultiSelectField('financeErpPushStatus', '推送财务ERP状态', financeErpPushStatusLabels),
    { key: 'warehouse', label: '出库仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...getInventoryLogicalWarehouseOptions()] },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
  ];
}

const initialVisibility = Object.fromEntries(salesOutboundColumns.map((column) => [column.key, true]));
const columnOptions = salesOutboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const outboundNo = filters.outboundNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();
  const externalOrderNo = filters.externalOrderNo.trim().toLowerCase();

  return (!outboundNo || String(row.outboundNo || '').toLowerCase().includes(outboundNo))
    && (!filters.sourceNoticeNo || row.sourceNoticeNo === filters.sourceNoticeNo)
    && (!filters.sourceOrderNo || row.sourceOrderNo === filters.sourceOrderNo)
    && (!externalOrderNo || String(row.externalOrderNo || '').toLowerCase().includes(externalOrderNo))
    && matchesMultiSelect(row.sourceType, filters.sourceType)
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.financeErpPushStatus, filters.financeErpPushStatus)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'outboundNo') {
    onOpenPage?.('sales-outbound-detail', { row });
    return;
  }
  if (column.key === 'sourceNoticeNo') {
    if (row.sourceType !== 'b2b_notice') return;
    const relatedNotice = salesDeliveryNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo || notice.id === row.sourceNoticeId);
    onOpenPage?.('sales-delivery-notice-detail', { row: relatedNotice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId } });
    return;
  }
  if (column.key === 'sourceOrderNo') {
    if (row.sourceType !== 'b2b_notice') return;
    const relatedOrder = salesOrders.find((order) => order.orderNo === row.sourceOrderNo || order.id === row.sourceOrderId);
    onOpenPage?.('sales-order-detail', { row: relatedOrder || { orderNo: row.sourceOrderNo, id: row.sourceOrderId } });
  }
}

export function SalesOutboundListPage(props) {
  const listConfig = useMemo(() => ({
    title: '销售出库单',
    rows: salesOutbounds,
    storageKey: SALES_OUTBOUND_STORAGE_KEY,
    normalizeRows: normalizeSalesRows,
    mergeSeedRows: true,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: salesOutboundColumns,
    columnOptions,
    filterFields: createFilterFields(salesOutbounds),
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-outbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={salesOutboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行销售出库单查询',
    onCellClick: handleCellClick,
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
