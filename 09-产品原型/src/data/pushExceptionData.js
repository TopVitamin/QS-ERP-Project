/**
 * 推送异常（系统集成）演示数据：五个推送对象页签的种子、标签与查询/列配置。
 *
 * 口径依据：《推送异常主PRD》（R01～R10、F01～F05）、《推送异常页面骨架》、
 * 《推送异常前端Demo版PRD_列表页》§1～§6、《…_弹窗与Mock》§2～§3；
 * 字段与枚举逐字取《推送异常（详细稿）》。
 *
 * 演示说明：
 * - 「推送财务ERP」页签的行由业财结果单据存储中的推送失败单据派生（同源；重推成功后由
 *   `pushExceptionLogic.syncFinanceExceptionFromPush` 置为「已处理」）；
 * - 其余页签为演示种子；「单据编号／商品编码」点击跳原单，找不到时按主PRD R09 提示；
 * - 独立站订单页尚未接入原型，跳转落到其占位页（见09《待改项》）。
 */
import { ensureSeedRows, readMockRows } from '../lib/mockStorage.js';
import { toSelectOptions } from '../lib/options.js';
import { FINANCE_RESULT_STORAGE_KEY, financeResultDocTypeLabels, financeResultSeeds } from './financeResultData.js';
import { products, PRODUCT_STORAGE_KEY } from './productData.js';

export const PUSH_EXCEPTION_STORAGE_KEY = 'qs-erp:integration-exceptions:v2';

/** 五个推送对象页签（顺序按主PRD R03 与菜单说明）。 */
export const pushExceptionTabItems = [
  { value: 'finance', label: '推送财务ERP' },
  { value: 'warehouse', label: '推送外部仓库' },
  { value: 'platform', label: '推送电商平台' },
  { value: 'masterdata', label: '主数据分发' },
  { value: 'result', label: '结果处理' },
];

export const pushExceptionStatusLabels = { pending: '待处理', handled: '已处理' };
/** 列表状态列语义色文字：待处理 warning、已处理 neutral（列表页 Demo PRD §4.3）。 */
export const pushExceptionStatusTones = { pending: 'text-erp-warning', handled: '' };

export const pushExceptionMethodLabels = {
  auto_retry: '系统自动重试',
  manual_retry: '人工重试',
  retry: '重推',
  recover: '修复恢复',
};

export const pushExceptionResultLabels = { success: '成功', failed: '失败' };
export const pushExceptionResultTones = { success: 'text-erp-success', failed: 'text-erp-danger' };

export const pushExceptionDocTypeLabels = {
  purchase_receipt_notice: '采购收货通知单',
  purchase_return_notice: '采退发货通知单',
  sales_delivery_notice: '销售发货通知单',
  sales_return_notice: '销退收货通知单',
  transfer_out_notice: '调出通知单',
  transfer_in_notice: '调入通知单',
  other_inbound_request: '其他入库申请单',
  other_outbound_request: '其他出库申请单',
  shopify_order: '独立站订单',
};

export const pushExceptionTargetSystemLabels = {
  self_wms: '自营仓作业系统',
  jushuitan: '聚水潭',
  lingxing: '领星',
  third_wms: '第三方仓／WMS',
  kingdeeCloud: '金蝶云·星空',
};

export const pushExceptionContentLabels = { shipment: '发货结果与运单', cancel: '取消结果' };

export const pushExceptionSourceSystemLabels = {
  jushuitan: '聚水潭',
  lingxing: '领星',
  shopify: 'Shopify',
  self_wms: '自营仓作业系统',
  third_wms: '第三方仓／WMS',
};

export const pushExceptionStageLabels = {
  product_match: '商品匹配',
  ownership: '归属识别',
  stock_check: '库存校验',
  other: '其他处理',
};

export const PUSH_EXCEPTION_NOTE_MAX = 500;

export const pushExceptionInitialFilters = {
  tab: 'finance',
  status: 'pending',
  failTime: { from: '', to: '' },
  docType: [],
  docNo: '',
  targetSystem: [],
  pushContent: [],
  productCode: '',
  productName: '',
  sourceSystem: [],
  sourceNo: '',
  stage: [],
};

const statusField = {
  key: 'status',
  label: '处理状态',
  type: 'select',
  placeholder: '待处理',
  options: [
    { value: '', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'handled', label: '已处理' },
  ],
};

const failTimeField = { key: 'failTime', label: '失败时间', type: 'date-range', placeholder: '不限' };

