import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { defaultOrderForm, getEditableOrder, purchaseLineEditorOptions } from '../data/purchaseFormData.js';
import { orderStatusLabels } from '../data/orderData.js';
import { formatAmount } from '../lib/format.js';

function getOrderDetail(row) {
  const source = getEditableOrder(row);
  const fallbackLines = row?.id ? [{
    id: `${row.id}-summary-line`,
    product: defaultOrderForm.lines[0].product,
    spec: '列表汇总明细',
    unit: defaultOrderForm.lines[0].unit,
    quantity: 1,
    received: row.inboundStatus === 'completed' ? 1 : 0,
    price: Number(row.amount || 0),
    taxRate: '13',
    remark: '',
  }] : defaultOrderForm.lines;

  return {
    ...source,
    lines: row?.lines?.length ? row.lines : fallbackLines,
  };
}

const orderDetailConfig = {
  listPageId: 'purchase-order',
  editPageId: 'purchase-order-edit',
  infoSectionTitle: '基础信息',
  lineSectionTitle: '采购明细',
  lineVariant: 'order',
  lineEditorOptions: purchaseLineEditorOptions,
  getDetail: getOrderDetail,
  title: (detail) => `采购订单详情${detail.orderNo && detail.orderNo !== '保存后自动生成' ? ` · ${detail.orderNo}` : ''}`,
  getStatus: (row, detail) => orderStatusLabels.auditStatus[row.auditStatus] || detail.status,
  canEdit: (row) => row.closeStatus !== 'closed',
  rowKey: (detail) => detail.orderNo,
  infoFields: ({ detail, status }) => [
    { key: 'orderNo', label: '单据编号', value: detail.orderNo },
    { key: 'date', label: '单据日期', value: detail.date },
    { key: 'mode', label: '采购模式', value: detail.mode },
    { key: 'supplier', label: '供应商', value: detail.supplier },
    { key: 'settleSupplier', label: '结算供应商', value: detail.settleSupplier },
    { key: 'settlePeriod', label: '结算期限', value: detail.settlePeriod },
    { key: 'salesman', label: '业务员', value: detail.salesman },
    { key: 'department', label: '部门', value: detail.department },
    { key: 'deliveryDate', label: '预计交货日期', value: detail.deliveryDate },
    { key: 'creator', label: '制单人', value: '当前用户' },
    { key: 'status', label: '审核状态', value: status },
    { key: 'remark', label: '备注', value: detail.remark, className: 'col-span-3' },
  ],
  statusSectionTitle: '状态与金额',
  statusFields: ({ row, totalAmount }) => [
    { key: 'executionStatus', label: '执行状态', value: orderStatusLabels.executionStatus[row.executionStatus] || '未执行' },
    { key: 'inboundStatus', label: '入库状态', value: orderStatusLabels.inboundStatus[row.inboundStatus] || '未入库' },
    { key: 'closeStatus', label: '关闭状态', value: orderStatusLabels.closeStatus[row.closeStatus] || '未关闭' },
    { key: 'paymentStatus', label: '付款状态', value: orderStatusLabels.paymentStatus[row.paymentStatus] || '未核销' },
    { key: 'amount', label: '成交金额', value: `¥ ${formatAmount(totalAmount)}` },
    { key: 'executedAmount', label: '已执行金额', value: `¥ ${formatAmount(row.executedAmount)}` },
  ],
  summary: { quantityLabel: '采购数量', amountLabel: '含税金额' },
};

export function PurchaseOrderDetailPage(props) {
  return <DocumentDetailPage {...props} config={orderDetailConfig} />;
}
