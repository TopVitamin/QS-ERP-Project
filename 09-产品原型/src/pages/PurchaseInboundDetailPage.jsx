import { useMemo } from 'react';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { DocumentSummaryBar } from '../components/erp/DocumentSummaryBar.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { defaultInboundForm, getEditableInbound } from '../data/purchaseFormData.js';
import { inboundStatusLabels } from '../data/inboundData.js';
import { erpFieldGridClassName } from '../styles/typography.js';

function getInboundDetail(row) {
  const source = getEditableInbound(row);
  const quantity = Number(row.quantity || 0);
  const fallbackLines = row?.id ? [{
    id: `${row.id}-summary-line`,
    product: defaultInboundForm.lines[0].product,
    spec: '列表汇总明细',
    unit: defaultInboundForm.lines[0].unit,
    orderQuantity: quantity,
    quantity,
    price: quantity ? Number(row.amount || 0) / quantity : 0,
    remark: '',
  }] : defaultInboundForm.lines;

  return {
    ...source,
    lines: row?.lines?.length ? row.lines : fallbackLines,
  };
}

export function PurchaseInboundDetailPage({ context, onOpenPage }) {
  const row = context?.row || {};
  const detail = useMemo(() => getInboundDetail(row), [row]);
  const totalQuantity = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalAmount = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const status = inboundStatusLabels[row.status] || detail.status;

  return (
    <DocumentDetailFrame
      title={`采购入库单详情${detail.inboundNo && detail.inboundNo !== '保存后自动生成' ? ` · ${detail.inboundNo}` : ''}`}
      status={status}
      onBack={() => onOpenPage?.('purchase-inbound')}
      onEdit={row.status !== 'completed' ? () => onOpenPage?.('purchase-inbound-edit', { row }) : undefined}
      editLabel="修改"
    >
      <EditorCard title="入库信息">
        <div className={erpFieldGridClassName}>
          <DetailField label="入库单号" value={detail.inboundNo} />
          <DetailField label="单据日期" value={detail.date} />
          <DetailField label="入库类型" value={detail.inboundType} />
          <DetailField label="关联采购订单" value={detail.relatedOrderNo} />
          <DetailField label="供应商" value={detail.supplier} />
          <DetailField label="入库仓库" value={detail.warehouse} />
          <DetailField label="经办人" value={detail.operator} />
          <DetailField label="入库状态" value={status} />
          <DetailField label="备注" value={detail.remark} className="col-span-6" />
        </div>
      </EditorCard>

      <EditorCard title="入库明细">
        <LineItemTable variant="inbound" lines={detail.lines} rowKeyPrefix={detail.inboundNo} />
        <DocumentSummaryBar
          quantityLabel="入库数量"
          quantity={totalQuantity}
          amountLabel="入库金额"
          amount={totalAmount}
        />
      </EditorCard>
    </DocumentDetailFrame>
  );
}
