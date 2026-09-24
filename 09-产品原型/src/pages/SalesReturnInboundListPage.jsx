import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { salesReturns } from '../data/salesReturnData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import {
  buildExternalOrderFilterOptions,
  buildProductFilterOptions,
  buildSourceNoticeFilterOptions,
  buildSourceReturnFilterOptions,
  salesReturnInboundColumns,
  salesReturnInbounds,
} from '../data/salesReturnInboundData.js';
import {
  auditStatusLabels,
  kingdeePushStatusLabels,
  RETURN_INBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesReturnInboundLogic.js';

/**
 * 销退入库单列表（F01）：只读结果单，页头仅导出，无新增、无行内业务按钮。
 * 查询区 12 项与列顺序见列表页 Demo PRD §2、§4.2；默认按业务日期倒序。
 */

const initialFilters = {
  inboundNo: '',
  sourceType: [],
  sourceNoticeNo: '',
  sourceReturnNo: '',
  externalOrderNo: '',
  customer: '',
  warehouse: '',
  auditStatus: [],
  kingdeePushStatus: [],
  product: '',
  productCode: '',
  barcode: '',
};

function createFilterFields(rows) {
  return [
    { key: 'inboundNo', label: '单号', type: 'search', placeholder: '请输入销退入库单号' },
    statusMultiSelectField('sourceType', '来源类型', sourceTypeLabels),
    { key: 'sourceNoticeNo', label: '来源销退收货通知单', type: 'select', options: buildSourceNoticeFilterOptions(rows) },
    { key: 'sourceReturnNo', label: '来源销售退货单', type: 'select', options: buildSourceReturnFilterOptions(rows) },
    { key: 'externalOrderNo', label: '外部原始订单', type: 'select', options: buildExternalOrderFilterOptions(rows) },
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...customerOptions] },
    { key: 'warehouse', label: '收货仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...logicalWarehouseOptions] },
    statusMultiSelectField('auditStatus', '审核状态', auditStatusLabels),
    statusMultiSelectField('kingdeePushStatus', '金蝶推送状态', kingdeePushStatusLabels),
    { key: 'product', label: '商品', type: 'select', options: buildProductFilterOptions() },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
  ];
}

const initialVisibility = Object.fromEntries(salesReturnInboundColumns.map((column) => [column.key, true]));
const columnOptions = salesReturnInboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const inboundNo = filters.inboundNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();
  const barcode = filters.barcode.trim().toLowerCase();

  return (!inboundNo || String(row.inboundNo || '').toLowerCase().includes(inboundNo))
    && matchesMultiSelect(row.sourceType || 'notice', filters.sourceType)
    && (!filters.sourceNoticeNo || row.sourceNoticeNo === filters.sourceNoticeNo)
    && (!filters.sourceReturnNo || row.sourceReturnNo === filters.sourceReturnNo)
    && (!filters.externalOrderNo || row.externalOrderNo === filters.externalOrderNo)
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.kingdeePushStatus, filters.kingdeePushStatus)
    && (!filters.product || row.lines?.some((line) => line.product === filters.product))
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'inboundNo') {
    onOpenPage?.('sales-return-inbound-detail', { row });
    return;
  }
  // 路径二无来源通知与来源退货单，空值不跳转（列表页 Demo PRD §4.3）
  if (column.key === 'sourceNoticeNo') {
    if (!row.sourceNoticeNo) return;
    const relatedNotice = salesReturnNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo || notice.id === row.sourceNoticeId);
    onOpenPage?.('sales-return-notice-detail', { row: relatedNotice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId } });
    return;
  }
  if (column.key === 'sourceReturnNo') {
    if (!row.sourceReturnNo) return;
    const relatedReturn = salesReturns.find((item) => item.returnNo === row.sourceReturnNo || item.id === row.sourceReturnId);
    onOpenPage?.('sales-return-detail', { row: relatedReturn || { returnNo: row.sourceReturnNo, id: row.sourceReturnId } });
  }
}

export function SalesReturnInboundListPage(props) {
  const listConfig = useMemo(() => ({
    title: '销退入库单',
    rows: salesReturnInbounds,
    storageKey: RETURN_INBOUND_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: salesReturnInboundColumns,
    columnOptions,
    filterFields: createFilterFields(salesReturnInbounds),
    // 结果单默认按业务日期倒序（主PRD Q01）
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-return-inbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={salesReturnInboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行销退入库单查询',
    onCellClick: handleCellClick,
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
