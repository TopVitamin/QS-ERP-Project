import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import {
  purchaseReturnOutboundColumns,
  purchaseReturnOutbounds,
} from '../data/purchaseReturnOutboundData.js';
import { purchaseReturnNotices } from '../data/purchaseReturnNoticeData.js';
import { purchaseReturns } from '../data/purchaseReturnData.js';
import {
  auditStatusLabels,
  kingdeePushStatusLabels,
  RETURN_OUTBOUND_STORAGE_KEY,
} from '../lib/purchaseReturnOutboundLogic.js';
import { loadReturnNoticeById } from '../lib/purchaseReturnNoticeLogic.js';
import { loadReturnById } from '../lib/purchaseReturnLogic.js';

/**
 * 采退出库单列表（F01）：只读结果单，页头仅导出，无新增、无行内业务按钮。
 * 默认按业务日期倒序（业务日期不列表展示）；查询区与列见骨架、列表页 Demo PRD §2、§4。
 */

const initialFilters = {
  outboundNo: '',
  sourceNoticeNo: '',
  sourceReturnNo: '',
  supplier: '',
  auditStatus: [],
  kingdeePushStatus: [],
  warehouse: '',
  product: '',
};

function createFilterFields(rows) {
  const noticeOptions = new Map();
  const returnOptions = new Map();
  rows.forEach((row) => {
    if (row.sourceNoticeNo) noticeOptions.set(row.sourceNoticeNo, { value: row.sourceNoticeNo, label: row.sourceNoticeNo });
    if (row.sourceReturnNo) returnOptions.set(row.sourceReturnNo, { value: row.sourceReturnNo, label: row.sourceReturnNo });
  });

  return [
    { key: 'outboundNo', label: '单号', type: 'search', placeholder: '请输入采退出库单号' },
    { key: 'sourceNoticeNo', label: '来源采退发货通知单', type: 'select', options: [{ value: '', label: '全部' }, ...noticeOptions.values()] },
    { key: 'sourceReturnNo', label: '来源采购退货单', type: 'select', options: [{ value: '', label: '全部' }, ...returnOptions.values()] },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...getSelectableSupplierOptions()] },
    statusMultiSelectField('auditStatus', '审核状态', auditStatusLabels),
    statusMultiSelectField('kingdeePushStatus', '金蝶推送状态', kingdeePushStatusLabels),
    { key: 'warehouse', label: '出库仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...getSelectableLogicalWarehouseOptions()] },
    { key: 'product', label: '商品', type: 'search', placeholder: '请输入商品编码' },
  ];
}

const initialVisibility = Object.fromEntries(purchaseReturnOutboundColumns.map((column) => [column.key, true]));
const columnOptions = purchaseReturnOutboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const outboundNo = filters.outboundNo.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  return (!outboundNo || String(row.outboundNo || '').toLowerCase().includes(outboundNo))
    && (!filters.sourceNoticeNo || row.sourceNoticeNo === filters.sourceNoticeNo)
    && (!filters.sourceReturnNo || row.sourceReturnNo === filters.sourceReturnNo)
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.kingdeePushStatus, filters.kingdeePushStatus)
    && (!product || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(product)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'outboundNo') {
    onOpenPage?.('purchase-return-outbound-detail', { row });
    return;
  }
  if (column.key === 'sourceNoticeNo') {
    const relatedNotice = loadReturnNoticeById(row.sourceNoticeId)
      || purchaseReturnNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo);
    onOpenPage?.('purchase-return-notice-detail', {
      row: relatedNotice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId },
    });
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

export function PurchaseReturnOutboundListPage(props) {
  const listConfig = useMemo(() => ({
    title: '采退出库单',
    rows: purchaseReturnOutbounds,
    storageKey: RETURN_OUTBOUND_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: purchaseReturnOutboundColumns,
    columnOptions,
    filterFields: createFilterFields(purchaseReturnOutbounds),
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('purchase-return-outbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={purchaseReturnOutboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行采退出库单查询',
    onCellClick: handleCellClick,
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