const failTimeColumn = { key: 'failTime', label: '失败时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true };
const failReasonColumn = { key: 'failReason', label: '失败原因', defaultWidth: 240, minWidth: 160, maxWidth: 360, ellipsis: true };
const statusColumn = {
  key: 'status',
  label: '处理状态',
  defaultWidth: 96,
  minWidth: 88,
  maxWidth: 130,
  ellipsis: true,
  render: (value) => pushExceptionStatusLabels[value] || value,
  tone: (value) => pushExceptionStatusTones[value] || '',
};
const docNoColumn = (label) => ({ key: 'docNo', label, defaultWidth: 190, minWidth: 170, maxWidth: 250, ellipsis: true, link: true });
const docTypeColumn = { key: 'docType', label: '单据类型', defaultWidth: 140, minWidth: 120, maxWidth: 190, ellipsis: true, render: (value) => pushExceptionDocTypeLabels[value] || value };
const targetSystemColumn = { key: 'targetSystem', label: '目标系统', defaultWidth: 140, minWidth: 120, maxWidth: 190, ellipsis: true, render: (value) => pushExceptionTargetSystemLabels[value] || value };

/** 各页签列表列（顺序按《推送异常（详细稿）》「列表展示=是」）。 */
const pushExceptionColumnsByTab = {
  finance: [
    { key: 'docType', label: '结果单类型', defaultWidth: 120, minWidth: 104, maxWidth: 160, ellipsis: true, render: (value) => financeResultDocTypeLabels[value] || value },
    docNoColumn('结果单号'),
    failTimeColumn,
    failReasonColumn,
    statusColumn,
  ],
  warehouse: [docTypeColumn, docNoColumn('单据编号'), targetSystemColumn, failTimeColumn, failReasonColumn, statusColumn],
  platform: [
    docTypeColumn,
    docNoColumn('单据编号'),
    { key: 'pushContent', label: '推送内容', defaultWidth: 140, minWidth: 120, maxWidth: 190, ellipsis: true, render: (value) => pushExceptionContentLabels[value] || value },
    failTimeColumn,
    failReasonColumn,
    statusColumn,
  ],
  masterdata: [
    { key: 'productCode', label: '商品编码', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, link: true },
    { key: 'productName', label: '商品名称', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
    targetSystemColumn,
    failTimeColumn,
    failReasonColumn,
    statusColumn,
  ],
  result: [
    { key: 'sourceSystem', label: '来源系统', defaultWidth: 140, minWidth: 120, maxWidth: 190, ellipsis: true, render: (value) => pushExceptionSourceSystemLabels[value] || value },
    { key: 'sourceNo', label: '来源单号', defaultWidth: 180, minWidth: 150, maxWidth: 240, ellipsis: true },
    { key: 'stage', label: '异常环节', defaultWidth: 120, minWidth: 104, maxWidth: 160, ellipsis: true, render: (value) => pushExceptionStageLabels[value] || value },
    failTimeColumn,
    failReasonColumn,
    statusColumn,
  ],
};

/** 各页签查询条件（共有条件在前，页签专属在后）。 */
const pushExceptionFilterFieldsByTab = {
  finance: [
    statusField,
    failTimeField,
    { key: 'docType', label: '结果单类型', type: 'multi-select', placeholder: '全部', options: toSelectOptions(financeResultDocTypeLabels) },
    { key: 'docNo', label: '结果单号', type: 'search', placeholder: '请输入结果单号' },
  ],
  warehouse: [
    statusField,
    failTimeField,
    { key: 'docType', label: '单据类型', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionDocTypeLabels) },
    { key: 'docNo', label: '单据编号', type: 'search', placeholder: '请输入单据编号' },
    { key: 'targetSystem', label: '目标系统', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionTargetSystemLabels) },
  ],
  platform: [
    statusField,
    failTimeField,
    { key: 'docType', label: '单据类型', type: 'multi-select', placeholder: '全部', options: [{ value: 'shopify_order', label: '独立站订单' }] },
    { key: 'docNo', label: '单据编号', type: 'search', placeholder: '请输入单据编号' },
    { key: 'pushContent', label: '推送内容', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionContentLabels) },
  ],
  masterdata: [
    statusField,
    failTimeField,
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
    { key: 'targetSystem', label: '目标系统', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionTargetSystemLabels) },
  ],
  result: [
    statusField,
    failTimeField,
    { key: 'sourceSystem', label: '来源系统', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionSourceSystemLabels) },
    { key: 'sourceNo', label: '来源单号', type: 'search', placeholder: '请输入来源单号' },
    { key: 'stage', label: '异常环节', type: 'multi-select', placeholder: '全部', options: toSelectOptions(pushExceptionStageLabels) },
  ],
};

export function getPushExceptionColumns(tab) {
  return pushExceptionColumnsByTab[tab] || pushExceptionColumnsByTab.finance;
}

