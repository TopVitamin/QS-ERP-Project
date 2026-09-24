/**
 * 业财结果单据逻辑：读取推送情况、推送记录与重推 Mock。
 *
 * 口径依据：《业财结果单据主PRD》R01～R10（只读查看、仅推送失败可重推、推送成功后异常运维重推、
 * 推送记录全部保留）与《业财结果单据前端Demo版PRD_弹窗与Mock》§4（重推后的本地状态与记录变化）。
 *
 * 演示边界：
 * - 重推为本地 Mock：确认后状态置「推送中」，约 1.2 秒后按演示开关返回成功或失败，
 *   每次推送追加一条推送记录；不调用财务ERP、不回滚库存、不重复记账；
 * - 重推与异常运维重推成功后，推送异常页签需同步「已处理」（第二阶段接入），
 *   收尾统一走 `afterFinancePushFinished`。
 */
import {
  FINANCE_RESULT_MOCK_FAIL_REASON,
  FINANCE_RESULT_STORAGE_KEY,
  financeResultDocTypeLabels,
  financeResultSeeds,
  financeErpPushStatusLabels,
} from '../data/financeResultData.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { nowStamp } from './inventoryStockLogic.js';
import { readMockRows, writeMockRows } from './mockStorage.js';
import { syncFinanceExceptionFromPush } from './pushExceptionLogic.js';

export {
  FINANCE_RESULT_MOCK_FAIL_REASON,
  FINANCE_RESULT_NOTE_MAX,
  FINANCE_RESULT_STORAGE_KEY,
  financeResultColumns,
  financeResultDocTypeLabels,
  financeResultFilterFields,
  financeResultInitialFilters,
  financeResultSeeds,
  financeErpPushStatusLabels,
  financeErpPushStatusTones,
  pushResultLabels,
  pushResultTones,
  pushTriggerLabels,
} from '../data/financeResultData.js';

/** 重推 Mock 延时：确认后约 1.2 秒返回推送结果（弹窗与Mock §4.2）。 */
export const FINANCE_RESULT_PUSH_DELAY_MS = 1200;

/** 行内操作人：人工触发记当前账号，系统触发记「系统」（字段清单「操作人」）。 */
const CURRENT_OPERATOR = '当前用户';
const SYSTEM_OPERATOR = '系统';

/** 结果单行补齐展示字段：类型与推送状态文字、仓库 Code-Name（直接调拨单为「来源 → 目标」）。 */
export function resolveFinanceResultRow(row) {
  const isDirectTransfer = row.docType === 'direct_transfer';
  return {
    ...row,
    docTypeLabel: financeResultDocTypeLabels[row.docType] || row.docType,
    warehouseLabel: isDirectTransfer
      ? `${resolveLogicalWarehouseLabel(row.fromWarehouse)} → ${resolveLogicalWarehouseLabel(row.toWarehouse)}`
      : resolveLogicalWarehouseLabel(row.warehouse),
  };
}

export function loadFinanceResultRows() {
  return readMockRows(FINANCE_RESULT_STORAGE_KEY, financeResultSeeds).map(resolveFinanceResultRow);
}

/** `DocumentListPage` 的 `normalizeRows` 接法：整表行补齐展示字段（库存等模块同口径）。 */
export function normalizeFinanceResultRows(rows = []) {
  return rows.map(resolveFinanceResultRow);
}

/** 重推：仅「推送失败」可用（主PRD R04）。 */
export function canRetryFinanceResult(row) {
  return row?.financeErpPushStatus === 'push_failed';
}

/** 异常运维重推：仅「推送成功」可用（主PRD R05；权限见 Q02，原型无权限模型）。 */
export function canOpsRetryFinanceResult(row) {
  return row?.financeErpPushStatus === 'push_success';
}

