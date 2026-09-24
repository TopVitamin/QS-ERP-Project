/**
 * 其他入库单（结果单）逻辑：生成、自动审核、库存记账与金蝶推送演示。
 *
 * 规则依据：《其他入库单主PRD》R01～R10、§6.4、§6.5；页面交互见《其他入库单前端Demo版PRD》。
 * - 结果单只由「申请单回传实收>0」或「仓库主动回传」生成，创建即为已审核，无新增/编辑/取消入口；
 * - 记账统一走 `inventoryStockLogic.postStockEntries`，本模块不直接改库存；
 * - 金蝶推送演示：生成后从未推送开始，Demo 模拟 未推送 → 推送中 → 推送成功/推送失败（自动重试最多3次）。
 */
import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { ensureStockRow, getStockRow, nowStamp, postStockEntries } from './inventoryStockLogic.js';

export const OTHER_INBOUND_STORAGE_KEY = 'qs-erp:other-inbounds:v1';

/** 其他入库业务类型：申请单与结果单共用同一枚举（主PRD Q01，2026-09-23 已定）。 */
export const otherInboundBusinessTypes = ['盘盈', '样品回收', '借出归还', '退料', '赠品入库'];

export const otherInboundSourceTypeLabels = {
  request: '申请执行',
  warehouse_push: '仓库主动回传',
};

export const otherInboundAuditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
};

export const otherInboundAuditTones = {
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

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

export function enrichOtherInboundLine(line = {}) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    quantity,
    sourceInboundLine: line.sourceInboundLine || '',
  };
}

export function refreshOtherInboundLines(lines = []) {
  return lines.map(enrichOtherInboundLine);
}

export function sumOtherInboundQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

/** 结果单规范字段：明细补齐展示字段、数量合计、业务日期取实际入库时间的日期部分。 */
export function normalizeOtherInboundRow(row = {}) {
  const lines = refreshOtherInboundLines(row.lines || []);
  const actualInboundTime = row.actualInboundTime || nowStamp();
  return {
    ...row,
    sourceType: row.sourceType || 'request',
    sourceSystem: row.sourceSystem || '',
    sourceNo: row.sourceNo || '',
    lines,
    totalInboundQty: sumOtherInboundQty(lines),
    actualInboundTime,
    businessDate: row.businessDate || String(actualInboundTime).slice(0, 10),
    pushTime: row.pushTime || '',
    pushFailReason: row.pushFailReason || '',
    remark: row.remark || '',
    auditor: row.auditor || '',
    auditTime: row.auditTime || actualInboundTime,
    creator: row.creator || '系统',
    createdAt: row.createdAt || actualInboundTime,
    updater: row.updater || '系统',
    updatedAt: row.updatedAt || actualInboundTime,
  };
}

