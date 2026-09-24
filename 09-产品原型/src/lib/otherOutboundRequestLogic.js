/**
 * 其他出库申请单：单据状态、动作条件、预占处理与 Demo Mock 回传。
 *
 * 依据《其他出库申请单主PRD》§6（状态—功能矩阵、状态流转表）与 §7（R01～R22）；
 * 预占口径见《预占与冻结主PRD》：审核按可用量占用、实出消耗、缺量与取消释放，
 * 预占的占用与释放不记库存流水（主PRD §7.3），因此释放不走 `postStockEntries`。
 * 结果单记账统一走 `otherOutboundLogic.generateOtherOutboundFromRequest`（内部调用 `postStockEntries`）。
 */
import { otherOutboundBusinessTypeLabels } from '../data/inventoryStockData.js';
import { skuOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions, isTransitLogicalWarehouse } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import { emptyFieldMessage } from './formValidation.js';
import {
  getAvailableStock,
  loadReservations,
  loadStockRows,
  nowStamp,
  persistReservations,
  persistStockRows,
  reserveStock,
} from './inventoryStockLogic.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { generateOtherOutboundFromRequest } from './otherOutboundLogic.js';

export const OTHER_OUTBOUND_REQUEST_STORAGE_KEY = 'qs-erp:other-outbound-requests:v1';

/** 单据状态（主PRD §6.1）：一个字段串起审核、推送与执行；不出现收货类取值。 */
export const otherOutboundRequestStatusLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  push_failed: '推送失败',
  pending_delivery: '待发货',
  cancelling: '取消中',
  cancelled: '已取消',
  delivered: '已发货',
};

/** StatusBadge 语义色：草稿→warning、待审核/已审核/待发货→info、推送失败→danger、取消中→warning、已取消→neutral、已发货→success。 */
export const otherOutboundRequestStatusTones = {
  draft: 'warning',
  pending: 'info',
  approved: 'info',
  push_failed: 'danger',
  pending_delivery: 'info',
  cancelling: 'warning',
  cancelled: 'neutral',
  delivered: 'success',
};

/** 列表状态列的文字语义色（列表不用 StatusBadge）。 */
const statusTextToneMap = {
  draft: 'text-erp-warning',
  pending: 'text-erp-info',
  approved: 'text-erp-info',
  push_failed: 'text-erp-danger',
  pending_delivery: 'text-erp-info',
  cancelling: 'text-erp-warning',
  cancelled: 'text-erp-text-muted',
  delivered: 'text-erp-success',
};

export function resolveOtherOutboundRequestStatusTone(status) {
  return statusTextToneMap[status] || 'text-erp-text';
}

/** 业务类型枚举（2026-09-23 已定）：盘亏、样品领用、赠送、报废、借出；库存流水的业务类型同样记中文取值。 */
export const otherOutboundBusinessTypeOptions = Object.values(otherOutboundBusinessTypeLabels)
  .map((label) => ({ value: label, label }));

/**
 * 建单可选业务类型（2026-09-24确认）：
 * 盘亏由仓库盘点回传形成结果单，普通出库仓不建单；只有出库仓为虚拟在途仓（分步式调拨少收差异）时可选盘亏。
 */
export const OTHER_OUTBOUND_TRANSIT_ONLY_TYPE = '盘亏';

export function buildOtherOutboundRequestBusinessTypeOptions(form) {
  const allowLoss = isTransitLogicalWarehouse(form?.logicalWarehouse);
  return otherOutboundBusinessTypeOptions.filter((option) => allowLoss || option.value !== OTHER_OUTBOUND_TRANSIT_ONLY_TYPE);
}

export function isTransitWriteOffBusinessType(businessType) {
  return businessType === OTHER_OUTBOUND_TRANSIT_ONLY_TYPE;
}

const SOURCE_TYPE_LABEL = '其他出库申请单';
const SEED_RESERVATION_STATUSES = new Set(['approved', 'push_failed', 'pending_delivery', 'cancelling']);

// —— 明细与行 ——

let requestLineSequence = 0;

export function createOtherOutboundRequestLine(overrides = {}) {
  return {
    id: `other-outbound-request-line-${Date.now()}-${requestLineSequence++}`,
    product: '',
    productCode: '',
    productName: '',
    unit: '个',
    quantity: '',
    ...overrides,
  };
}

