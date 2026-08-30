import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { defaultInboundForm, getEditableInbound, purchaseLineEditorOptions } from '../data/purchaseFormData.js';
import { inboundStatusLabels } from '../data/inboundData.js';

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

const inboundDetailConfig = {
  listPageId: 'purchase-inbound',
  editPageId: 'purchase-inbound-edit',
  infoSectionTitle: '入库信息',
  lineSectionTitle: '入库明细',
  lineVariant: 'inbound',
  lineEditorOptions: purchaseLineEditorOptions,
  getDetail: getInboundDetail,
  title: (detail) => `采购入库单详情${detail.inboundNo && detail.inboundNo !== '保存后自动生成' ? ` · ${detail.inboundNo}` : ''}`,
  getStatus: (row, detail) => inboundStatusLabels[row.status] || detail.status,
  canEdit: (row) => row.status !== 'completed',
  rowKey: (detail) => detail.inboundNo,
  infoFields: ({ detail, status }) => [
    { key: 'inboundNo', label: '入库单号', value: detail.inboundNo },
    { key: 'date', label: '单据日期', value: detail.date },
    { key: 'inboundType', label: '入库类型', value: detail.inboundType },
    { key: 'relatedOrderNo', label: '关联采购订单', value: detail.relatedOrderNo },
    { key: 'supplier', label: '供应商', value: detail.supplier },
    { key: 'warehouse', label: '入库仓库', value: detail.warehouse },
    { key: 'operator', label: '经办人', value: detail.operator },
    { key: 'status', label: '入库状态', value: status },
    { key: 'remark', label: '备注', value: detail.remark, className: 'col-span-3' },
  ],
  summary: { quantityLabel: '入库数量', amountLabel: '入库金额' },
};

export function PurchaseInboundDetailPage(props) {
  return <DocumentDetailPage {...props} config={inboundDetailConfig} />;
}