export function getPushExceptionFilterFields(tab) {
  return pushExceptionFilterFieldsByTab[tab] || pushExceptionFilterFieldsByTab.finance;
}

const statusExportField = { key: 'status', label: '处理状态', options: toSelectOptions(pushExceptionStatusLabels) };

/** 各页签导出字段（与列表列一致；导出走导出中心，导入一期不做）。 */
const pushExceptionExportFieldsByTab = {
  finance: [
    { key: 'docType', label: '结果单类型', options: toSelectOptions(financeResultDocTypeLabels) },
    { key: 'docNo', label: '结果单号' },
    { key: 'failTime', label: '失败时间' },
    { key: 'failReason', label: '失败原因' },
    statusExportField,
  ],
  warehouse: [
    { key: 'docType', label: '单据类型', options: toSelectOptions(pushExceptionDocTypeLabels) },
    { key: 'docNo', label: '单据编号' },
    { key: 'targetSystem', label: '目标系统', options: toSelectOptions(pushExceptionTargetSystemLabels) },
    { key: 'failTime', label: '失败时间' },
    { key: 'failReason', label: '失败原因' },
    statusExportField,
  ],
  platform: [
    { key: 'docType', label: '单据类型', options: toSelectOptions(pushExceptionDocTypeLabels) },
    { key: 'docNo', label: '单据编号' },
    { key: 'pushContent', label: '推送内容', options: toSelectOptions(pushExceptionContentLabels) },
    { key: 'failTime', label: '失败时间' },
    { key: 'failReason', label: '失败原因' },
    statusExportField,
  ],
  masterdata: [
    { key: 'productCode', label: '商品编码' },
    { key: 'productName', label: '商品名称' },
    { key: 'targetSystem', label: '目标系统', options: toSelectOptions(pushExceptionTargetSystemLabels) },
    { key: 'failTime', label: '失败时间' },
    { key: 'failReason', label: '失败原因' },
    statusExportField,
  ],
  result: [
    { key: 'sourceSystem', label: '来源系统', options: toSelectOptions(pushExceptionSourceSystemLabels) },
    { key: 'sourceNo', label: '来源单号' },
    { key: 'stage', label: '异常环节', options: toSelectOptions(pushExceptionStageLabels) },
    { key: 'failTime', label: '失败时间' },
    { key: 'failReason', label: '失败原因' },
    statusExportField,
  ],
};

export function getPushExceptionExportFields(tab) {
  return pushExceptionExportFieldsByTab[tab] || pushExceptionExportFieldsByTab.finance;
}

// —— 种子 ——

function buildFinanceExceptionRow(financeRow) {
  // 处理记录与《业财结果单据主PRD》的推送记录同源：自动重试记「系统自动重试」，
  // 人工重推与异常运维重推记「重推」，首次推送不记（推送异常主PRD R05）。
  const records = (financeRow.pushRecords || [])
    .filter((record) => record.trigger !== 'system')
    .map((record, index) => ({
      id: `${financeRow.id}-handle-${index + 1}`,
      time: record.pushTime,
      method: record.trigger === 'auto_retry' ? 'auto_retry' : 'retry',
      result: record.result,
      operator: record.operator,
      note: record.note || '',
    }));
  return {
    id: `push-exception-finance-${financeRow.id}`,
    tab: 'finance',
    docType: financeRow.docType,
    docNo: financeRow.docNo,
    failTime: financeRow.lastPushTime,
    failReason: financeRow.failReason,
    status: 'pending',
    records,
  };
}

/** 「推送财务ERP」页签种子：业财结果单据存储中推送失败的单据（同源），另补两条已处理历史。 */
function buildFinanceTabSeeds() {
  const financeRows = readMockRows(FINANCE_RESULT_STORAGE_KEY, financeResultSeeds);
  const derived = financeRows
    .filter((row) => row.financeErpPushStatus === 'push_failed')
    .map(buildFinanceExceptionRow);
  const handled = [
    {
      id: 'push-exception-finance-h1',
      tab: 'finance',
      docType: 'purchase_inbound',
      docNo: 'CGRK-20260919-0003',
      failTime: '2026-09-19 16:12:00',
      failReason: '接口超时，财务ERP未确认接收',
      status: 'handled',
      records: [
        { id: 'push-exception-finance-h1-1', time: '2026-09-19 16:12:30', method: 'auto_retry', result: 'failed', operator: '系统', note: '' },
        { id: 'push-exception-finance-h1-2', time: '2026-09-19 16:40:00', method: 'retry', result: 'success', operator: '当前用户', note: '接口恢复后重推' },
      ],
    },
    {
      id: 'push-exception-finance-h2',
      tab: 'finance',
      docType: 'sales_return_inbound',
      docNo: 'XTRK-20260920-0002',
      failTime: '2026-09-20 09:30:00',
      failReason: '财务ERP返回往来单位不匹配',
      status: 'handled',
      records: [
        { id: 'push-exception-finance-h2-1', time: '2026-09-20 10:05:00', method: 'retry', result: 'success', operator: '当前用户', note: '修复客户映射后重推' },
      ],
    },
  ];
  return [...derived, ...handled];
}