export function createOtherOutboundRequestLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  return createOtherOutboundRequestLine({
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    unit: sku?.unit && sku.unit !== '-' ? sku.unit : template?.unit || '个',
    quantity: sameSku ? template?.quantity ?? '' : '',
  });
}

/**
 * 明细行补齐：商品信息随商品带出，未出数量＝申请出库数量−实出数量。
 * 实出数量由结果单回写，最终结果未确认前留空（页面显示 `-`），此时未出按计划数量展示（主PRD R13）。
 */
export function enrichOutboundRequestLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  const quantity = Number(line.quantity || 0);
  const hasActual = line.actualQty !== '' && line.actualQty != null;
  const actualQty = hasActual ? Number(line.actualQty || 0) : null;
  return {
    ...line,
    productCode: line.productCode || sku.skuCode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '个',
    quantity,
    actualQty,
    remainingQty: Math.max(0, quantity - (actualQty || 0)),
  };
}

/** 行号按当前顺序重排，保证预占来源行与页面行号一致。 */
export function refreshOutboundRequestLines(lines = []) {
  return lines.map((line, index) => ({ ...enrichOutboundRequestLine(line), lineNo: index + 1 }));
}

export function sumOutboundRequestLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

/** 实出合计：所有行都未确认时返回 null，页面显示 `-`（主PRD R13）。 */
export function sumOutboundRequestActualQty(lines = []) {
  const confirmed = (lines || []).some((line) => line.actualQty != null);
  if (!confirmed) return null;
  return sumOutboundRequestLineQty(lines, 'actualQty');
}

export function normalizeOtherOutboundRequestRow(row) {
  const lines = refreshOutboundRequestLines(row.lines || []);
  return {
    ...row,
    lines,
    totalQuantity: sumOutboundRequestLineQty(lines, 'quantity'),
    totalActualQty: sumOutboundRequestActualQty(lines),
    totalRemainingQty: sumOutboundRequestLineQty(lines, 'remainingQty'),
    pushTime: row.pushTime || '',
    pushFailReason: row.pushFailReason || '',
    cancelReason: row.cancelReason || '',
    cancelOperator: row.cancelOperator || '',
    cancelTime: row.cancelTime || '',
    auditor: row.auditor || '',
    auditTime: row.auditTime || '',
    withdrawComment: row.withdrawComment || '',
    withdrawTime: row.withdrawTime || '',
  };
}

export function persistOtherOutboundRequest(row) {
  const next = normalizeOtherOutboundRequestRow({ ...row, updatedAt: row.updatedAt || nowStamp() });
  upsertMockRow(OTHER_OUTBOUND_REQUEST_STORAGE_KEY, next);
  return next;
}

export function loadAllOtherOutboundRequests(seed = []) {
  return readMockRows(OTHER_OUTBOUND_REQUEST_STORAGE_KEY, seed);
}

export function loadOtherOutboundRequestById(id, seed = []) {
  return loadAllOtherOutboundRequests(seed).find((row) => row.id === id) || null;
}

export function loadOtherOutboundRequestByNo(requestNo, seed = []) {
  return loadAllOtherOutboundRequests(seed).find((row) => row.requestNo === requestNo) || null;
}

export function deleteOtherOutboundRequest(id) {
  writeMockRows(
    OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
    loadAllOtherOutboundRequests([]).filter((row) => row.id !== id),
  );
}

// —— 状态—功能矩阵（主PRD §6.4、Demo 列表页 §6.1）——

export function canEditRequest(row) {
  return row?.status === 'draft';
}

export function canSubmitRequest(row) {
  return row?.status === 'draft';
}

export function canDeleteRequest(row) {
  return row?.status === 'draft';
}

export function canApproveRequest(row) {
  return row?.status === 'pending';
}

export function canWithdrawRequest(row) {
  return row?.status === 'pending';
}

/** 待审核可直接取消（主PRD R16）。 */
export function canCancelPendingRequest(row) {
  return row?.status === 'pending';
}

/** 已审核、推送失败可取消并释放未执行预占（主PRD R17）。 */
export function canCancelApprovedRequest(row) {
  return row?.status === 'approved' || row?.status === 'push_failed';
}

/** 待发货只能申请取消，进入取消中等待仓库回执（主PRD R18）。 */
export function canApplyCancelRequest(row) {
  return row?.status === 'pending_delivery';
}

