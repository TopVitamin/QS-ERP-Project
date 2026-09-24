/**
 * 直接调拨单模块逻辑（第3层结果单／人工一步式一层结果单）。
 *
 * 业务规则依据《直接调拨单主PRD》§6.4 状态—功能矩阵、§6.5 状态流转表与 R01～R12；
 * 字段与枚举依据《直接调拨单（详细稿）》。
 *
 * 记账口径（《直接调拨单主PRD》§7.3）：
 * - 调出端：调出仓即时减、在途加，并消耗实出对应预占、释放未发部分（预占执行点归调出通知单）；
 * - 调入端：在途减、接收仓即时加；
 * - 人工一步式与仓库主动回传：来源逻辑仓减、目标逻辑仓加，不涉及预占；
 * - 记账统一走 `postStockEntries`，任一行校验不过整批不生效（不允许负库存）。
 */
import { skuOptions } from '../data/masterData.js';
import { isTransitLogicalWarehouse } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import {
  getAvailableStock,
  getStockRow,
  nowStamp,
  persistStockRow,
  postStockEntries,
} from './inventoryStockLogic.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { mergeTransferLogs, pushTransferLogEntry } from './transferOrderLogic.js';

export const DIRECT_TRANSFER_STORAGE_KEY = 'qs-erp:direct-transfers:v1';

/** 虚拟在途仓编码：只用于分步式调拨在途记账，不能被业务单据选为出入库仓（《库存与仓储业务设计》§4.2）。 */
export const TRANSIT_WAREHOUSE_CODE = 'LWH000009';

export const directTransferSourceTypeLabels = {
  step_out: '分步式调出端',
  step_in: '分步式调入端',
  manual: '人工一步式',
  warehouse_callback: '仓库主动回传',
};

export const directTransferAuditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
};

export const kingdeePushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

/** 列表状态列语义色文字（《列表页 Demo PRD》§4.3）。 */
export const directTransferStatusTones = {
  auditStatus: {
    draft: 'text-erp-warning',
    pending: 'text-erp-info',
    approved: 'text-erp-success',
  },
  kingdeePushStatus: {
    un_pushed: 'text-erp-warning',
    pushing: 'text-erp-info',
    push_success: 'text-erp-success',
    push_failed: 'text-erp-danger',
  },
};

/** 详情页头 StatusBadge 语义键。 */
export const directTransferBadgeTones = {
  auditStatus: {
    draft: 'warning',
    pending: 'info',
    approved: 'success',
  },
  kingdeePushStatus: {
    un_pushed: 'warning',
    pushing: 'info',
    push_success: 'success',
    push_failed: 'danger',
  },
};

let directTransferSeedRows = [];

/** 种子数据注册：由 `data/directTransferData.js` 调用。 */
export function registerDirectTransferSeedRows(rows = []) {
  directTransferSeedRows = rows;
}

export function getDirectTransferSeedRows() {
  return directTransferSeedRows;
}

// —— 明细与合计 ——

export function enrichDirectTransferLine(line, index = 0) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  return {
    ...line,
    lineNo: Number(line.lineNo || index + 1),
    productCode: line.productCode || sku.skuCode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '',
    quantity: Number(line.quantity || 0),
  };
}

export function refreshDirectTransferLines(lines = []) {
  return lines.map(enrichDirectTransferLine);
}

