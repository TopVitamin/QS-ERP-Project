/**
 * 业财结果单据（系统集成）演示数据：列表列、查询选项与种子数据。
 *
 * 口径依据：《业财结果单据主PRD》（R01～R10、F01～F05）、《业财结果单据页面骨架》、
 * 《业财结果单据前端Demo版PRD_列表页》§2～§4、《…_弹窗与Mock》§2～§4；
 * 字段与枚举逐字取《业财结果单据（详细稿）》：七类已审核结果单、推送财务ERP状态四种取值。
 *
 * 演示说明：
 * - 种子单号取各模块结果单种子中真实存在的单据，推送状态、最近推送时间与失败原因与来源单一致
 *   （来源模块的 `un_pushed` 在本页按本页枚举 `not_pushed` 表达，展示同为「未推送」）；
 * - 推送记录为演示虚构（来源模块没有推送记录集合），其中 1 张单含 3 条记录（系统自动、自动重试、人工重推）；
 * - 另留 1 条不存在单号的演示行，用于演示「结果单不存在或不可访问」提示（主PRD AC09）。
 */
import { ensureSeedRows } from '../lib/mockStorage.js';
import { toSelectOptions } from '../lib/options.js';
import { getInventoryLogicalWarehouseOptions } from './warehouseData.js';

export const FINANCE_RESULT_STORAGE_KEY = 'qs-erp:integration-finance-results:v2';

/** 七类已审核结果单（枚举逐字来自《业财结果单据（详细稿）》）。 */
export const financeResultDocTypeLabels = {
  purchase_inbound: '采购入库单',
  purchase_return_outbound: '采退出库单',
  sales_outbound: '销售出库单',
  sales_return_inbound: '销退入库单',
  other_inbound: '其他入库单',
  other_outbound: '其他出库单',
  direct_transfer: '直接调拨单',
};