/** 取消入口：覆盖待审核、已审核、推送失败、待发货四种状态，弹窗正文按状态区分。 */
export function canCancelRequest(row) {
  return canCancelPendingRequest(row) || canCancelApprovedRequest(row) || canApplyCancelRequest(row);
}

export function canRetryPushRequest(row) {
  return row?.status === 'push_failed';
}

/** Demo Mock：仅待发货可模拟仓库回传；在途仓直接记账路径不经过回传（主PRD R20）。 */
export function canMockDeliveryRequest(row) {
  return row?.status === 'pending_delivery';
}

/** Demo Mock：取消中等待仓库回执，用模拟回执演示仓库同意/拒绝（主PRD R18）。 */
export function canMockWarehouseCancelReply(row) {
  return row?.status === 'cancelling';
}

export function isTransitRequest(row) {
  return isTransitLogicalWarehouse(row?.logicalWarehouse);
}

// —— 表单与校验（Demo 新增编辑页 §4）——

export function createEmptyOutboundRequestForm() {
  return {
    requestNo: '保存后自动生成',
    logicalWarehouse: '',
    businessType: '',
    remark: '',
    status: 'draft',
    lines: [createOtherOutboundRequestLine()],
  };
}

export function buildOutboundRequestFormFromRow(row) {
  return {
    ...row,
    remark: row?.remark || '',
    lines: refreshOutboundRequestLines(row?.lines || []).map((line) => ({ ...line })),
  };
}

export function validateOutboundRequestForSave(form) {
  const fieldErrors = {};
  if (!form?.logicalWarehouse) fieldErrors.logicalWarehouse = emptyFieldMessage('出库仓');
  if (!form?.businessType) fieldErrors.businessType = emptyFieldMessage('业务类型');
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  // 盘亏由仓库盘点回传形成结果单，普通出库仓不建单；仅虚拟在途仓的在途差异可按盘亏办理（2026-09-24确认）
  if (isTransitWriteOffBusinessType(form.businessType) && !isTransitLogicalWarehouse(form.logicalWarehouse)) {
    return { fieldErrors: { businessType: '盘亏仅在出库仓为虚拟在途仓时可选；普通出库仓的盘亏由仓库回传形成结果单' } };
  }

  const lines = form.lines || [];
  const touched = lines.filter((line) => line.product || String(line.quantity ?? '').trim() !== '');
  if (!touched.length) return { message: '请至少添加一行有效商品明细' };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const quantityText = String(line.quantity ?? '').trim();
    if (!line.product && !quantityText) continue;
    if (!line.product) return { message: `第${index + 1}行请选择商品` };
    if (quantityText && !Number.isInteger(Number(quantityText))) {
      return { message: `第${index + 1}行申请出库数量须为正整数` };
    }
    if (!(Number(quantityText) > 0)) return { message: `第${index + 1}行申请出库数量必须大于 0` };
  }

  return null;
}

export function validateOutboundRequestForSubmit(form) {
  const base = validateOutboundRequestForSave(form);
  if (base) return base;

  const selectableWarehouses = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true })
    .map((option) => option.value);
  if (!selectableWarehouses.includes(form.logicalWarehouse)) {
    return { fieldErrors: { logicalWarehouse: '所选出库仓不可用' } };
  }
  if (!otherOutboundBusinessTypeOptions.some((option) => option.value === form.businessType)) {
    return { message: '所选业务类型不可用' };
  }
  if (isTransitWriteOffBusinessType(form.businessType) && !isTransitLogicalWarehouse(form.logicalWarehouse)) {
    return { fieldErrors: { businessType: '盘亏仅在出库仓为虚拟在途仓时可选' } };
  }
  return null;
}

// —— 保存与状态动作（主PRD §6.5 状态流转表）——

