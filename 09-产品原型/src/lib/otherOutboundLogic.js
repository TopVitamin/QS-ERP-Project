/**
 * 其他出库单（结果单）：生成、记账、金蝶推送与查询。
 *
 * 依据《其他出库单主PRD》§6（状态—功能矩阵）、§7（R01～R12）与《其他出库单前端Demo版PRD_弹窗与Mock》：
 * - 两类来源统一收口：其他出库申请单回传实出>0，或仓库主动回传校验通过；
 * - 创建即为已审核，审核人留空，创建人与最后更新人显示「系统」；
 * - 记账统一走 `postStockEntries`：减少逻辑仓即时库存、消耗实出预占、释放未出预占、写库存流水；
 * - 零出不生成结果单，由申请单侧按取消结束并释放全部预占；
 * - 金蝶推送状态从「未推送」开始，Demo 模拟推送进度（明确失败可自动重试最多 3 次）。
 */
import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { nowStamp, postStockEntries } from './inventoryStockLogic.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';

export const OTHER_OUTBOUND_STORAGE_KEY = 'qs-erp:other-outbounds:v1';

/** 来源类型枚举（逐字取自《其他出库单（详细稿）》）：申请执行、仓库主动回传。 */
export const otherOutboundSourceTypeLabels = {
  request: '申请执行',
  warehouse: '仓库主动回传',
};

/** 审核状态：一期界面正常数据均为已审核；草稿/待审核的人工确认入口在系统集成中心。 */
export const otherOutboundAuditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
};

export const otherOutboundAuditTones = {
  draft: 'warning',
  pending: 'info',
  approved: 'success',
};

export const kingdeePushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

export const kingdeePushStatusTones = {
  un_pushed: 'warning',
  pushing: 'info',
  push_success: 'success',
  push_failed: 'danger',
};

const kingdeePushTextToneMap = {
  un_pushed: 'text-erp-warning',
  pushing: 'text-erp-info',
  push_success: 'text-erp-success',
  push_failed: 'text-erp-danger',
};

export function resolveKingdeePushStatusTone(status) {
  return kingdeePushTextToneMap[status] || 'text-erp-text';
}

export function resolveOtherOutboundAuditTone(status) {
  return status === 'approved' ? 'text-erp-success' : 'text-erp-warning';
}

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

let outboundLineSequence = 0;

export function createOtherOutboundLine(overrides = {}) {
  return {
    id: `other-outbound-line-${Date.now()}-${outboundLineSequence++}`,
    product: '',
    productCode: '',
    productName: '',
    unit: '个',
    quantity: 0,
    sourceRequestLineNo: null,
    sourceOutboundLine: '',
    ...overrides,
  };
}

export function enrichOtherOutboundLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  return {
    ...line,
    productCode: line.productCode || sku.skuCode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '个',
    quantity: Number(line.quantity || 0),
  };
}

export function refreshOtherOutboundLines(lines = []) {
  return lines.map((line, index) => ({ ...enrichOtherOutboundLine(line), lineNo: index + 1 }));
}