/** 推送记录按推送时间倒序（同时间按序号倒序），供推送记录弹窗展示。 */
export function listFinancePushRecords(row) {
  return [...(row?.pushRecords || [])].sort((left, right) => {
    const byTime = String(right.pushTime || '').localeCompare(String(left.pushTime || ''));
    if (byTime !== 0) return byTime;
    return Number(right.seq || 0) - Number(left.seq || 0);
  });
}

/**
 * 推送完成后的收尾：同步「推送异常-推送财务ERP」页签（推送异常主PRD R04、R05；
 * 弹窗与Mock §3）：重推成功后该结果单的异常记录置为「已处理」；仍失败时保持「待处理」并更新失败原因。
 */
function afterFinancePushFinished(payload) {
  syncFinanceExceptionFromPush(payload);
}

/**
 * 重推／异常运维重推（F03、F04）：针对原结果单重新推送，不重新审核、不重复记账、不回滚库存。
 *
 * 确认后：状态置「推送中」、最近推送时间取当前时间；延时后按演示开关返回结果并追加推送记录。
 * `onFinished` 在 Mock 推送结束时回调（Toast 文案按列表页 Demo PRD §7）。
 */
export function retryFinanceResultDoc(docId, { trigger = 'manual', note = '', forceFail = false, operator, onFinished } = {}) {
  const rows = readMockRows(FINANCE_RESULT_STORAGE_KEY, financeResultSeeds);
  const index = rows.findIndex((row) => row.id === docId);
  if (index < 0) return { ok: false, message: '结果单不存在或不可访问' };

  const current = rows[index];
  const isOpsRetry = trigger === 'ops_manual';
  const statusMatched = isOpsRetry ? canOpsRetryFinanceResult(current) : canRetryFinanceResult(current);
  if (!statusMatched) {
    const statusLabel = financeErpPushStatusLabels[current.financeErpPushStatus] || current.financeErpPushStatus;
    return { ok: false, message: `当前推送状态为${statusLabel}，不可执行${isOpsRetry ? '异常运维重推' : '重推'}` };
  }

  const startedAt = nowStamp();
  writeMockRows(FINANCE_RESULT_STORAGE_KEY, rows.map((row, rowIndex) => (rowIndex === index
    ? { ...row, financeErpPushStatus: 'pushing', lastPushTime: startedAt, failReason: '' }
    : row)));

  setTimeout(() => {
    const latestRows = readMockRows(FINANCE_RESULT_STORAGE_KEY, financeResultSeeds);
    const latestIndex = latestRows.findIndex((row) => row.id === docId);
    if (latestIndex < 0) return;
    const latest = latestRows[latestIndex];
    // 推送中先等待，不覆盖已被其他动作改变的状态（主PRD R03）
    if (latest.financeErpPushStatus !== 'pushing') return;

    const finishedAt = nowStamp();
    const success = !forceFail;
    const failReason = success ? '' : FINANCE_RESULT_MOCK_FAIL_REASON;
    const records = latest.pushRecords || [];
    const record = {
      seq: records.length + 1,
      pushTime: finishedAt,
      result: success ? 'success' : 'failed',
      failReason,
      trigger,
      operator: operator || (isOpsRetry || trigger === 'manual' ? CURRENT_OPERATOR : SYSTEM_OPERATOR),
      note: String(note || '').trim(),
    };
    const finishedRow = {
      ...latest,
      financeErpPushStatus: success ? 'push_success' : 'push_failed',
      lastPushTime: finishedAt,
      failReason,
      pushRecords: [...records, record],
    };
    writeMockRows(FINANCE_RESULT_STORAGE_KEY, latestRows.map((row, rowIndex) => (rowIndex === latestIndex ? finishedRow : row)));

    afterFinancePushFinished({ row: finishedRow, trigger, success, record });
    onFinished?.({
      message: success ? '已重新推送，当前状态：推送成功' : '已重新推送，当前状态：推送失败，请查看失败原因',
      type: success ? 'success' : 'warning',
    });
  }, FINANCE_RESULT_PUSH_DELAY_MS);

  return { ok: true };
}