export function createOtherOutboundRequest(form, { submit = false, operator = '当前用户' } = {}) {
  const existingNos = loadAllOtherOutboundRequests([]).map((row) => row.requestNo);
  const today = new Date().toISOString().slice(0, 10);
  const requestNo = nextDocumentNo('QTCKSQ', today, existingNos);
  const time = nowStamp();

  const row = persistOtherOutboundRequest({
    id: `other-outbound-request-${Date.now()}`,
    requestNo,
    logicalWarehouse: form.logicalWarehouse,
    businessType: form.businessType,
    remark: form.remark || '',
    status: 'draft',
    pushTime: '',
    pushFailReason: '',
    cancelReason: '',
    cancelOperator: '',
    cancelTime: '',
    auditor: '',
    auditTime: '',
    withdrawComment: '',
    withdrawTime: '',
    submittedAt: '',
    creator: operator,
    createdAt: time,
    updater: operator,
    updatedAt: time,
    lines: refreshOutboundRequestLines(form.lines || []),
  });

  return submit ? applySubmitRequest(row, { operator }) : row;
}

export function updateOtherOutboundRequest(row, form, { submit = false, operator = '当前用户' } = {}) {
  const time = nowStamp();
  const updated = persistOtherOutboundRequest({
    ...row,
    logicalWarehouse: form.logicalWarehouse,
    businessType: form.businessType,
    remark: form.remark || '',
    lines: refreshOutboundRequestLines(form.lines || []),
    updater: operator,
    updatedAt: time,
  });
  return submit ? applySubmitRequest(updated, { operator }) : updated;
}

export function applySubmitRequest(row, { operator = '当前用户' } = {}) {
  if (!canSubmitRequest(row)) {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行提交`);
  }
  const time = nowStamp();
  return persistOtherOutboundRequest({
    ...row,
    status: 'pending',
    submittedAt: time,
    updater: operator,
    updatedAt: time,
  });
}

function assertWarehouseSelectable(row) {
  const selectableWarehouses = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true })
    .map((option) => option.value);
  if (!selectableWarehouses.includes(row.logicalWarehouse)) {
    throw new Error('所选出库仓不可用');
  }
}

/** 审核前按行预检可用量：先校验全部行，避免部分占用（主PRD R07、R21、§9.1）。 */
function assertRequestLinesReservable(row) {
  const planned = new Map();
  (row.lines || []).forEach((line, index) => {
    const quantity = Number(line.quantity || 0);
    if (quantity <= 0) return;
    const key = `${row.logicalWarehouse}::${line.product}`;
    const used = planned.get(key) || 0;
    const available = getAvailableStock(row.logicalWarehouse, line.product) - used;
    if (available < quantity) {
      // Toast 用 Demo PRD 原文；明细只挂在 error.detail 上，不改变提示文案
      const error = new Error('可用库存不足，不能审核占库');
      error.detail = `第${index + 1}行可用 ${available}，申请 ${quantity}`;
      throw error;
    }
    planned.set(key, used + quantity);
  });
}

function occupyRequestLines(row, { time }) {
  (row.lines || []).forEach((line) => {
    const quantity = Number(line.quantity || 0);
    if (quantity <= 0) return;
    reserveStock({
      logicalWarehouse: row.logicalWarehouse,
      product: line.product,
      quantity,
      sourceType: SOURCE_TYPE_LABEL,
      sourceNo: row.requestNo,
      sourceLineNo: line.lineNo,
      time,
    });
  });
}

/**
 * 审核通过：按可用量预占（可用不足阻断），系统自动推送仓库。
 * 出库仓为虚拟在途仓时不推送，由系统按申请数量直接生成已审核其他出库单并记账，申请单直接已发货（主PRD R20）。
 * 返回审核后的申请单行。
 */
export function applyApproveRequest(row, { operator = '当前用户' } = {}) {
  if (!canApproveRequest(row)) {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行审核`);
  }
  assertWarehouseSelectable(row);
  assertRequestLinesReservable(row);

  const time = nowStamp();
  occupyRequestLines(row, { time });

  const approved = persistOtherOutboundRequest({
    ...row,
    status: 'approved',
    auditor: operator,
    auditTime: time,
    updater: operator,
    updatedAt: time,
  });

  if (isTransitRequest(approved)) {
    const result = generateOtherOutboundFromRequest(approved, {
      lineActuals: (approved.lines || []).map((line) => Number(line.quantity || 0)),
      directPosting: true,
      operator: '系统',
      time,
    });
    return persistOtherOutboundRequest(result.request);
  }

  simulateAutoPush(approved.id);
  return approved;
}

