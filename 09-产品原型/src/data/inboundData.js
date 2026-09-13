const seedInboundOrders = [
  { inboundNo: 'CG入库-20260818-00018', relatedOrderNo: 'CGDD-20260818-00045', supplier: '测试', warehouse: '一号仓', inboundType: '采购入库', status: 'pending', operator: '陈小梦CXM', quantity: 28, amount: 339 },
  { inboundNo: 'CG入库-20260818-00017', relatedOrderNo: 'CGDD-20260818-00043', supplier: '我是赠品2', warehouse: '一号仓', inboundType: '采购入库', status: 'completed', operator: '李明', quantity: 120, amount: 9000 },
  { inboundNo: 'CG入库-20260818-00016', relatedOrderNo: 'CGDD-20260818-00042', supplier: '我是赠品2', warehouse: '二号仓', inboundType: '采购入库', status: 'completed', operator: '李明', quantity: 80, amount: 9000 },
  { inboundNo: 'CG入库-20260818-00015', relatedOrderNo: 'CGDD-20260818-00035', supplier: '土豆供应商', warehouse: '一号仓', inboundType: '采购入库', status: 'completed', operator: '王芳', quantity: 64, amount: 5888 },
  { inboundNo: 'CG入库-20260818-00014', relatedOrderNo: 'CGDD-20260818-00030', supplier: '测试', warehouse: '一号仓', inboundType: '采购入库', status: 'partial', operator: '陈小梦CXM', quantity: 18, amount: 0 },
  { inboundNo: 'CG入库-20260818-00013', relatedOrderNo: 'CGDD-20260818-00034', supplier: '中南批发商行', warehouse: '三号仓', inboundType: '采购入库', status: 'pending', operator: '张廷ZT', quantity: 36, amount: 1695 },
  { inboundNo: 'CG入库-20260818-00012', relatedOrderNo: 'CGDD-20260818-00033', supplier: '土豆供应商', warehouse: '一号仓', inboundType: '采购入库', status: 'pending', operator: '李明', quantity: 42, amount: 1243 },
  { inboundNo: 'CG入库-20260818-00011', relatedOrderNo: 'CGDD-20260818-00032', supplier: '甲', warehouse: '二号仓', inboundType: '采购入库', status: 'pending', operator: '李明', quantity: 25, amount: 1130 },
  { inboundNo: 'CG入库-20260818-00010', relatedOrderNo: 'CGDD-20260818-00026', supplier: '订货散客', warehouse: '一号仓', inboundType: '采购入库', status: 'pending', operator: '张廷ZT', quantity: 51, amount: 2280 },
  { inboundNo: 'CG入库-20260818-00009', relatedOrderNo: 'CGDD-20260818-00023', supplier: '中南批发商行', warehouse: '三号仓', inboundType: '采购入库', status: 'completed', operator: '王芳', quantity: 74, amount: 7500 },
  { inboundNo: 'CG入库-20260818-00008', relatedOrderNo: 'CGDD-20260818-00024', supplier: '土豆供应商', warehouse: '一号仓', inboundType: '采购入库', status: 'pending', operator: '王芳', quantity: 30, amount: 0 },
  { inboundNo: 'CG入库-20260818-00007', relatedOrderNo: 'CGDD-20260818-00027', supplier: '供应商10086', warehouse: '二号仓', inboundType: '采购入库', status: 'pending', operator: '李明', quantity: 46, amount: 0 },
];

export const inboundOrders = seedInboundOrders.map((row, index) => ({ id: `inbound-${index + 1}`, date: '2026-08-18', ...row }));

export const inboundStatusLabels = { pending: '待入库', partial: '部分入库', completed: '已入库' };

export const inboundColumns = [
  { key: 'date', label: '单据日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'inboundNo', label: '入库单号', defaultWidth: 210, minWidth: 180, maxWidth: 300, ellipsis: true, link: true },
  { key: 'relatedOrderNo', label: '关联采购订单', defaultWidth: 200, minWidth: 160, maxWidth: 280, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 180, minWidth: 120, maxWidth: 280, ellipsis: true },
  { key: 'currency', label: '币别', defaultWidth: 88, minWidth: 76, maxWidth: 130, ellipsis: true, render: (value) => value || '人民币' },
  { key: 'warehouse', label: '入库仓库', defaultWidth: 130, minWidth: 96, maxWidth: 180, ellipsis: true },
  { key: 'inboundType', label: '入库类型', defaultWidth: 120, minWidth: 96, maxWidth: 180, ellipsis: true },
  { key: 'status', label: '入库状态', defaultWidth: 110, minWidth: 96, maxWidth: 180, ellipsis: true, render: (value) => inboundStatusLabels[value], tone: (value) => value === 'pending' ? 'text-erp-warning' : value === 'partial' ? 'text-erp-info' : 'text-erp-success' },
  { key: 'operator', label: '经办人', defaultWidth: 150, minWidth: 100, maxWidth: 200, ellipsis: true },
  { key: 'quantity', label: '入库数量', defaultWidth: 120, minWidth: 96, maxWidth: 180, ellipsis: true, align: 'right', sortable: true },
  { key: 'amount', label: '入库金额', defaultWidth: 148, minWidth: 120, maxWidth: 200, ellipsis: true, align: 'right', sortable: true, render: (value) => value ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '' },
];
