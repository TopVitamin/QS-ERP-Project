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
 * - 独立站订单页已接入（2026-10-15）：跳转直达订单详情；
 * - 处理状态筛选为多选、默认「待处理」（主PRD R07；详细稿第2行备注）；目标系统筛选项按页签取各自枚举；
 * - 结果处理页签含两条可走完的 Mock 演示链路（《结果处理规则（二版）》§八 M1、M2）：
 *   商品匹配失败→补映射→处理原记录、库存不足→解决→处理原记录，由 `pushExceptionLogic`
 *   的 `recoverResultExceptionMock` 执行；`demoRecover` 为演示载荷，正式系统不存在该字段。
 */
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import { toSelectOptions } from '../lib/options.js';
import { FINANCE_RESULT_STORAGE_KEY, financeResultDocTypeLabels, financeResultSeeds } from './financeResultData.js';
import { products, PRODUCT_STORAGE_KEY } from './productData.js';

// v3（2026-10-15）：B10① 修复种子——推送财务ERP页签结果单号跳转、已处理演示单号改为来源模块真实种子、
// 推送外部仓库补独立站订单行与 3 条处理记录行；版本升级使旧演示存储重新按新种子落库。
export const PUSH_EXCEPTION_STORAGE_KEY = 'qs-erp:integration-exceptions:v3';

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

/** 目标系统筛选项按页签取各自枚举集合（详细稿「目标系统」行；列表页 Demo PRD §2）。 */
const targetSystemOptionsByTab = {
  warehouse: ['self_wms', 'jushuitan', 'lingxing', 'third_wms'],
  masterdata: ['third_wms', 'kingdeeCloud', 'jushuitan', 'lingxing'],
};

function toTargetSystemOptions(keys) {
  return keys.map((key) => ({ value: key, label: pushExceptionTargetSystemLabels[key] }));
}

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
  status: ['pending'],
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