export function applyWithdrawRequest(row, withdrawComment, { operator = '当前用户' } = {}) {
  if (!canWithdrawRequest(row)) {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行撤回`);
  }
  const time = nowStamp();
  return persistOtherOutboundRequest({
    ...row,
    status: 'draft',
    withdrawComment,
    withdrawTime: time,
    updater: operator,
    updatedAt: time,
  });
}

/**
 * 取消：待审核直接取消（无预占可释放）；已审核、推送失败取消并释放未执行预占；
 * 待发货只能申请取消，进入取消中等待仓库回执，不提前释放预占（主PRD R16～R18）。
 */
export function applyCancelRequest(row, cancelReason, { operator = '当前用户' } = {}) {
  const time = nowStamp();
  const base = {
    ...row,
    cancelReason,
    cancelOperator: operator,
    updater: operator,
    updatedAt: time,
  };

  if (canCancelPendingRequest(row)) {
    return persistOtherOutboundRequest({ ...base, status: 'cancelled', cancelTime: time });
  }

  if (canCancelApprovedRequest(row)) {
    const next = persistOtherOutboundRequest({ ...base, status: 'cancelled', cancelTime: time });
    releaseRequestReservations(next, { operator, time });
    return next;
  }

  if (canApplyCancelRequest(row)) {
    return persistOtherOutboundRequest({ ...base, status: 'cancelling' });
  }

  throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行取消`);
}

/** 取消中收到仓库回执：同意→已取消并释放预占；拒绝→恢复待发货，预占继续占用（主PRD R18）。 */
export function applyWarehouseCancelResult(row, agreed, { operator = '当前用户' } = {}) {
  if (row?.status !== 'cancelling') {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row?.status] || row?.status}，不可执行仓库回执`);
  }
  const time = nowStamp();
  if (!agreed) {
    return persistOtherOutboundRequest({ ...row, status: 'pending_delivery', updater: operator, updatedAt: time });
  }
  const next = persistOtherOutboundRequest({
    ...row,
    status: 'cancelled',
    cancelTime: time,
    updater: operator,
    updatedAt: time,
  });
  releaseRequestReservations(next, { operator, time });
  return next;
}

/** 人工重试推送：回到已审核等待新的发送结果，不重复审核、不重复占库（主PRD R11）。 */
export function applyRetryPushRequest(row, { operator = '当前用户' } = {}) {
  if (!canRetryPushRequest(row)) {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行重试推送`);
  }
  const time = nowStamp();
  const next = persistOtherOutboundRequest({
    ...row,
    status: 'approved',
    updater: operator,
    updatedAt: time,
  });
  simulateAutoPush(next.id);
  return next;
}

/**
 * Demo Mock：模拟仓库回传（弹窗与Mock §5）。
 * 实出合计大于0 → 生成已审核其他出库单并回写申请单；零出 → 不生成结果单，按零出取消并释放全部预占。
 * 返回 `{ request, outbound }`，outbound 为 null 表示零出未生成结果单。
 */
export function applyMockDeliveryRequest(row, payload = {}) {
  if (!canMockDeliveryRequest(row)) {
    throw new Error(`当前单据状态为${otherOutboundRequestStatusLabels[row.status] || row.status}，不可执行模拟回传`);
  }

  const result = generateOtherOutboundFromRequest(row, { ...payload, operator: '系统' });
  if (result.zeroOut) {
    const cancelled = applyZeroOutCancel(result.request);
    return { request: cancelled, outbound: null };
  }
  return { request: persistOtherOutboundRequest(result.request), outbound: result.outbound };
}

/** 零出：实出显示0、未出＝申请数量，申请单按取消结束并释放全部预占，不生成结果单、不改变库存（主PRD R15、S03）。 */
export function applyZeroOutCancel(row, { operator = '系统', time = nowStamp(), reason = '仓库确认零出，按取消处理' } = {}) {
  const next = persistOtherOutboundRequest({
    ...row,
    status: 'cancelled',
    cancelReason: row.cancelReason || reason,
    cancelOperator: row.cancelOperator || operator,
    cancelTime: row.cancelTime || time,
    updater: operator,
    updatedAt: time,
  });
  releaseRequestReservations(next, { operator, time });
  return next;
}

/**
 * 释放本申请单尚未执行的预占：关闭有效预占记录并按剩余量回减逻辑仓预占库存。
 * 预占的释放不记库存流水（主PRD §7.3）；即时库存与冻结库存不变。
 */