export function sumDirectTransferQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function normalizeDirectTransferRow(row) {
  const lines = refreshDirectTransferLines(row.lines || []);
  const time = row.actualTransferTime || row.createdAt || nowStamp();
  return {
    ...row,
    lines,
    totalQuantity: sumDirectTransferQty(lines),
    actualTransferTime: row.actualTransferTime || '',
    businessDate: row.businessDate || String(time).slice(0, 10),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

// —— 读写 ——

export function loadAllDirectTransfers() {
  return readMockRows(DIRECT_TRANSFER_STORAGE_KEY, directTransferSeedRows);
}

export function loadDirectTransferById(id) {
  if (!id) return null;
  return loadAllDirectTransfers().find((row) => row.id === id) || null;
}

export function loadDirectTransferByNo(transferNo) {
  if (!transferNo) return null;
  return loadAllDirectTransfers().find((row) => row.transferNo === transferNo) || null;
}

export function loadDirectTransfersByOrderId(orderId, orderNo) {
  return loadAllDirectTransfers()
    .filter((row) => row.sourceOrderId === orderId || (orderNo && row.sourceOrderNo === orderNo))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function loadDirectTransfersByNoticeId(noticeId, noticeNo) {
  return loadAllDirectTransfers()
    .filter((row) => row.sourceNoticeId === noticeId || (noticeNo && row.sourceNoticeNo === noticeNo))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function persistDirectTransfer(row) {
  const next = normalizeDirectTransferRow(row);
  upsertMockRow(DIRECT_TRANSFER_STORAGE_KEY, next);
  return next;
}

export function removeDirectTransfer(id) {
  writeMockRows(
    DIRECT_TRANSFER_STORAGE_KEY,
    loadAllDirectTransfers().filter((row) => row.id !== id),
  );
}

/** 人工一步式保存草稿时分配单号，前缀 ZJDB（R01）；自动生成的结果单在生成时分配。 */
export function generateDirectTransferNo(date) {
  return nextDocumentNo('ZJDB', date || nowStamp().slice(0, 10), loadAllDirectTransfers().map((row) => row.transferNo));
}

// —— 状态判定（主PRD §6.4；不满足条件的按钮直接隐藏）——

export function canEditDirectTransfer(row) {
  return row?.auditStatus === 'draft' && row?.sourceType === 'manual';
}

export function canSubmitDirectTransfer(row) {
  return canEditDirectTransfer(row);
}

export function canDeleteDirectTransfer(row) {
  return canEditDirectTransfer(row);
}

export function canApproveDirectTransfer(row) {
  return row?.auditStatus === 'pending' && row?.sourceType === 'manual';
}

export function canWithdrawDirectTransfer(row) {
  return canApproveDirectTransfer(row);
}

/**
 * 金蝶推送失败后在系统集成中心针对原单重推（R09）；本模块列表与详情不提供重推按钮，
 * 这里显式返回 false，避免后续误加结果单重推入口。
 */
export function canRetryPushDirectTransfer() {
  return false;
}

// —— 校验（文案按《直接调拨单前端Demo版PRD_新增编辑页》§4）——

export function validateDirectTransferWarehouses(fromWarehouse, toWarehouse) {
  if (!fromWarehouse) return '请选择来源逻辑仓';
  if (!toWarehouse) return '请选择目标逻辑仓';
  if (fromWarehouse === toWarehouse) return '目标逻辑仓不能与来源逻辑仓相同';
  if (isTransitLogicalWarehouse(fromWarehouse) || isTransitLogicalWarehouse(toWarehouse)) {
    return '虚拟在途仓不能作为人工一步式的来源或目标逻辑仓';
  }
  return null;
}

export function validateDirectTransferLineQty(lines = []) {
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return '实际调拨数量须为大于0的整数';
  }
  return null;
}

/** 保存：来源仓、目标仓已选且不相同、均非在途仓；草稿允许明细为空，已填行须为正整数（R02、R03）。 */
export function validateDirectTransferForSave(form) {
  const warehouseError = validateDirectTransferWarehouses(form?.fromWarehouse, form?.toWarehouse);
  if (warehouseError) return { message: warehouseError };
  const filled = (form?.lines || []).filter((line) => line.product);
  const qtyError = validateDirectTransferLineQty(filled);
  if (qtyError) return { message: qtyError };
  return null;
}

/** 提交：保存口径 + 至少一行明细且每行实际调拨数量>0（R08）。 */
export function validateDirectTransferForSubmit(form) {
  const saveError = validateDirectTransferForSave(form);
  if (saveError) return saveError;
  const validLines = (form?.lines || []).filter((line) => line.product && Number(line.quantity) > 0);
  if (!validLines.length) return { message: '请至少添加一行有效商品明细' };
  return null;
}

// —— 记账 ——

/** 结果单记账前保证库存行存在：接收仓、虚拟在途仓可能还没有该商品的库存行。 */
export function ensureStockRow(logicalWarehouse, product, time) {
  if (!logicalWarehouse || !product) return null;
  if (getStockRow(logicalWarehouse, product)) return null;
  return persistStockRow({
    id: `stock-${logicalWarehouse}-${product}`,
    logicalWarehouse,
    product,
    instantQty: 0,
    reservedQty: 0,
    frozenQty: 0,
    updatedAt: time || nowStamp(),
  });
}

function postTransferEntries(entries, meta) {
  try {
    return postStockEntries(entries, meta);
  } catch (error) {
    if (/库存不足|负库存|预占/.test(String(error?.message || ''))) {
      throw new Error('库存不足，不允许负库存');
    }
    throw error;
  }
}

/**
 * 调出端记账：调出仓即时减、消耗实出预占并释放未发部分；在途仓即时加。
 * 两条流水行共用同一 sourceNo（直接调拨单号），按行方向分别记 result_out／result_in
 * （与库存流水种子 flow-001／flow-002 的「在途增加记入库、调出仓减少记出库」口径一致）。
 */
export function postOutDirectTransfer(transferRow, noticeRow, { time } = {}) {
  const stamp = time || nowStamp();
  const entries = [];
  (transferRow.lines || []).forEach((line) => {
    const noticeLine = (noticeRow?.lines || []).find((item) => item.id === line.sourceNoticeLineId) || {};
    const actualQty = Number(line.quantity || 0);
    const plannedQty = Number(noticeLine.quantity || 0);
    entries.push({
      logicalWarehouse: transferRow.fromWarehouse,
      product: line.product,
      instantDelta: -actualQty,
      consumeReserved: actualQty,
      releaseReserved: Math.max(0, plannedQty - actualQty),
      reservationSourceNo: noticeRow?.sourceOrderNo,
      reservationSourceLineNo: Number(line.sourceOrderLineNo || 1),
    });
  });
  // 实出为 0 的行不在结果单里，但同样要释放该行未执行的预占（主PRD R08：消耗实出、释放未发）
  (noticeRow?.lines || [])
    .filter((line) => Number(line.actualQty || 0) <= 0)
    .forEach((line) => {
      entries.push({
        logicalWarehouse: transferRow.fromWarehouse,
        product: line.product,
        instantDelta: 0,
        consumeReserved: 0,
        releaseReserved: Number(line.quantity || 0),
        reservationSourceNo: noticeRow?.sourceOrderNo,
        reservationSourceLineNo: Number(line.sourceOrderLineNo || 1),
      });
    });
  if (!entries.length) return [];

  (transferRow.lines || []).forEach((line) => ensureStockRow(TRANSIT_WAREHOUSE_CODE, line.product, stamp));

  const outFlows = postTransferEntries(entries, {
    eventType: 'result_out',
    sourceType: '直接调拨单',
    sourceNo: transferRow.transferNo,
    businessType: '',
    operator: '系统',
    time: stamp,
  });
  const inFlows = postTransferEntries(
    (transferRow.lines || []).map((line) => ({
      logicalWarehouse: TRANSIT_WAREHOUSE_CODE,
      product: line.product,
      instantDelta: Number(line.quantity || 0),
    })),
    {
      eventType: 'result_in',
      sourceType: '直接调拨单',
      sourceNo: transferRow.transferNo,
      businessType: '',
      operator: '系统',
      time: stamp,
    },
  );
  return [...outFlows, ...inFlows];
}

/** 调入端记账：在途仓即时减、接收仓即时加；少收差额继续留在途。 */
export function postInDirectTransfer(transferRow, { time } = {}) {
  const stamp = time || nowStamp();
  const lines = transferRow.lines || [];
  if (!lines.length) return [];

  lines.forEach((line) => ensureStockRow(transferRow.toWarehouse, line.product, stamp));

  const outFlows = postTransferEntries(
    lines.map((line) => ({
      logicalWarehouse: transferRow.fromWarehouse,
      product: line.product,
      instantDelta: -Number(line.quantity || 0),
    })),
    {
      eventType: 'result_out',
      sourceType: '直接调拨单',
      sourceNo: transferRow.transferNo,
      businessType: '',
      operator: '系统',
      time: stamp,
    },
  );
  const inFlows = postTransferEntries(
    lines.map((line) => ({
      logicalWarehouse: transferRow.toWarehouse,
      product: line.product,
      instantDelta: Number(line.quantity || 0),
    })),
    {
      eventType: 'result_in',
      sourceType: '直接调拨单',
      sourceNo: transferRow.transferNo,
      businessType: '',
      operator: '系统',
      time: stamp,
    },
  );
  return [...outFlows, ...inFlows];
}

/** 人工一步式／仓库主动回传记账：来源逻辑仓减、目标逻辑仓加，不涉及预占。 */
export function postManualDirectTransfer(transferRow, { operator = '当前用户', time } = {}) {
  const stamp = time || nowStamp();
  const lines = transferRow.lines || [];
  if (!lines.length) return [];

  lines.forEach((line) => {
    if (getAvailableStock(transferRow.fromWarehouse, line.product) < Number(line.quantity || 0)) {
      throw new Error('库存不足，不允许负库存');
    }
  });
  lines.forEach((line) => ensureStockRow(transferRow.toWarehouse, line.product, stamp));

  const outFlows = postTransferEntries(
    lines.map((line) => ({
      logicalWarehouse: transferRow.fromWarehouse,
      product: line.product,
      instantDelta: -Number(line.quantity || 0),
    })),
    {
      eventType: 'result_out',
      sourceType: '直接调拨单',
      sourceNo: transferRow.transferNo,
      businessType: '',
      operator,
      time: stamp,
    },
  );
  const inFlows = postTransferEntries(
    lines.map((line) => ({
      logicalWarehouse: transferRow.toWarehouse,
      product: line.product,
      instantDelta: Number(line.quantity || 0),
    })),
    {
      eventType: 'result_in',
      sourceType: '直接调拨单',
      sourceNo: transferRow.transferNo,
      businessType: '',
      operator,
      time: stamp,
    },
  );
  return [...outFlows, ...inFlows];
}

// —— 金蝶推送（Demo 模拟；正式重推入口在系统集成中心）——

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

function clearKingdeeTimer(transferId) {
  const timer = kingdeeTimers.get(transferId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(transferId);
  }
}

function scheduleKingdeeAttempt(transferId, attempt = 1, forceFail = false) {
  clearKingdeeTimer(transferId);
  const current = loadDirectTransferById(transferId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  persistDirectTransfer({ ...current, kingdeePushStatus: 'pushing' });

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(transferId);
    const latest = loadDirectTransferById(transferId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    if (forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX) {
      persistDirectTransfer({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail) {
      persistDirectTransfer({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(transferId, attempt + 1, true);
      return;
    }

    persistDirectTransfer({
      ...latest,
      kingdeePushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(transferId, timer);
  return loadDirectTransferById(transferId);
}

/** Demo 模拟金蝶推送：未推送→推送中→推送成功；forceFail 时自动重试最多3次后保持推送失败。 */
export function simulateKingdeePush(transferId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(transferId, 1, forceFail);
}

// —— 人工一步式：新增、编辑、提交、撤回、审核、删除 ——

export function createDirectTransfer(form, { operator = '当前用户', time } = {}) {
  const error = validateDirectTransferForSave(form);
  if (error) throw new Error(error.message);
  const stamp = time || nowStamp();
  const lines = refreshDirectTransferLines(form.lines || []).map((line, index) => ({ ...line, lineNo: index + 1 }));
  return persistDirectTransfer({
    id: `direct-transfer-${Date.now()}`,
    transferNo: form.transferNo && form.transferNo !== '保存后自动生成' ? form.transferNo : generateDirectTransferNo(),
    sourceType: 'manual',
    sourceOrderId: '',
    sourceOrderNo: '',
    sourceNoticeId: '',
    sourceNoticeNo: '',
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: form.fromWarehouse || '',
    toWarehouse: form.toWarehouse || '',
    actualTransferTime: '',
    businessDate: stamp.slice(0, 10),
    remark: form.remark || '',
    auditStatus: 'draft',
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: '',
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: operator,
    createdAt: stamp,
    updater: operator,
    updatedAt: stamp,
    lines,
  });
}

export function updateDirectTransfer(row, form, { operator = '当前用户', time } = {}) {
  const stamp = time || nowStamp();
  const lines = refreshDirectTransferLines(form.lines || []).map((line, index) => ({ ...line, lineNo: index + 1 }));
  return persistDirectTransfer({
    ...row,
    transferNo: form.transferNo && form.transferNo !== '保存后自动生成' ? form.transferNo : row.transferNo,
    fromWarehouse: form.fromWarehouse || '',
    toWarehouse: form.toWarehouse || '',
    remark: form.remark || '',
    lines,
    updater: operator,
    updatedAt: stamp,
  });
}

export function applySubmitDirectTransfer(row, { operator = '当前用户', time } = {}) {
  if (!canSubmitDirectTransfer(row)) throw new Error('当前单据状态不可提交，请刷新后重试');
  const stamp = time || nowStamp();
  return persistDirectTransfer({
    ...row,
    auditStatus: 'pending',
    updater: operator,
    updatedAt: stamp,
  });
}

export function applyWithdrawDirectTransfer(row, comment, { operator = '当前用户', time } = {}) {
  if (!canWithdrawDirectTransfer(row)) throw new Error('当前单据状态不可撤回，请刷新后重试');
  const stamp = time || nowStamp();
  return persistDirectTransfer({
    ...row,
    auditStatus: 'draft',
    returnComment: comment || '',
    returnedAt: stamp,
    returnOperator: operator,
    updater: operator,
    updatedAt: stamp,
  });
}

export function applyDeleteDirectTransfer(row) {
  removeDirectTransfer(row.id);
}

/** 人工一步式审核：一减一增记账、写库存流水，然后触发金蝶推送（R04、R05、R06、R09）。 */
export function applyApproveDirectTransfer(row, { operator = '当前用户', time } = {}) {
  const transfer = loadDirectTransferById(row?.id) || row;
  if (transfer.sourceType !== 'manual') throw new Error('自动生成的结果单不支持审核');
  // 只允许人工一步式的「待审核」审核；重复调用不得二次记账（§6.4、§11.2）
  if (!canApproveDirectTransfer(transfer)) throw new Error('当前单据状态不可审核，请刷新后重试');
  const warehouseError = validateDirectTransferWarehouses(transfer.fromWarehouse, transfer.toWarehouse);
  if (warehouseError) throw new Error(warehouseError);
  const qtyError = validateDirectTransferLineQty(transfer.lines || []);
  if (qtyError) throw new Error(qtyError);

  const stamp = time || nowStamp();
  postManualDirectTransfer(transfer, { operator, time: stamp });

  const approved = persistDirectTransfer({
    ...transfer,
    auditStatus: 'approved',
    auditor: operator,
    auditTime: stamp,
    actualTransferTime: stamp,
    businessDate: stamp.slice(0, 10),
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    updater: operator,
    updatedAt: stamp,
  });
  simulateKingdeePush(approved.id);
  return approved;
}

// —— 由通知单回传自动生成（分步式两端；创建即已审核）——

function buildOutTransferLines(noticeRow) {
  return refreshDirectTransferLines(
    (noticeRow?.lines || [])
      .filter((line) => Number(line.actualQty || 0) > 0)
      .map((line, index) => ({
        id: `${noticeRow.id}-out-line-${index + 1}`,
        lineNo: index + 1,
        sourceNoticeLineId: line.id,
        sourceNoticeLine: `${noticeRow.noticeNo} 行${line.lineNo}`,
        sourceOrderLineId: line.sourceOrderLineId,
        sourceOrderLineNo: line.sourceOrderLineNo,
        product: line.product,
        quantity: Number(line.actualQty || 0),
      })),
  );
}

function buildInTransferLines(inNoticeRow) {
  return refreshDirectTransferLines(
    (inNoticeRow?.lines || [])
      .filter((line) => Number(line.actualQty || 0) > 0)
      .map((line, index) => ({
        id: `${inNoticeRow.id}-in-line-${index + 1}`,
        lineNo: index + 1,
        sourceNoticeLineId: line.id,
        sourceNoticeLine: `${inNoticeRow.noticeNo} 行${line.lineNo}`,
        sourceOrderLineId: line.sourceOrderLineId,
        sourceOrderLineNo: line.sourceOrderLineNo,
        product: line.product,
        quantity: Number(line.actualQty || 0),
      })),
  );
}

/**
 * 调出端结果单：调出通知单回传实出>0 时生成，创建即已审核；
 * 记账含调出仓减少、预占消耗与未发释放、在途增加（R07、记账口径）。
 */
export function generateDirectTransferFromOutNotice(noticeRow) {
  if (!noticeRow) return null;
  const existing = loadDirectTransfersByNoticeId(noticeRow.id, noticeRow.noticeNo)
    .find((row) => row.sourceType === 'step_out');
  if (existing) return existing;

  const lines = buildOutTransferLines(noticeRow);
  if (!lines.length) return null;

  const stamp = noticeRow.finalShipTime || nowStamp();
  const transferNo = generateDirectTransferNo(String(stamp).slice(0, 10));
  const transfer = {
    id: `direct-transfer-out-${noticeRow.id}`,
    transferNo,
    sourceType: 'step_out',
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: noticeRow.outWarehouse,
    toWarehouse: TRANSIT_WAREHOUSE_CODE,
    actualTransferTime: stamp,
    businessDate: String(stamp).slice(0, 10),
    remark: '',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: stamp,
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: '系统',
    createdAt: stamp,
    updater: '系统',
    updatedAt: stamp,
    lines,
  };

  postOutDirectTransfer(transfer, noticeRow, { time: stamp });
  const persisted = persistDirectTransfer(transfer);
  simulateKingdeePush(persisted.id);
  return persisted;
}

/** 调入端结果单：调入通知单回传实收>0 时生成，创建即已审核；在途减、接收仓加。 */
export function generateDirectTransferFromInNotice(inNoticeRow) {
  if (!inNoticeRow) return null;
  const existing = loadDirectTransfersByNoticeId(inNoticeRow.id, inNoticeRow.noticeNo)
    .find((row) => row.sourceType === 'step_in');
  if (existing) return existing;

  const lines = buildInTransferLines(inNoticeRow);
  if (!lines.length) return null;

  const stamp = inNoticeRow.finalReceiveTime || nowStamp();
  const transferNo = generateDirectTransferNo(String(stamp).slice(0, 10));
  const transfer = {
    id: `direct-transfer-in-${inNoticeRow.id}`,
    transferNo,
    sourceType: 'step_in',
    sourceOrderId: inNoticeRow.sourceOrderId,
    sourceOrderNo: inNoticeRow.sourceOrderNo,
    sourceNoticeId: inNoticeRow.id,
    sourceNoticeNo: inNoticeRow.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: TRANSIT_WAREHOUSE_CODE,
    toWarehouse: inNoticeRow.inWarehouse,
    actualTransferTime: stamp,
    businessDate: String(stamp).slice(0, 10),
    remark: '',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: stamp,
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: '系统',
    createdAt: stamp,
    updater: '系统',
    updatedAt: stamp,
    lines,
  };

  postInDirectTransfer(transfer, { time: stamp });
  const persisted = persistDirectTransfer(transfer);
  simulateKingdeePush(persisted.id);
  return persisted;
}

/** 仓库主动回传（Demo）：仓库已完成的品质调整，校验通过后直接生成已审核结果单（R10）。 */
export function createDirectTransferFromWarehouseCallback(form, { operator = '系统', time } = {}) {
  const warehouseError = validateDirectTransferWarehouses(form?.fromWarehouse, form?.toWarehouse);
  if (warehouseError) {
    throw new Error('归属依据不足，无法确定记入逻辑仓，未生成直接调拨单');
  }
  const lines = refreshDirectTransferLines(
    (form?.lines || [])
      .filter((line) => line.product && Number(line.quantity) > 0)
      .map((line, index) => ({ ...line, id: `callback-line-${index + 1}`, lineNo: index + 1, quantity: Number(line.quantity) })),
  );
  if (!lines.length) throw new Error('归属依据不足，无法确定记入逻辑仓，未生成直接调拨单');

  const stamp = time || nowStamp();
  const transfer = {
    id: `direct-transfer-callback-${Date.now()}`,
    transferNo: generateDirectTransferNo(stamp.slice(0, 10)),
    sourceType: 'warehouse_callback',
    sourceOrderId: '',
    sourceOrderNo: '',
    sourceNoticeId: '',
    sourceNoticeNo: '',
    sourceSystem: form.sourceSystem || '',
    sourceNo: form.sourceNo || '',
    fromWarehouse: form.fromWarehouse,
    toWarehouse: form.toWarehouse,
    actualTransferTime: stamp,
    businessDate: stamp.slice(0, 10),
    remark: form.remark || '',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: stamp,
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: '系统',
    createdAt: stamp,
    updater: '系统',
    updatedAt: stamp,
    lines,
  };

  postManualDirectTransfer(transfer, { operator, time: stamp });
  const persisted = persistDirectTransfer(transfer);
  simulateKingdeePush(persisted.id);
  return persisted;
}

// —— 种子构造 ——

export function buildDirectTransferSeedFromOutNotice(noticeRow, plan = {}) {
  const lines = buildOutTransferLines(noticeRow);
  const time = plan.time || noticeRow.finalShipTime || noticeRow.createdAt || nowStamp();
  const pushStatus = plan.kingdeePushStatus || 'push_success';
  return normalizeDirectTransferRow({
    id: plan.id || `direct-transfer-seed-out-${noticeRow.id}`,
    transferNo: plan.transferNo,
    sourceType: 'step_out',
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: noticeRow.outWarehouse,
    toWarehouse: TRANSIT_WAREHOUSE_CODE,
    actualTransferTime: time,
    businessDate: String(time).slice(0, 10),
    remark: '',
    auditStatus: 'approved',
    kingdeePushStatus: pushStatus,
    pushTime: pushStatus === 'push_success' ? time : '',
    pushFailReason: plan.pushFailReason || (pushStatus === 'push_failed' ? '接口超时，金蝶未确认接收' : ''),
    auditor: '',
    auditTime: time,
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: '系统',
    createdAt: time,
    updater: '系统',
    updatedAt: time,
    lines,
  });
}

export function buildDirectTransferSeedFromInNotice(inNoticeRow, plan = {}) {
  const lines = buildInTransferLines(inNoticeRow);
  const time = plan.time || inNoticeRow.finalReceiveTime || inNoticeRow.createdAt || nowStamp();
  const pushStatus = plan.kingdeePushStatus || 'push_success';
  return normalizeDirectTransferRow({
    id: plan.id || `direct-transfer-seed-in-${inNoticeRow.id}`,
    transferNo: plan.transferNo,
    sourceType: 'step_in',
    sourceOrderId: inNoticeRow.sourceOrderId,
    sourceOrderNo: inNoticeRow.sourceOrderNo,
    sourceNoticeId: inNoticeRow.id,
    sourceNoticeNo: inNoticeRow.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: TRANSIT_WAREHOUSE_CODE,
    toWarehouse: inNoticeRow.inWarehouse,
    actualTransferTime: time,
    businessDate: String(time).slice(0, 10),
    remark: '',
    auditStatus: 'approved',
    kingdeePushStatus: pushStatus,
    pushTime: pushStatus === 'push_success' ? time : '',
    pushFailReason: plan.pushFailReason || (pushStatus === 'push_failed' ? '接口超时，金蝶未确认接收' : ''),
    auditor: '',
    auditTime: time,
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: '系统',
    createdAt: time,
    updater: '系统',
    updatedAt: time,
    lines,
  });
}

/** 人工一步式种子：草稿、待审核、已审核各按自身状态构造。 */
export function buildDirectTransferSeedManual(raw, index = 0) {
  const lines = refreshDirectTransferLines((raw.lines || []).map((line, lineIndex) => ({
    ...line,
    id: `${raw.transferNo}-line-${lineIndex + 1}`,
    lineNo: lineIndex + 1,
  })));
  return normalizeDirectTransferRow({
    ...raw,
    id: raw.id || `direct-transfer-seed-manual-${index + 1}`,
    sourceType: 'manual',
    sourceOrderId: '',
    sourceOrderNo: '',
    sourceNoticeId: '',
    sourceNoticeNo: '',
    sourceSystem: '',
    sourceNo: '',
    remark: raw.remark || '',
    returnComment: raw.returnComment || '',
    returnedAt: raw.returnedAt || '',
    returnOperator: raw.returnOperator || '',
    pushTime: raw.pushTime || '',
    pushFailReason: raw.pushFailReason || '',
    lines,
  });
}

/** 仓库主动回传种子：已审核结果单，带来源系统与来源单号。 */
export function buildDirectTransferSeedCallback(raw, index = 0) {
  const lines = refreshDirectTransferLines((raw.lines || []).map((line, lineIndex) => ({
    ...line,
    id: `${raw.transferNo}-line-${lineIndex + 1}`,
    lineNo: lineIndex + 1,
  })));
  return normalizeDirectTransferRow({
    ...raw,
    id: raw.id || `direct-transfer-seed-callback-${index + 1}`,
    sourceType: 'warehouse_callback',
    sourceOrderId: '',
    sourceOrderNo: '',
    sourceNoticeId: '',
    sourceNoticeNo: '',
    auditor: raw.auditor || '',
    lines,
  });
}

// —— 操作日志 ——

export function buildDirectTransferOperationLogs(row) {
  const entries = [];
  pushTransferLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator || '系统',
    action: '生成',
    remark: row.sourceType === 'manual' ? '人工创建直接调拨单' : '根据仓库回传生成直接调拨单',
  });
  if (row.auditStatus === 'pending' || row.auditStatus === 'approved') {
    pushTransferLogEntry(entries, {
      time: row.auditTime || row.updatedAt,
      operator: row.auditor || '系统',
      action: '审核',
      remark: row.auditor ? '审核通过，库存已生效' : '自动审核通过，库存已生效',
    });
  }
  if (row.returnComment) {
    pushTransferLogEntry(entries, {
      time: row.returnedAt,
      operator: row.returnOperator,
      action: '撤回',
      remark: row.returnComment,
    });
  }
  if (row.pushTime) {
    pushTransferLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送金蝶',
      remark: row.pushFailReason
        ? `推送失败：${row.pushFailReason}`
        : (kingdeePushStatusLabels[row.kingdeePushStatus] || '推送金蝶'),
    });
  }
  return mergeTransferLogs(entries, row.operationLogs || []);
}