/** 处理状态：多选（OR），默认「待处理」，未选等同全部（主PRD R07；详细稿第2行备注）。 */
const statusField = {
  key: 'status',
  label: '处理状态',
  type: 'multi-select',
  placeholder: '全部',
  options: toSelectOptions(pushExceptionStatusLabels),
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
    { key: 'targetSystem', label: '目标系统', type: 'multi-select', placeholder: '全部', options: toTargetSystemOptions(targetSystemOptionsByTab.warehouse) },
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
    { key: 'targetSystem', label: '目标系统', type: 'multi-select', placeholder: '全部', options: toTargetSystemOptions(targetSystemOptionsByTab.masterdata) },
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
      // 演示单号取采购入库单真实种子（notice-seed-inbound-3 生成），点击可跳转（主PRD AC09、R09）
      docNo: 'CGRK-20260921-0001',
      failTime: '2026-09-21 11:50:00',
      failReason: '接口超时，财务ERP未确认接收',
      status: 'handled',
      records: [
        { id: 'push-exception-finance-h1-1', time: '2026-09-21 11:55:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' },
        { id: 'push-exception-finance-h1-2', time: '2026-09-21 12:01:00', method: 'retry', result: 'success', operator: '当前用户', note: '接口恢复后重推' },
      ],
    },
    {
      id: 'push-exception-finance-h2',
      tab: 'finance',
      docType: 'sales_return_inbound',
      // 演示单号取销退入库单真实种子，点击可跳转（主PRD AC09、R09）
      docNo: 'XTRK-20260920-0002',
      failTime: '2026-09-20 21:05:00',
      failReason: '财务ERP返回往来单位不匹配',
      status: 'handled',
      records: [
        { id: 'push-exception-finance-h2-1', time: '2026-09-20 21:21:00', method: 'retry', result: 'success', operator: '当前用户', note: '修复客户映射后重推' },
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
  {
    // 电商仓场景演示（《采购收货通知单前端Demo版PRD_弹窗与Mock》§5.8）：对应通知种子 notice-seed-ec-failed；
    // 原单重试成功或取消后，由 receiptNoticeLogic 的同步把本行置为「已处理」。
    id: 'push-exception-warehouse-9', tab: 'warehouse', docType: 'purchase_receipt_notice', docNo: 'CGSHTZ-20261014-0001',
    targetSystem: 'jushuitan', failTime: '2026-10-14 09:45:00', failReason: '经聚水潭中转推送超时，未确认接收', status: 'pending',
    records: [{ id: 'push-exception-warehouse-9-1', time: '2026-10-14 09:46:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' }],
  },
  {
    // 独立站订单推送仓库失败演示（列表页 Demo PRD §8.1：推送外部仓库页签覆盖通知单、申请单、独立站订单各至少1条）；
    // 对应独立站订单种子 XSDD-20261014-0007（shopifyOrderData，status=push_failed），单据编号可跳原单。
    id: 'push-exception-warehouse-10', tab: 'warehouse', docType: 'shopify_order', docNo: 'XSDD-20261014-0007',
    targetSystem: 'self_wms', failTime: '2026-10-14 09:52:00', failReason: '仓库接口超时（自动重试 3 次仍失败）', status: 'pending',
    records: [{ id: 'push-exception-warehouse-10-1', time: '2026-10-14 09:52:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' }],
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
    failTime: '2026-09-22 11:30:00', failReason: '外部商品编码未匹配到唯一SKU', status: 'pending', executionId: 'EX-20260922-01', records: [],
  },
  {
    id: 'push-exception-result-2', tab: 'result', sourceSystem: 'lingxing', sourceNo: 'LX-20260922-451', stage: 'ownership',
    failTime: '2026-09-22 13:05:00', failReason: '无法识别归属逻辑仓', status: 'pending', executionId: 'EX-20260922-02', records: [],
  },
  {
    id: 'push-exception-result-3', tab: 'result', sourceSystem: 'self_wms', sourceNo: 'WH-RT-20260923-01', stage: 'stock_check',
    failTime: '2026-09-23 09:48:00', failReason: '出库数量超过可用库存', status: 'handled', executionId: 'EX-20260923-01',
    records: [{ id: 'push-exception-result-3-1', time: '2026-09-23 10:30:00', method: 'recover', result: 'success', operator: '技术运维', note: '补齐库存归属后处理原记录' }],
  },
  {
    id: 'push-exception-result-4', tab: 'result', sourceSystem: 'shopify', sourceNo: 'SHOP-20260923-0009', stage: 'product_match',
    failTime: '2026-09-23 15:12:00', failReason: '外部商品编码未匹配到唯一SKU', status: 'handled', executionId: 'EX-20260923-02',
    records: [{ id: 'push-exception-result-4-1', time: '2026-09-23 16:00:00', method: 'recover', result: 'success', operator: '当前用户', note: '补齐商品映射后处理原记录' }],
  },
  {
    id: 'push-exception-result-5', tab: 'result', sourceSystem: 'third_wms', sourceNo: 'TPL-20260923-77', stage: 'stock_check',
    failTime: '2026-09-23 20:35:00', failReason: '入库数量与校验口径不一致', status: 'pending', executionId: 'EX-20260923-03', records: [],
  },
  {
    id: 'push-exception-result-6', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST-88231101', stage: 'other',
    failTime: '2026-09-24 08:55:00', failReason: '结果字段缺失，无法处理', status: 'pending', executionId: 'EX-20260924-01', records: [],
  },
  // —— 结果处理 Mock 演示链路（《结果处理规则（二版）》§八 M1、M2 与 SAL-FR12）——
  // M1：商品匹配失败 → 补商品映射 → 处理原记录（生成已审核销售出库单、逻辑仓扣减一次、异常自动置为已处理）
  {
    id: 'push-exception-result-demo-m1', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST20261014007', stage: 'product_match',
    failTime: '2026-10-14 10:06:00', failReason: '平台商品编码未匹配到ERP商品', status: 'pending', executionId: 'EX-20261014-02', records: [],
    demoRecover: {
      kind: 'domestic',
      orderNo: 'GNDS-20261014-0007',
      platformSku: 'TB-884729100061',
      product: 'SP0101020002',
      warehouse: 'LWH000001',
      quantity: 2,
      price: 165,
      taxRate: '13',
      note: '补齐商品映射后处理原记录',
    },
  },
  // M2：库存不足 → 核实并补足库存 → 处理原记录（出库单与扣减只发生一次，不出现负库存）
  {
    id: 'push-exception-result-demo-m2', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST20261014008', stage: 'stock_check',
    failTime: '2026-10-14 11:12:00', failReason: '渠道已出库，逻辑仓可用库存不足', status: 'pending', executionId: 'EX-20261014-03', records: [],
    demoRecover: {
      kind: 'domestic',
      orderNo: 'GNDS-20261014-0008',
      product: 'SP0101020001',
      warehouse: 'LWH000001',
      quantity: 10,
      price: 169,
      taxRate: '13',
      note: '核实差异并补足库存后处理原记录',
    },
  },
  // 已处理示例：归属识别失败，经系统自动重试、人工重试仍失败后补齐映射处理成功，关联结果单可跳转。
  // 本行含 3 条处理记录（系统自动重试、人工重试、修复恢复），用于演示处理记录弹窗（列表页 Demo PRD §8.1、弹窗与Mock §4）。
  {
    id: 'push-exception-result-handled-1', tab: 'result', sourceSystem: 'jushuitan', sourceNo: 'JST20260918001', stage: 'ownership',
    failTime: '2026-09-19 08:30:00', failReason: '无法识别归属逻辑仓', status: 'handled', executionId: 'EX-20260919-01',
    resultDocNo: 'XSCK-20260919-0001', resultDocType: 'sales_outbound',
    records: [
      { id: 'push-exception-result-handled-1-1', time: '2026-09-19 08:35:00', method: 'auto_retry', result: 'failed', operator: '系统', note: '' },
      { id: 'push-exception-result-handled-1-2', time: '2026-09-19 08:50:00', method: 'manual_retry', result: 'failed', operator: '技术运维', note: '人工重试仍失败，需先补齐仓库映射' },
      { id: 'push-exception-result-handled-1-3', time: '2026-09-19 09:00:00', method: 'recover', result: 'success', operator: '系统', note: '补齐仓库映射后处理原记录' },
    ],
  },
  // 跨境电商来源的待处理记录（静态只读示例，不提供处理演示）
  {
    id: 'push-exception-result-demo-cb5', tab: 'result', sourceSystem: 'lingxing', sourceNo: 'LX20261014005', stage: 'product_match',
    failTime: '2026-10-14 13:25:00', failReason: '平台商品编码未匹配到ERP商品', status: 'pending', executionId: 'EX-20261014-05', records: [],
  },
];

export const pushExceptionSeeds = [...buildFinanceTabSeeds(), ...seedRows];

// 首次加载落库种子：避免第一次写入（如业财重推同步）把种子挤掉；
// 已落库时补齐缺失的演示种子（含结果处理演示链路），保证模拟数据覆盖随版本更新。
{
  const storedRows = readMockRows(PUSH_EXCEPTION_STORAGE_KEY, null);
  if (!Array.isArray(storedRows)) {
    writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
  } else {
    const missingSeeds = pushExceptionSeeds.filter((seed) => !storedRows.some((row) => row.id === seed.id));
    if (missingSeeds.length) writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, [...storedRows, ...missingSeeds]);
  }
}