function buildProductRow(code, targetSystem, failTime, failReason, status, records = []) {
  const product = readMockRows(PRODUCT_STORAGE_KEY, products).find((row) => row.code === code);
  return {
    id: `push-exception-masterdata-${code}-${targetSystem}`,
    tab: 'masterdata',
    productCode: code,
    productName: product?.name || code,
    targetSystem,
    failTime,
    failReason,
    status,
    records,
  };
}

/** 演示种子（非财务ERP页签）：每页签 ≥6 条，待处理、已处理各 ≥2 条（列表页 Demo PRD §8.1）。 */
const seedRows = [
  // 推送外部仓库
  {
    id: 'push-exception-warehouse-1', tab: 'warehouse', docType: 'purchase_receipt_notice', docNo: 'CGSHTZ-20260919-0001',
    targetSystem: 'self_wms', failTime: '2026-09-19 09:12:00', failReason: '仓库接口连接超时', status: 'pending',
    records: [{ id: 'push-exception-warehouse-1-1', time: '2026-09-19 09:25:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' }],
  },
  {
    id: 'push-exception-warehouse-2', tab: 'warehouse', docType: 'purchase_return_notice', docNo: 'CTFHTZ-20260920-0001',
    targetSystem: 'jushuitan', failTime: '2026-09-20 10:05:00', failReason: 'SaaS中转未返回接收结果', status: 'pending', records: [],
  },
  {
    id: 'push-exception-warehouse-3', tab: 'warehouse', docType: 'sales_delivery_notice', docNo: 'XSFHTZ-20260919-0001',
    targetSystem: 'self_wms', failTime: '2026-09-19 14:20:00', failReason: '仓库接口连接超时', status: 'handled',
    records: [{ id: 'push-exception-warehouse-3-1', time: '2026-09-19 14:32:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '接口恢复后重试' }],
  },
  {
    id: 'push-exception-warehouse-4', tab: 'warehouse', docType: 'sales_return_notice', docNo: 'XTSHTZ-20260919-0001',
    targetSystem: 'lingxing', failTime: '2026-09-19 16:40:00', failReason: '平台未返回接收结果', status: 'pending', records: [],
  },
  {
    id: 'push-exception-warehouse-5', tab: 'warehouse', docType: 'transfer_out_notice', docNo: 'DCTZ-20260922-0001',
    targetSystem: 'third_wms', failTime: '2026-09-22 10:15:00', failReason: '接口连接超时', status: 'pending',
    records: [{ id: 'push-exception-warehouse-5-1', time: '2026-09-22 10:30:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' }],
  },
  {
    id: 'push-exception-warehouse-6', tab: 'warehouse', docType: 'transfer_in_notice', docNo: 'DRTZ-20260922-0001',
    targetSystem: 'third_wms', failTime: '2026-09-22 15:02:00', failReason: '接口连接超时', status: 'handled',
    records: [{ id: 'push-exception-warehouse-6-1', time: '2026-09-22 15:20:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' }],
  },
  {
    id: 'push-exception-warehouse-7', tab: 'warehouse', docType: 'other_inbound_request', docNo: 'QTRKSQ-20260916-0001',
    targetSystem: 'third_wms', failTime: '2026-09-16 11:00:00', failReason: '仓库接口连接超时', status: 'handled',
    records: [{ id: 'push-exception-warehouse-7-1', time: '2026-09-16 11:25:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' }],
  },
  {
    id: 'push-exception-warehouse-8', tab: 'warehouse', docType: 'other_outbound_request', docNo: 'QTCKSQ-20260923-0001',
    targetSystem: 'self_wms', failTime: '2026-09-23 09:30:00', failReason: '仓库接口连接超时', status: 'pending', records: [],
  },
  // 推送电商平台
  {
    id: 'push-exception-platform-1', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260922-0006', pushContent: 'shipment',
    failTime: '2026-09-22 20:10:00', failReason: 'Shopify接口超时', status: 'pending', records: [],
  },
  {
    id: 'push-exception-platform-2', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260922-0007', pushContent: 'cancel',
    failTime: '2026-09-22 21:05:00', failReason: '平台返回失败', status: 'handled',
    records: [{ id: 'push-exception-platform-2-1', time: '2026-09-22 21:30:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' }],
  },
  {
    id: 'push-exception-platform-3', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260923-0003', pushContent: 'shipment',
    failTime: '2026-09-23 11:40:00', failReason: 'Shopify接口超时', status: 'pending', records: [],
  },
  {
    id: 'push-exception-platform-4', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260923-0005', pushContent: 'shipment',
    failTime: '2026-09-23 18:22:00', failReason: '平台返回失败', status: 'handled',
    records: [{ id: 'push-exception-platform-4-1', time: '2026-09-23 18:50:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' }],
  },
  {
    id: 'push-exception-platform-5', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260924-0001', pushContent: 'cancel',
    failTime: '2026-09-24 09:15:00', failReason: 'Shopify接口超时', status: 'pending', records: [],
  },
  {
    id: 'push-exception-platform-6', tab: 'platform', docType: 'shopify_order', docNo: 'XSDD-20260924-0002', pushContent: 'shipment',
    failTime: '2026-09-24 10:05:00', failReason: '平台返回失败', status: 'pending', records: [],
  },
  // 主数据分发
  buildProductRow('SP0101010001', 'third_wms', '2026-09-20 08:40:00', '分发接口超时', 'handled', [
    { id: 'push-exception-masterdata-1-1', time: '2026-09-20 09:10:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' },
  ]),
  buildProductRow('SP0101010002', 'kingdeeCloud', '2026-09-21 10:20:00', '财务ERP接口超时', 'pending', []),
  buildProductRow('SP0101020001', 'jushuitan', '2026-09-21 15:35:00', 'SaaS未返回分发结果', 'pending', []),
  buildProductRow('SP0101020002', 'lingxing', '2026-09-22 09:05:00', '平台未返回分发结果', 'handled', [
    { id: 'push-exception-masterdata-4-1', time: '2026-09-22 09:40:00', method: 'manual_retry', result: 'success', operator: '当前用户', note: '' },
  ]),
  buildProductRow('SP0101030001', 'kingdeeCloud', '2026-09-23 14:10:00', '财务ERP接口超时', 'pending', []),
  buildProductRow('SP0102010001', 'third_wms', '2026-09-23 17:20:00', '分发接口超时', 'pending', []),
  // 结果处理
  {
    id: 'push-exception-result-1', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST-88231007', stage: 'product_match',
    failTime: '2026-09-22 11:30:00', failReason: '外部商品编码未匹配到唯一SKU', status: 'pending', records: [],
  },
  {
    id: 'push-exception-result-2', tab: 'result', sourceSystem: 'lingxing', sourceNo: 'LX-20260922-451', stage: 'ownership',
    failTime: '2026-09-22 13:05:00', failReason: '无法识别归属逻辑仓', status: 'pending', records: [],
  },
  {
    id: 'push-exception-result-3', tab: 'result', sourceSystem: 'self_wms', sourceNo: 'WH-RT-20260923-01', stage: 'stock_check',
    failTime: '2026-09-23 09:48:00', failReason: '出库数量超过可用库存', status: 'handled',
    records: [{ id: 'push-exception-result-3-1', time: '2026-09-23 10:30:00', method: 'recover', result: 'success', operator: '技术运维', note: '补齐库存归属后处理原记录' }],
  },
  {
    id: 'push-exception-result-4', tab: 'result', sourceSystem: 'shopify', sourceNo: 'SHOP-20260923-0009', stage: 'product_match',
    failTime: '2026-09-23 15:12:00', failReason: '外部商品编码未匹配到唯一SKU', status: 'handled',
    records: [{ id: 'push-exception-result-4-1', time: '2026-09-23 16:00:00', method: 'recover', result: 'success', operator: '当前用户', note: '补齐商品映射后处理原记录' }],
  },
  {
    id: 'push-exception-result-5', tab: 'result', sourceSystem: 'third_wms', sourceNo: 'TPL-20260923-77', stage: 'stock_check',
    failTime: '2026-09-23 20:35:00', failReason: '入库数量与校验口径不一致', status: 'pending', records: [],
  },
  {
    id: 'push-exception-result-6', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST-88231101', stage: 'other',
    failTime: '2026-09-24 08:55:00', failReason: '结果字段缺失，无法处理', status: 'pending', records: [],
  },
];

export const pushExceptionSeeds = [...buildFinanceTabSeeds(), ...seedRows];

// 首次加载落库种子：避免第一次写入（如业财重推同步）把种子挤掉
ensureSeedRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