export const financeErpPushStatusLabels = {
  not_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

/** 列表状态列语义色文字（列表页 Demo PRD §4.3）：未推送 neutral 用默认文字色。 */
export const financeErpPushStatusTones = {
  not_pushed: '',
  pushing: 'text-erp-info',
  push_success: 'text-erp-success',
  push_failed: 'text-erp-danger',
};

/** 推送记录：触发方式（字段清单「推送记录」分组）。 */
export const pushTriggerLabels = {
  system: '系统自动',
  auto_retry: '自动重试',
  manual: '人工重推',
  ops_manual: '异常运维重推',
};

/** 推送记录：推送结果。 */
export const pushResultLabels = {
  success: '成功',
  failed: '失败',
};

export const pushResultTones = {
  success: 'text-erp-success',
  failed: 'text-erp-danger',
};

/** 处理说明、重推原因字数上限（字段清单：0~500 字符）。 */
export const FINANCE_RESULT_NOTE_MAX = 500;

/** 重推 Mock 固定失败原因；正式环境的失败原因来自财务ERP接口（主PRD Q01，接口设计待定）。 */
export const FINANCE_RESULT_MOCK_FAIL_REASON = '财务ERP接口超时，请重试';

const SEED_FAIL_REASON = '接口超时，财务ERP未确认接收';

/** 未显式给推送记录的种子行按状态补一条记录；未推送、推送中无已完成记录。 */
function buildDefaultPushRecords({ financeErpPushStatus, lastPushTime, failReason }) {
  if (!lastPushTime || financeErpPushStatus === 'not_pushed' || financeErpPushStatus === 'pushing') return [];
  if (financeErpPushStatus === 'push_success') {
    return [{ seq: 1, pushTime: lastPushTime, result: 'success', failReason: '', trigger: 'system', operator: '系统', note: '' }];
  }
  return [{ seq: 1, pushTime: lastPushTime, result: 'failed', failReason: failReason || SEED_FAIL_REASON, trigger: 'system', operator: '系统', note: '' }];
}

function buildSeedRow({
  id,
  docType,
  docNo,
  businessDate,
  warehouse = '',
  fromWarehouse = '',
  toWarehouse = '',
  financeErpPushStatus,
  lastPushTime = '',
  failReason = '',
  pushRecords = null,
}) {
  return {
    id,
    docType,
    docNo,
    businessDate,
    warehouse,
    fromWarehouse,
    toWarehouse,
    financeErpPushStatus,
    lastPushTime,
    failReason,
    pushRecords: pushRecords || buildDefaultPushRecords({ financeErpPushStatus, lastPushTime, failReason }),
  };
}

/**
 * 种子行（24 条，七类各至少 1 条；四种推送状态各至少 2 条；推送失败 9 条、未推送 3 条；
 * 业务日期跨 2026-09-17～2026-09-24）。行内 `warehouse` 与直接调拨单的
 * `fromWarehouse`／`toWarehouse` 为逻辑仓编码，展示时解析为 Code-Name。
 */
const seedRows = [
  buildSeedRow({
    id: 'finance-result-seed-01',
    docType: 'purchase_inbound',
    docNo: 'CGRK-20260917-0001',
    businessDate: '2026-09-17',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-17 15:31:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-02',
    docType: 'purchase_inbound',
    docNo: 'CGRK-20260918-0001',
    businessDate: '2026-09-18',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-18 11:22:00',
    failReason: SEED_FAIL_REASON,
    // 演示推送记录弹窗：系统自动、自动重试、人工重推各一条（Demo 列表页 PRD §8.1）
    pushRecords: [
      { seq: 1, pushTime: '2026-09-18 11:10:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'system', operator: '系统', note: '' },
      { seq: 2, pushTime: '2026-09-18 11:16:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'auto_retry', operator: '系统', note: '' },
      { seq: 3, pushTime: '2026-09-18 11:22:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'manual', operator: '张三', note: '接口恢复后重推' },
    ],
  }),
  buildSeedRow({
    id: 'finance-result-seed-03',
    docType: 'purchase_inbound',
    docNo: 'CGRK-20260921-0001',
    businessDate: '2026-09-21',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-21 12:01:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-04',
    docType: 'purchase_inbound',
    docNo: 'CGRK-20260921-0004',
    businessDate: '2026-09-21',
    warehouse: 'LWH000003',
    financeErpPushStatus: 'pushing',
  }),
  buildSeedRow({
    // 演示行：该单号不存在于采购入库单种子，点击单号按「结果单不存在或不可访问」提示（主PRD AC09）
    id: 'finance-result-seed-05',
    docType: 'purchase_inbound',
    docNo: 'CGRK-20260924-0001',
    businessDate: '2026-09-24',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-24 10:15:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-06',
    docType: 'purchase_return_outbound',
    docNo: 'CTCK-20260919-0001',
    businessDate: '2026-09-19',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-19 10:21:00',
    pushRecords: [
      { seq: 1, pushTime: '2026-09-19 10:15:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'system', operator: '系统', note: '' },
      { seq: 2, pushTime: '2026-09-19 10:21:00', result: 'success', failReason: '', trigger: 'manual', operator: '张三', note: '接口恢复后重推' },
    ],
  }),
  buildSeedRow({
    id: 'finance-result-seed-07',
    docType: 'purchase_return_outbound',
    docNo: 'CTCK-20260922-0001',
    businessDate: '2026-09-22',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-22 09:51:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-08',
    docType: 'purchase_return_outbound',
    docNo: 'CTCK-20260922-0002',
    businessDate: '2026-09-22',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'not_pushed',
  }),
  buildSeedRow({
    id: 'finance-result-seed-09',
    docType: 'sales_outbound',
    docNo: 'XSCK-20260917-0001',
    businessDate: '2026-09-17',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-17 15:31:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-10',
    docType: 'sales_outbound',
    docNo: 'XSCK-20260918-0001',
    businessDate: '2026-09-18',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-18 11:22:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-11',
    docType: 'sales_outbound',
    docNo: 'XSCK-20260922-0003',
    businessDate: '2026-09-22',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-22 09:12:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-12',
    docType: 'sales_outbound',
    docNo: 'XSCK-20260922-0007',
    businessDate: '2026-09-22',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-22 14:21:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-13',
    docType: 'sales_return_inbound',
    docNo: 'XTRK-20260917-0001',
    businessDate: '2026-09-17',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-17 15:31:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-14',
    docType: 'sales_return_inbound',
    docNo: 'XTRK-20260919-0001',
    businessDate: '2026-09-19',
    warehouse: 'LWH000003',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-19 15:22:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-15',
    docType: 'sales_return_inbound',
    docNo: 'XTRK-20260920-0001',
    businessDate: '2026-09-20',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'pushing',
    lastPushTime: '2026-09-20 21:06:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-16',
    docType: 'sales_return_inbound',
    docNo: 'XTRK-20260921-0003',
    businessDate: '2026-09-21',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'not_pushed',
  }),
  buildSeedRow({
    id: 'finance-result-seed-17',
    docType: 'other_inbound',
    docNo: 'QTRK-20260917-0001',
    businessDate: '2026-09-17',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-17 15:31:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-18',
    docType: 'other_inbound',
    docNo: 'QTRK-20260921-0005',
    businessDate: '2026-09-21',
    warehouse: 'LWH000001',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-21 09:42:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-19',
    docType: 'other_outbound',
    docNo: 'QTCK-20260922-0002',
    businessDate: '2026-09-22',
    warehouse: 'LWH000009',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-22 15:11:00',
  }),
  buildSeedRow({
    id: 'finance-result-seed-20',
    docType: 'other_outbound',
    docNo: 'QTCK-20260923-0001',
    businessDate: '2026-09-23',
    warehouse: 'LWH000002',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-23 08:31:00',
    failReason: SEED_FAIL_REASON,
    pushRecords: [
      { seq: 1, pushTime: '2026-09-23 08:25:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'system', operator: '系统', note: '' },
      { seq: 2, pushTime: '2026-09-23 08:31:00', result: 'failed', failReason: SEED_FAIL_REASON, trigger: 'auto_retry', operator: '系统', note: '' },
    ],
  }),
  buildSeedRow({
    id: 'finance-result-seed-21',
    docType: 'other_outbound',
    docNo: 'QTCK-20260923-0004',
    businessDate: '2026-09-23',
    warehouse: 'LWH000005',
    financeErpPushStatus: 'not_pushed',
  }),
  buildSeedRow({
    id: 'finance-result-seed-22',
    docType: 'direct_transfer',
    docNo: 'ZJDB-20260922-0004',
    businessDate: '2026-09-22',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000006',
    financeErpPushStatus: 'push_success',
    lastPushTime: '2026-09-22 16:20:30',
  }),
  buildSeedRow({
    id: 'finance-result-seed-23',
    docType: 'direct_transfer',
    docNo: 'ZJDB-20260923-0005',
    businessDate: '2026-09-23',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000009',
    financeErpPushStatus: 'push_failed',
    lastPushTime: '2026-09-23 13:40:00',
    failReason: SEED_FAIL_REASON,
  }),
  buildSeedRow({
    id: 'finance-result-seed-24',
    docType: 'direct_transfer',
    docNo: 'ZJDB-20260923-0006',
    businessDate: '2026-09-23',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000009',
    financeErpPushStatus: 'pushing',
  }),
];

/** 默认排序：业务日期降序；同一业务日期内最近推送时间降序，无推送时间的排在最后（主PRD R07）。 */
function compareFinanceResultSeedRows(left, right) {
  const byBusinessDate = String(right.businessDate || '').localeCompare(String(left.businessDate || ''));
  if (byBusinessDate !== 0) return byBusinessDate;
  const leftTime = String(left.lastPushTime || '');
  const rightTime = String(right.lastPushTime || '');
  if (!leftTime || !rightTime) {
    if (!leftTime && !rightTime) return 0;
    return leftTime ? -1 : 1;
  }
  return rightTime.localeCompare(leftTime);
}

// 先按默认排序预排种子，列表再借 `defaultSort: businessDate 降序` 的稳定排序保持同日次序
export const financeResultSeeds = seedRows.slice().sort(compareFinanceResultSeedRows);

export const financeResultInitialFilters = {
  docType: [],
  docNo: '',
  businessDate: { from: '', to: '' },
  warehouse: '',
  financeErpPushStatus: [],
  lastPushTime: { from: '', to: '' },
};

export const financeResultFilterFields = [
  { key: 'docType', label: '结果单类型', type: 'multi-select', placeholder: '全部', options: toSelectOptions(financeResultDocTypeLabels) },
  { key: 'docNo', label: '结果单号', type: 'search', placeholder: '请输入结果单号' },
  { key: 'businessDate', label: '业务日期', type: 'date-range', placeholder: '不限' },
  { key: 'warehouse', label: '仓库', type: 'select', placeholder: '全部逻辑仓', options: [{ value: '', label: '全部逻辑仓' }, ...getInventoryLogicalWarehouseOptions()] },
  { key: 'financeErpPushStatus', label: '推送财务ERP状态', type: 'multi-select', placeholder: '全部', options: toSelectOptions(financeErpPushStatusLabels) },
  { key: 'lastPushTime', label: '最近推送时间', type: 'date-range', placeholder: '不限' },
];

/**
 * 列表列按《业财结果单据前端Demo版PRD_列表页》§4.2；不展示财务ERP单号。
 * 结果单类型与结果单号相邻并默认固定左侧（`initialPinnedKeys`）。
 */
export const financeResultColumns = [
  {
    key: 'docType',
    label: '结果单类型',
    defaultWidth: 120,
    minWidth: 104,
    maxWidth: 160,
    ellipsis: true,
    render: (value) => financeResultDocTypeLabels[value] || value,
  },
  { key: 'docNo', label: '结果单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'warehouseLabel', label: '仓库', defaultWidth: 240, minWidth: 150, maxWidth: 340, ellipsis: true },
  {
    key: 'financeErpPushStatus',
    label: '推送财务ERP状态',
    defaultWidth: 120,
    minWidth: 104,
    maxWidth: 160,
    ellipsis: true,
    render: (value) => financeErpPushStatusLabels[value] || value,
    tone: (value) => financeErpPushStatusTones[value] || '',
  },
  { key: 'lastPushTime', label: '最近推送时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
  { key: 'failReason', label: '失败原因', defaultWidth: 220, minWidth: 150, maxWidth: 320, ellipsis: true },
];

// 首次加载落库种子：避免第一次局部写入（重推更新状态）把种子挤掉
ensureSeedRows(FINANCE_RESULT_STORAGE_KEY, financeResultSeeds);