export function persistOtherInbound(row) {
  const next = normalizeOtherInboundRow(row);
  upsertMockRow(OTHER_INBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllOtherInbounds(seed = []) {
  return readMockRows(OTHER_INBOUND_STORAGE_KEY, seed);
}

export function loadOtherInboundById(id) {
  return loadAllOtherInbounds([]).find((row) => row.id === id) || null;
}

export function loadOtherInboundByNo(inboundNo) {
  return loadAllOtherInbounds([]).find((row) => row.inboundNo === inboundNo) || null;
}

/** 一张申请最多一张有效结果单（主PRD R02）；按来源申请 ID 或单号定位。 */
export function loadOtherInboundByRequestId(requestId, requestNo) {
  return loadAllOtherInbounds([]).find((row) => (
    (requestId && row.sourceRequestId === requestId)
    || (requestNo && row.sourceRequestNo === requestNo)
  )) || null;
}

/**
 * 生成结果单前确保演示集合已装载：localStorage 为空时写入种子。
 * 避免用户先走申请单回传、后打开结果单列表时看不到演示数据，也避免单号与种子重复。
 */
export function ensureOtherInboundSeed(seedRows = []) {
  const stored = readMockRows(OTHER_INBOUND_STORAGE_KEY, null);
  if (Array.isArray(stored) && stored.length) return stored;
  const seeded = (seedRows || []).map(normalizeOtherInboundRow);
  if (seeded.length) writeMockRows(OTHER_INBOUND_STORAGE_KEY, seeded);
  return seeded;
}

// —— 金蝶推送（Demo 演示进度） ——

/** 更新金蝶推送状态与推送记录；重推成功后仍保留历史失败原因（主PRD §7.4）。 */
export function applyKingdeePushState(row, pushStatus, extra = {}) {
  return persistOtherInbound({
    ...row,
    kingdeePushStatus: pushStatus,
    ...extra,
  });
}

function clearKingdeeTimer(inboundId) {
  const timer = kingdeeTimers.get(inboundId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(inboundId);
  }
}

function scheduleKingdeeAttempt(inboundId, attempt = 1, { forceFail = false } = {}) {
  clearKingdeeTimer(inboundId);
  const current = loadOtherInboundById(inboundId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  applyKingdeePushState(current, 'pushing');

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(inboundId);
    const latest = loadOtherInboundById(inboundId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    if (forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX) {
      applyKingdeePushState(latest, 'push_failed', {
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail && attempt < KINGDEE_AUTO_RETRY_MAX) {
      applyKingdeePushState(latest, 'push_failed', {
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(inboundId, attempt + 1, { forceFail: true });
      return;
    }

    applyKingdeePushState(latest, 'push_success', {
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(inboundId, timer);
  return loadOtherInboundById(inboundId);
}

/** Demo：模拟金蝶推送进度；`forceFail` 时按最多3次自动重试后保持推送失败（主PRD R09）。 */
export function simulateKingdeePush(inboundId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(inboundId, 1, { forceFail });
}

// —— 生成 ——

function nextOtherInboundNo(businessDate) {
  const existingNos = loadAllOtherInbounds([]).map((row) => row.inboundNo);
  return nextDocumentNo('QTRK', businessDate, existingNos);
}

/**
 * 申请单回传实收生成其他入库单（主PRD R03、R05、R12、R13）。
 *
 * receiptPayload = { receipts: [{ lineId, actualQty }], time?, demoMock? }；未给的行按申请数量整行实收。
 * - 实收超过申请数量：整次拒绝并抛错，库存与状态不变；
 * - 实收合计为 0：零收不生成结果单，返回 null（申请单侧按取消处理）；
 * - 校验通过：写库存流水并生成已审核结果单。
 */
export function generateOtherInboundFromRequest(request, receiptPayload = {}) {
  if (!request) throw new Error('来源其他入库申请单不存在');
  if (request.status !== 'pending_receive' && request.status !== 'cancelling') {
    throw new Error('来源申请单当前状态不可回传');
  }
  if (request.inboundId || loadOtherInboundByRequestId(request.id, request.requestNo)) {
    throw new Error('该申请单已生成其他入库单，不能重复生成');
  }

  const receiptMap = new Map((receiptPayload.receipts || []).map((item) => [item.lineId, item.actualQty]));
  const receiptLines = (request.lines || []).map((line, index) => {
    const requestedQty = Number(line.quantity || 0);
    const raw = receiptMap.get(line.id);
    const actualQty = raw == null || raw === '' ? requestedQty : Number(raw);
    if (!Number.isInteger(actualQty) || actualQty < 0) {
      throw new Error(`第${index + 1}行实收数量须为不小于 0 的整数`);
    }
    if (actualQty > requestedQty) {
      throw new Error(`第${index + 1}行实收数量超过申请数量（申请 ${requestedQty}），本次回传被整次拒绝`);
    }
    return { line, index, actualQty };
  });

  const totalActualQty = receiptLines.reduce((sum, item) => sum + item.actualQty, 0);
  if (totalActualQty <= 0) return null;

  const actualInboundTime = receiptPayload.time || nowStamp();
  const inboundNo = nextOtherInboundNo(String(actualInboundTime).slice(0, 10));
  const activeLines = receiptLines.filter((item) => item.actualQty > 0);

  // 先记账再落单：记账校验失败（如库存行缺失）时不留半成品单据，申请单也不回写。
  postStockEntries(
    activeLines.map(({ line, actualQty }) => ({
      logicalWarehouse: request.warehouse,
      product: line.product,
      instantDelta: actualQty,
    })),
    {
      eventType: 'result_in',
      sourceType: '其他入库单',
      sourceNo: inboundNo,
      businessType: request.businessType,
      operator: '系统',
      time: actualInboundTime,
    },
  );

  const inbound = persistOtherInbound({
    id: `other-inbound-${Date.now()}`,
    inboundNo,
    sourceType: 'request',
    sourceRequestId: request.id,
    sourceRequestNo: request.requestNo,
    sourceSystem: '',
    sourceNo: '',
    warehouse: request.warehouse,
    businessType: request.businessType,
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    actualInboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualInboundTime,
    creator: '系统',
    createdAt: actualInboundTime,
    updater: '系统',
    updatedAt: actualInboundTime,
    demoMock: Boolean(receiptPayload.demoMock),
    lines: activeLines.map(({ line, index, actualQty }) => ({
      id: `other-inbound-line-${Date.now()}-${index + 1}`,
      sourceRequestLineId: line.id,
      sourceInboundLine: `${request.requestNo} 第${index + 1}行`,
      product: line.product,
      quantity: actualQty,
    })),
  });

  simulateKingdeePush(inbound.id);
  return inbound;
}

/**
 * Demo：仓库主动回传生成其他入库单（弹窗与Mock §3）。
 * 归属依据不足（未选逻辑仓、逻辑仓下无对应商品库存行）时不生成、不记账、不推金蝶。
 */
export function createOtherInboundFromWarehousePush(form = {}) {
  const warehouse = form.warehouse || '';
  if (!warehouse) throw new Error('归属依据不足，无法确定入库逻辑仓，未生成入库单');
  if (!otherInboundBusinessTypes.includes(form.businessType)) {
    throw new Error('所选业务类型不可用');
  }
  const sourceNo = String(form.sourceNo || '').trim();
  if (!sourceNo) throw new Error('请输入来源单号');

  const lines = (form.lines || []).filter((line) => line.product);
  if (!lines.length) throw new Error('请至少录入一行商品与数量');
  lines.forEach((line, index) => {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`第${index + 1}行数量须为正整数`);
    }
  });
  if (lines.some((line) => !getStockRow(warehouse, line.product))) {
    // 归属依据已明确（仓库、商品、业务类型均有值）时按需建行；只有选不出仓或商品才按归属不足阻断。
    lines.forEach((line) => ensureStockRow(warehouse, line.product, form.time || nowStamp()));
  }

  const actualInboundTime = form.time || nowStamp();
  const inboundNo = nextOtherInboundNo(String(actualInboundTime).slice(0, 10));

  postStockEntries(
    lines.map((line) => ({
      logicalWarehouse: warehouse,
      product: line.product,
      instantDelta: Number(line.quantity),
    })),
    {
      eventType: 'result_in',
      sourceType: '其他入库单',
      sourceNo: inboundNo,
      businessType: form.businessType,
      operator: '系统',
      time: actualInboundTime,
    },
  );

  const inbound = persistOtherInbound({
    id: `other-inbound-${Date.now()}`,
    inboundNo,
    sourceType: 'warehouse_push',
    sourceRequestId: '',
    sourceRequestNo: '',
    sourceSystem: String(form.sourceSystem || '').trim() || 'WMS',
    sourceNo,
    warehouse,
    businessType: form.businessType,
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    actualInboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualInboundTime,
    creator: '系统',
    createdAt: actualInboundTime,
    updater: '系统',
    updatedAt: actualInboundTime,
    demoMock: true,
    lines: lines.map((line, index) => ({
      id: `other-inbound-line-${Date.now()}-${index + 1}`,
      sourceRequestLineId: '',
      sourceInboundLine: '',
      product: line.product,
      quantity: Number(line.quantity),
    })),
  });

  simulateKingdeePush(inbound.id);
  return inbound;
}

/** 详情页操作日志（Demo 演示记录，按时间倒序）。 */
export function buildOtherInboundOperationLogs(row) {
  const entries = [];
  if (!row) return entries;

  if (row.createdAt) {
    entries.push({
      id: `generate-${row.createdAt}`,
      time: row.createdAt,
      operator: row.creator || '系统',
      action: '生成',
      remark: row.sourceType === 'warehouse_push' ? '仓库主动回传自动生成' : '申请单回传实收自动生成',
    });
  }
  if (row.auditTime) {
    entries.push({
      id: `audit-${row.auditTime}`,
      time: row.auditTime,
      operator: row.auditor || '系统',
      action: '审核',
      remark: '自动审核通过并增加逻辑仓即时库存',
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
