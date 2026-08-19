import { useMemo } from 'react';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { DocumentSummaryBar } from '../components/erp/DocumentSummaryBar.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { defaultOrderForm, getEditableOrder } from '../data/purchaseFormData.js';
import { orderStatusLabels } from '../data/orderData.js';
import { formatAmount } from '../lib/format.js';
import { erpFieldGridClassName } from '../styles/typography.js';

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

export function PurchaseOrderDetailPage({ context, onOpenPage }) {
  const row = context?.row || {};
  const detail = useMemo(() => getOrderDetail(row), [row]);
  const totalQuantity = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalAmount = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const status = orderStatusLabels.auditStatus[row.auditStatus] || detail.status;

  return (
    <DocumentDetailFrame
      title={`采购订单详情${detail.orderNo && detail.orderNo !== '保存后自动生成' ? ` · ${detail.orderNo}` : ''}`}
      status={status}
      onBack={() => onOpenPage?.('purchase-order')}
      onEdit={row.closeStatus !== 'closed' ? () => onOpenPage?.('purchase-order-edit', { row }) : undefined}
    >
      <EditorCard title="基础信息">
        <div className={erpFieldGridClassName}>
          <DetailField label="单据编号" value={detail.orderNo} />
          <DetailField label="单据日期" value={detail.date} />
          <DetailField label="采购模式" value={detail.mode} />
          <DetailField label="供应商" value={detail.supplier} />
          <DetailField label="结算供应商" value={detail.settleSupplier} />
          <DetailField label="结算期限" value={detail.settlePeriod} />
          <DetailField label="业务员" value={detail.salesman} />
          <DetailField label="部门" value={detail.department} />
          <DetailField label="预计交货日期" value={detail.deliveryDate} />
          <DetailField label="制单人" value="当前用户" />
          <DetailField label="审核状态" value={status} />
          <DetailField label="备注" value={detail.remark} className="col-span-6" />
        </div>
      </EditorCard>

      <EditorCard title="采购明细">
        <LineItemTable variant="order" lines={detail.lines} rowKeyPrefix={detail.orderNo} />
        <DocumentSummaryBar
          quantityLabel="采购数量"
          quantity={totalQuantity}
          amountLabel="含税金额"
          amount={totalAmount}
        />
      </EditorCard>

      <EditorCard title="状态与金额">
        <div className={erpFieldGridClassName}>
          <DetailField label="执行状态" value={orderStatusLabels.executionStatus[row.executionStatus] || '未执行'} />
          <DetailField label="入库状态" value={orderStatusLabels.inboundStatus[row.inboundStatus] || '未入库'} />
          <DetailField label="关闭状态" value={orderStatusLabels.closeStatus[row.closeStatus] || '未关闭'} />
          <DetailField label="付款状态" value={orderStatusLabels.paymentStatus[row.paymentStatus] || '未核销'} />
          <DetailField label="成交金额" value={`¥ ${formatAmount(totalAmount)}`} />
          <DetailField label="已执行金额" value={`¥ ${formatAmount(row.executedAmount)}`} />
        </div>
      </EditorCard>
    </DocumentDetailFrame>
  );
}