export function releaseRequestReservations(row, { operator = '当前用户', time = nowStamp() } = {}) {
  const reservations = loadReservations();
  const stockRows = loadStockRows();
  let releasedTotal = 0;

  const nextReservations = reservations.map((item) => {
    if (item.status !== 'active') return item;
    if (item.sourceType !== SOURCE_TYPE_LABEL || item.sourceNo !== row.requestNo) return item;
    const remaining = Math.max(
      0,
      Number(item.reservedQty || 0) - Number(item.consumedQty || 0) - Number(item.releasedQty || 0),
    );
    if (remaining <= 0) return item;

    releasedTotal += remaining;
    const index = stockRows.findIndex((stock) => (
      stock.logicalWarehouse === item.logicalWarehouse && stock.product === item.product
    ));
    if (index >= 0) {
      stockRows[index] = {
        ...stockRows[index],
        reservedQty: Math.max(0, Number(stockRows[index].reservedQty || 0) - remaining),
        updatedAt: time,
      };
    }
    return {
      ...item,
      releasedQty: Number(item.releasedQty || 0) + remaining,
      status: 'closed',
      updatedAt: time,
      releasedBy: operator,
    };
  });

  if (releasedTotal > 0) {
    persistReservations(nextReservations);
    persistStockRows(stockRows);
  }
  return releasedTotal;
}

/** 审核后系统自动推送仓库：成功后待发货，明确失败进入推送失败（Demo 用定时器模拟）。 */
export function simulateAutoPush(requestId, { forceFail = false } = {}) {
  const row = loadOtherOutboundRequestById(requestId);
  if (!row || row.status !== 'approved') return row;

  const shouldFail = forceFail || row.demoPushFail;

  window.setTimeout(() => {
    const current = loadOtherOutboundRequestById(requestId);
    if (!current || current.status !== 'approved') return;
    if (shouldFail) {
      persistOtherOutboundRequest({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
      });
      return;
    }
    persistOtherOutboundRequest({
      ...current,
      status: 'pending_delivery',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, 600);

  return row;
}

// —— Demo 引导：种子单据的预占与本地落库 ——

/**
 * 首次运行时把种子申请单写入本地 Mock，并为处于「已审核／推送失败／待发货／取消中」的种子补齐预占记录，
 * 使「取消释放预占」「缺量消耗与释放」在演示中真实生效。
 * 正式环境由审核动作占用预占，不需要这一步；已存在预占记录（含已关闭）时跳过，因此可重复执行。
 */
export function ensureOtherOutboundRequestSeeds(seedRows = []) {
  if (!seedRows.length) return;

  if (!readMockRows(OTHER_OUTBOUND_REQUEST_STORAGE_KEY, []).length) {
    writeMockRows(OTHER_OUTBOUND_REQUEST_STORAGE_KEY, seedRows);
  }

  const pending = seedRows.filter((row) => SEED_RESERVATION_STATUSES.has(row.status));
  if (!pending.length) return;

  const reservations = loadReservations();
  const stockRows = loadStockRows();
  let changed = false;

  pending.forEach((row) => {
    (row.lines || []).forEach((line) => {
      const quantity = Number(line.quantity || 0);
      if (quantity <= 0) return;
      const exists = reservations.some((item) => item.sourceNo === row.requestNo && item.sourceLineNo === line.lineNo);
      if (exists) return;

      const index = stockRows.findIndex((stock) => (
        stock.logicalWarehouse === row.logicalWarehouse && stock.product === line.product
      ));
      if (index < 0) return;

      reservations.push({
        id: `res-${row.requestNo}-${line.lineNo}`,
        logicalWarehouse: row.logicalWarehouse,
        product: line.product,
        sourceType: SOURCE_TYPE_LABEL,
        sourceNo: row.requestNo,
        sourceLineNo: line.lineNo,
        reservedQty: quantity,
        consumedQty: 0,
        releasedQty: 0,
        status: 'active',
        createdAt: row.auditTime || row.createdAt || nowStamp(),
      });
      stockRows[index] = {
        ...stockRows[index],
        reservedQty: Number(stockRows[index].reservedQty || 0) + quantity,
      };
      changed = true;
    });
  });

  if (!changed) return;
  persistReservations(reservations);
  persistStockRows(stockRows);
}