export function sumOutboundLineQty(lines = []) {
  return (lines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function normalizeOtherOutboundRow(row) {
  const lines = refreshOtherOutboundLines(row.lines || []);
  const actualOutboundTime = row.actualOutboundTime || row.createdAt || nowStamp();
  return {
    ...row,
    sourceType: row.sourceType || 'warehouse',
    sourceRequestId: row.sourceRequestId || '',
    sourceRequestNo: row.sourceRequestNo || '',
    sourceSystem: row.sourceSystem || '',
    sourceNo: row.sourceNo || '',
    auditStatus: row.auditStatus || 'approved',
    kingdeePushStatus: row.kingdeePushStatus || 'un_pushed',
    actualOutboundTime,
    businessDate: row.businessDate || String(actualOutboundTime).slice(0, 10),
    pushTime: row.pushTime || '',
    pushFailReason: row.pushFailReason || '',
    lines,
    totalOutboundQty: sumOutboundLineQty(lines),
    updatedAt: row.updatedAt || actualOutboundTime,
  };
}

export function persistOtherOutbound(row) {
  const next = normalizeOtherOutboundRow(row);
  upsertMockRow(OTHER_OUTBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllOtherOutbounds(seed = []) {
  return readMockRows(OTHER_OUTBOUND_STORAGE_KEY, seed);
}

export function loadOtherOutboundById(id, seed = []) {
  return loadAllOtherOutbounds(seed).find((row) => row.id === id) || null;
}

export function loadOtherOutboundByNo(outboundNo, seed = []) {
  return loadAllOtherOutbounds(seed).find((row) => row.outboundNo === outboundNo) || null;
}

/** 一张申请最多一张有效出库单（主PRD R02）。 */
export function loadOtherOutboundByRequestNo(requestNo, seed = []) {
  if (!requestNo) return null;
  return loadAllOtherOutbounds(seed).find((row) => row.sourceRequestNo === requestNo) || null;
}

export function loadOtherOutboundsByRequestNo(requestNo, seed = []) {
  if (!requestNo) return [];
  return loadAllOtherOutbounds(seed)
    .filter((row) => row.sourceRequestNo === requestNo)
    .sort((left, right) => String(right.actualOutboundTime || '').localeCompare(String(left.actualOutboundTime || '')));
}

function resolveOutboundNo(businessDate) {
  const existingNos = loadAllOtherOutbounds([]).map((row) => row.outboundNo);
  return nextDocumentNo('QTCK', businessDate, existingNos);
}

/**
 * 由申请单回传生成其他出库单（主PRD R02、R03、R05、R06、R11）。
 *
 * deliveryPayload：
 * - lineActuals：按申请行顺序的实出数量；缺省或为空视为按申请数量一次记账（在途仓直接记账路径）；
 * - directPosting：在途仓直接记账路径，来源申请单此时处于已审核（主PRD R20）；
 * - operator / time：记账人与时间，默认「系统」与当前时间。
 *
 * 返回 `{ outbound, zeroOut, request }`：
 * - 超量整次拒绝并抛错；
 * - 零出返回 `zeroOut: true`、`outbound: null`，申请单按取消处理（预占释放由申请单侧执行）；
 * - 实出>0 时结果单已落库并完成记账，`request` 为待回写的申请单数据（由调用方持久化）。
 */
export function generateOtherOutboundFromRequest(request, deliveryPayload = {}) {
  if (!request) throw new Error('来源其他出库申请单不存在');

  const allowedStatuses = deliveryPayload.directPosting
    ? ['approved']
    : ['pending_delivery', 'cancelling'];
  if (!allowedStatuses.includes(request.status)) {
    const error = new Error('来源其他出库申请单状态已变化，不能生成其他出库单');
    error.detail = `当前状态 ${request.status}`;
    throw error;
  }

  if (loadOtherOutboundByRequestNo(request.requestNo)) {
    throw new Error('该申请单已生成其他出库单，不能重复生成');
  }

  const time = deliveryPayload.time || nowStamp();
  const operator = deliveryPayload.operator || '系统';
  const requestedLines = request.lines || [];

  const actuals = requestedLines.map((line, index) => {
    const requested = Number(line.quantity || 0);
    const raw = deliveryPayload.lineActuals?.[index];
    const actual = raw === '' || raw == null ? requested : Number(raw);
    return { line, requested, actual };
  });

  const invalid = actuals.find((item) => !Number.isInteger(item.actual) || item.actual < 0);
  if (invalid) throw new Error('实出数量必须为不小于 0 的整数');

  const overflow = actuals.find((item) => item.actual > item.requested);
  if (overflow) {
    const error = new Error('实出数量不能超过申请数量，本次回传已拒绝');
    error.detail = `申请 ${overflow.requested}，实出 ${overflow.actual}`;
    throw error;
  }

  const totalActual = actuals.reduce((sum, item) => sum + item.actual, 0);

  // 零出：不生成零数量结果单，申请单按取消处理（主PRD R15、S03）
  if (totalActual <= 0) {
    return {
      outbound: null,
      zeroOut: true,
      totalActual: 0,
      releasedQty: requestedLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      request: {
        ...request,
        status: 'cancelled',
        cancelReason: request.cancelReason || '仓库确认零出，按取消处理',
        cancelOperator: request.cancelOperator || operator,
        cancelTime: request.cancelTime || time,
        updater: operator,
        updatedAt: time,
        lines: requestedLines.map((line) => ({
          ...line,
          actualQty: 0,
          remainingQty: Number(line.quantity || 0),
        })),
      },
    };
  }

  const businessDate = time.slice(0, 10);
  const outboundNo = resolveOutboundNo(businessDate);

  const outboundLines = actuals
    .filter((item) => item.actual > 0)
    .map((item) => createOtherOutboundLine({
      sourceRequestLineNo: item.line.lineNo,
      sourceOutboundLine: `${request.requestNo} 第${item.line.lineNo}行`,
      product: item.line.product,
      productCode: item.line.productCode,
      productName: item.line.productName,
      unit: item.line.unit,
      quantity: item.actual,
    }));

  const entries = actuals.map((item) => ({
    logicalWarehouse: request.logicalWarehouse,
    product: item.line.product,
    instantDelta: -item.actual,
    consumeReserved: item.actual,
    // 实出为 0 的行不产生即时减少，只释放该行未执行的预占（主PRD R15：实出消耗、未出释放）
    releaseReserved: Math.max(0, item.requested - item.actual),
    reservationSourceLineNo: item.line.lineNo,
  }));

  // 记账：减少即时库存、消耗实出预占、释放未出预占、写库存流水；不允许负库存（主PRD R05、R06）
  postStockEntries(entries, {
    eventType: 'result_out',
    sourceType: '其他出库单',
    sourceNo: outboundNo,
    businessType: request.businessType,
    operator,
    time,
    reservationSourceNo: request.requestNo,
  });

  const outbound = persistOtherOutbound({
    id: `other-outbound-${Date.now()}`,
    outboundNo,
    sourceType: 'request',
    sourceRequestId: request.id,
    sourceRequestNo: request.requestNo,
    sourceSystem: '',
    sourceNo: '',
    logicalWarehouse: request.logicalWarehouse,
    businessType: request.businessType,
    actualOutboundTime: time,
    businessDate,
    auditStatus: 'approved',
    auditor: '',
    auditTime: time,
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    remark: '',
    creator: '系统',
    createdAt: time,
    updater: '系统',
    updatedAt: time,
    lines: outboundLines,
  });

  simulateKingdeePush(outbound.id);

  return {
    outbound,
    zeroOut: false,
    totalActual,
    releasedQty: entries.reduce((sum, entry) => sum + entry.releaseReserved, 0),
    request: {
      ...request,
      status: 'delivered',
      deliverTime: time,
      updater: operator,
      updatedAt: time,
      lines: actuals.map((item) => ({
        ...item.line,
        actualQty: item.actual,
        remainingQty: Math.max(0, item.requested - item.actual),
      })),
    },
  };
}

/**
 * Demo Mock：仓库主动回传（弹窗与Mock §3）。
 * 不补建申请单、不补做预占；归属依据不足或库存校验不通过时阻断，不生成出库单。
 */
export function createMockWarehouseOutbound(form = {}) {
  if (!form.logicalWarehouse) throw new Error('归属依据不足，无法生成其他出库单');
  if (!form.businessType) throw new Error('请选择业务类型');
  if (!String(form.sourceSystem || '').trim()) throw new Error('来源系统不能为空');
  if (!String(form.sourceNo || '').trim()) throw new Error('来源单号不能为空');

  const lines = (form.lines || []).filter((line) => line.product || String(line.quantity ?? '').trim() !== '');
  if (!lines.length) throw new Error('请至少添加一行商品明细');

  const normalizedLines = lines.map((line, index) => {
    const quantityText = String(line.quantity ?? '').trim();
    if (!line.product) throw new Error(`第${index + 1}行请选择商品`);
    if (!Number.isInteger(Number(quantityText)) || Number(quantityText) <= 0) {
      throw new Error(`第${index + 1}行实际出库数量须为正整数`);
    }
    return { line, quantity: Number(quantityText) };
  });

  const time = nowStamp();
  const businessDate = time.slice(0, 10);
  const outboundNo = resolveOutboundNo(businessDate);

  const entries = normalizedLines.map((item) => ({
    logicalWarehouse: form.logicalWarehouse,
    product: item.line.product,
    instantDelta: -item.quantity,
    consumeReserved: 0,
    releaseReserved: 0,
  }));

  try {
    postStockEntries(entries, {
      eventType: 'result_out',
      sourceType: '其他出库单',
      sourceNo: outboundNo,
      businessType: form.businessType,
      operator: '系统',
      time,
    });
  } catch (error) {
    const blocked = new Error('库存不足，不允许负库存');
    blocked.detail = error.message;
    throw blocked;
  }

  const outbound = persistOtherOutbound({
    id: `other-outbound-${Date.now()}`,
    outboundNo,
    sourceType: 'warehouse',
    sourceRequestId: '',
    sourceRequestNo: '',
    sourceSystem: form.sourceSystem.trim(),
    sourceNo: form.sourceNo.trim(),
    logicalWarehouse: form.logicalWarehouse,
    businessType: form.businessType,
    actualOutboundTime: time,
    businessDate,
    auditStatus: 'approved',
    auditor: '',
    auditTime: time,
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    remark: form.remark || '',
    creator: '系统',
    createdAt: time,
    updater: '系统',
    updatedAt: time,
    lines: normalizedLines.map((item) => createOtherOutboundLine({
      product: item.line.product,
      productCode: item.line.productCode,
      productName: item.line.productName,
      unit: item.line.unit,
      quantity: item.quantity,
      sourceOutboundLine: '',
    })),
    isMock: true,
  });

  simulateKingdeePush(outbound.id);
  return outbound;
}

function clearKingdeeTimer(outboundId) {
  const timer = kingdeeTimers.get(outboundId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(outboundId);
  }
}

/** Demo：模拟金蝶推送进度，明确失败时自动重试最多 3 次（主PRD R10）。 */
function scheduleKingdeeAttempt(outboundId, attempt = 1, forceFail = false) {
  clearKingdeeTimer(outboundId);
  const current = loadOtherOutboundById(outboundId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  persistOtherOutbound({
    ...current,
    kingdeePushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(outboundId);
    const latest = loadOtherOutboundById(outboundId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    if (forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX) {
      persistOtherOutbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail && attempt < KINGDEE_AUTO_RETRY_MAX) {
      persistOtherOutbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(outboundId, attempt + 1, true);
      return;
    }

    persistOtherOutbound({
      ...latest,
      kingdeePushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(outboundId, timer);
  return loadOtherOutboundById(outboundId);
}

export function simulateKingdeePush(outboundId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(outboundId, 1, forceFail);
}

/** Demo 引导：首次运行时把种子结果单写入本地 Mock。 */
export function ensureOtherOutboundSeeds(seedRows = []) {
  if (!seedRows.length) return;
  if (readMockRows(OTHER_OUTBOUND_STORAGE_KEY, []).length) return;
  writeMockRows(OTHER_OUTBOUND_STORAGE_KEY, seedRows);
}

/** 其他出库单操作日志：按单据字段推导生成、审核、推送金蝶三类记录（一期简化版，倒序）。 */
export function buildOtherOutboundOperationLogs(row) {
  const entries = [];
  if (!row) return entries;

  if (row.createdAt) {
    entries.push({
      id: `generate-${row.createdAt}`,
      time: row.createdAt,
      operator: row.creator || '系统',
      action: '生成',
      remark: row.sourceType === 'warehouse'
        ? '仓库主动回传自动生成'
        : '申请单回传实出自动生成',
    });
  }
  if (row.auditTime) {
    entries.push({
      id: `audit-${row.auditTime}`,
      time: row.auditTime,
      operator: row.auditor || '系统',
      action: '审核',
      remark: '自动审核通过并减少逻辑仓即时库存、消耗对应预占',
    });
  }
  if (row.pushTime || row.pushFailReason) {
    entries.push({
      id: `push-${row.pushTime || row.pushFailReason}`,
      time: row.pushTime || row.updatedAt || row.createdAt,
      operator: '系统',
      action: '推送金蝶',
      remark: row.pushFailReason
        ? `推送失败：${row.pushFailReason}`
        : (kingdeePushStatusLabels[row.kingdeePushStatus] || '推送金蝶'),
    });
  }

  return entries.sort((left, right) => String(right.time).localeCompare(String(left.time)));
}
