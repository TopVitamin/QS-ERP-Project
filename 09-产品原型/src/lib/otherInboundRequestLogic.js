/**
 * 其他入库申请单逻辑：建单、提交、审核、自动推送、一次回传、取消与完结。
 *
 * 规则依据：《其他入库申请单主PRD》§6.4 状态—功能矩阵、§6.5 状态流转表、R01～R19；
 * 页面交互与弹窗文案见《其他入库申请单前端Demo版PRD》。
 * - 申请单只有一个「单据状态」字段（不并列审核状态／业务状态）；
 * - 审核、推送都不改库存；只有回传实收>0 生成的其他入库单才记账（见 otherInboundLogic）；
 * - 回写单向：结果单回写申请单实收与状态，申请单不改结果单。
 */
import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { emptyFieldMessage } from './formValidation.js';
import { nowDateStamp, nowStamp } from './format.js';
import { getInventoryLogicalWarehouseOptions, resolveLogicalWarehouseRow } from '../data/warehouseData.js';
import {
  generateOtherInboundFromRequest,
  loadAllOtherInbounds,
  loadOtherInboundByRequestId,
  otherInboundBusinessTypes,
  persistOtherInbound,
  OTHER_INBOUND_STORAGE_KEY,
} from './otherInboundLogic.js';

export const OTHER_INBOUND_REQUEST_STORAGE_KEY = 'qs-erp:other-inbound-requests:v1';

export const OTHER_INBOUND_REQUEST_NO_PLACEHOLDER = '保存后自动生成';

/** 备注长度上限，按《6.强盛ERP的编码规则和通用字段规则》REMARK_500。 */
export const REMARK_500_MAX = 500;

export const otherInboundRequestStatusLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  push_failed: '推送失败',
  pending_receive: '待收货',
  cancelling: '取消中',
  cancelled: '已取消',
  received: '已收货',
};

/** 状态 tone：列表用语义色文字类名，详情／页头用 StatusBadge 语义键（Demo PRD §4.3）。 */
export const otherInboundRequestStatusTones = {
  draft: 'warning',
  pending: 'info',
  approved: 'info',
  push_failed: 'danger',
  pending_receive: 'info',
  cancelling: 'warning',
  cancelled: 'neutral',
  received: 'success',
};

export const otherInboundRequestStatusTextTones = {
  draft: 'text-erp-warning',
  pending: 'text-erp-info',
  approved: 'text-erp-info',
  push_failed: 'text-erp-danger',
  pending_receive: 'text-erp-info',
  cancelling: 'text-erp-warning',
  cancelled: '',
  received: 'text-erp-success',
};

export { otherInboundBusinessTypes };

/**
 * 建单可选业务类型（2026-09-24确认）：盘盈由仓库盘点回传形成结果单，本申请单不提供建单入口；
 * 结果单侧（仓库主动回传）仍按完整枚举取值。
 */
export const otherInboundRequestBusinessTypes = otherInboundBusinessTypes.filter((type) => type !== '盘盈');

// —— 状态—功能矩阵（主PRD §6.4） ——

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

export function canCancelPendingRequest(row) {
  return row?.status === 'pending';
}

/** 已审核取消（R16）：未推送，或明确推送失败且已确认仓库未接收。 */
export function canCancelApprovedRequest(row) {
  return row?.status === 'approved' || row?.status === 'push_failed';
}

/** 待收货只能申请取消，进入取消中等待仓库确认（R17）。 */
export function canApplyCancelRequest(row) {
  return row?.status === 'pending_receive';
}

export function canRetryPushRequest(row) {
  return row?.status === 'push_failed';
}

/** Demo：待收货可模拟仓库回传（F08）。 */
export function canMockReceiptRequest(row) {
  return row?.status === 'pending_receive';
}

/** Demo：取消中可模拟仓库回执。 */
export function canMockWarehouseCancelRequest(row) {
  return row?.status === 'cancelling';
}

/**
 * 人工确认（F09／R20）：只适用于已交给仓库的申请——已审核（已推送、发送结果不确定）、
 * 待收货、取消中；草稿、待审核先提交审核，推送失败先重试或取消（主PRD §6.4）。
 * 详情页入口，列表行不提供（Demo PRD §2）。
 */
export function canManualConfirmRequest(row) {
  return row?.status === 'approved' || row?.status === 'pending_receive' || row?.status === 'cancelling';
}

/** 人工确认类型文案（弹窗与Mock §3.9；类型与填写内容随操作日志保留）。 */
export const manualConfirmTypeLabels = {
  accept: '确认接单',
  finish: '确认执行结束',
  cancel_result: '确认取消结果',
};

/** 确认类型按当前状态给出可选项：已审核—确认接单；待收货—确认执行结束；取消中—确认取消结果。 */
export function resolveManualConfirmType(row) {
  if (row?.status === 'approved') return 'accept';
  if (row?.status === 'pending_receive') return 'finish';
  if (row?.status === 'cancelling') return 'cancel_result';
  return '';
}

export function buildStatusMismatchMessage(row, action) {
  const label = otherInboundRequestStatusLabels[row?.status] || row?.status || '-';
  return `当前单据状态为${label}，不可执行${action}`;
}

// —— 明细与行数据 ——

/** 明细补齐展示字段：未确认的实收留空（页面显示 `-`），未收按尚未执行的计划数量展示（R12）。 */
export function enrichRequestLine(line = {}) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  const hasActual = line.actualQty !== null && line.actualQty !== undefined && line.actualQty !== '';
  const actualQty = hasActual ? Number(line.actualQty) : null;
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    quantity,
    actualQty,
    remainingQty: Math.max(0, quantity - (actualQty || 0)),
  };
}

export function refreshRequestLines(lines = []) {
  return lines.map(enrichRequestLine);
}

export function sumRequestQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

/** 单头数量合计：实收在全部行确认前留空（列表显示 `-`）。 */
export function sumRequestActualQty(lines = []) {
  const confirmed = lines.every((line) => line.actualQty !== null && line.actualQty !== undefined);
  if (!confirmed) return null;
  return lines.reduce((sum, line) => sum + Number(line.actualQty || 0), 0);
}

export function sumRequestRemainingQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.remainingQty || 0), 0);
}

export function normalizeRequestRow(row = {}) {
  const lines = refreshRequestLines(row.lines || []);
  return {
    ...row,
    status: row.status || 'draft',
    remark: row.remark || '',
    lastPushTime: row.lastPushTime || '',
    pushFailReason: row.pushFailReason || '',
    cancelReason: row.cancelReason || '',
    cancelTime: row.cancelTime || '',
    cancelOperator: row.cancelOperator || '',
    auditor: row.auditor || '',
    auditTime: row.auditTime || '',
    withdrawComment: row.withdrawComment || '',
    confirmBy: row.confirmBy || '',
    confirmAt: row.confirmAt || '',
    confirmContent: row.confirmContent || '',
    manualConfirmLogs: row.manualConfirmLogs || [],
    inboundId: row.inboundId || '',
    inboundNo: row.inboundNo || '',
    lines,
    totalRequestQty: sumRequestQty(lines),
    totalActualQty: sumRequestActualQty(lines),
    totalRemainingQty: sumRequestRemainingQty(lines),
    updater: row.updater || '当前用户',
    updatedAt: row.updatedAt || nowStamp(),
  };
}

export function persistOtherInboundRequest(row) {
  const next = normalizeRequestRow(row);
  upsertMockRow(OTHER_INBOUND_REQUEST_STORAGE_KEY, next);
  return next;
}

export function loadAllOtherInboundRequests(seed = []) {
  return readMockRows(OTHER_INBOUND_REQUEST_STORAGE_KEY, seed);
}

export function loadOtherInboundRequestById(id) {
  return loadAllOtherInboundRequests([]).find((row) => row.id === id) || null;
}

export function loadOtherInboundRequestByNo(requestNo) {
  return loadAllOtherInboundRequests([]).find((row) => row.requestNo === requestNo) || null;
}

/** 草稿删除：物理删除、不可恢复、单号不重用（R06）。 */
export function deleteOtherInboundRequest(id) {
  writeMockRows(
    OTHER_INBOUND_REQUEST_STORAGE_KEY,
    loadAllOtherInboundRequests([]).filter((row) => row.id !== id),
  );
}

// —— 表单 ——

/** 入库仓选项（R02）：审核通过且启用的逻辑仓，包含虚拟在途逻辑仓。 */
export function getRequestWarehouseOptions() {
  return getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true })
    .filter((option) => resolveLogicalWarehouseRow(option.value)?.auditStatus === 'approved');
}

export function generateOtherInboundRequestNo(date) {
  const existingNos = loadAllOtherInboundRequests([]).map((row) => row.requestNo);
  return nextDocumentNo('QTRKSQ', date || nowDateStamp(), existingNos);
}

export function buildRequestFormFromRow(row) {
  return {
    id: row.id,
    requestNo: row.requestNo,
    warehouse: row.warehouse || '',
    businessType: row.businessType || '',
    status: row.status || 'draft',
    remark: row.remark || '',
    lines: refreshRequestLines(row.lines || []).map((line) => ({ ...line })),
  };
}

export function createEmptyRequestForm() {
  return {
    id: '',
    requestNo: OTHER_INBOUND_REQUEST_NO_PLACEHOLDER,
    warehouse: '',
    businessType: '',
    status: 'draft',
    remark: '',
    lines: [createRequestLine()],
  };
}

let requestLineSequence = 0;

export function createRequestLine(overrides = {}) {
  requestLineSequence += 1;
  return {
    id: `other-inbound-request-line-${Date.now()}-${requestLineSequence}`,
    product: '',
    productCode: '',
    barcode: '',
    productName: '',
    unit: '',
    quantity: '',
    actualQty: null,
    remainingQty: 0,
    ...overrides,
  };
}

export function createRequestLineFromSku(sku, template) {
  const sameSku = Boolean(sku?.value) && template?.product === sku.value;
  return createRequestLine({
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    barcode: sku?.barcode || '',
    productName: sku?.productName || '',
    unit: sku?.unit === '-' ? (template?.unit || '个') : (sku?.unit || template?.unit || '个'),
    quantity: sameSku ? template.quantity : 1,
  });
}

/** 表单行 → 持久化行；新增首次保存分配单号（R01）。 */
export function buildRequestRowFromForm(form, { shouldSubmit = false, context } = {}) {
  const source = context?.row || {};
  const stamp = nowStamp();
  const lines = refreshRequestLines(form.lines || []).map((line) => ({
    id: line.id,
    product: line.product,
    quantity: Number(line.quantity || 0),
    actualQty: line.actualQty ?? null,
  }));

  return normalizeRequestRow({
    ...source,
    id: source.id || `other-inbound-request-${Date.now()}`,
    requestNo: form.requestNo,
    warehouse: form.warehouse,
    businessType: form.businessType,
    status: shouldSubmit ? 'pending' : (form.status || source.status || 'draft'),
    remark: form.remark || '',
    submittedAt: shouldSubmit ? stamp : (source.submittedAt || ''),
    submitter: shouldSubmit ? '当前用户' : (source.submitter || ''),
    creator: source.creator || '当前用户',
    createdAt: source.createdAt || stamp,
    updater: '当前用户',
    updatedAt: stamp,
    lines,
  });
}

export function createOtherInboundRequest(form) {
  const requestNo = form.requestNo && form.requestNo !== OTHER_INBOUND_REQUEST_NO_PLACEHOLDER
    ? form.requestNo
    : generateOtherInboundRequestNo();
  return persistOtherInboundRequest(buildRequestRowFromForm({ ...form, requestNo, status: 'draft' }));
}

export function updateOtherInboundRequest(row, form) {
  return persistOtherInboundRequest(buildRequestRowFromForm(form, { context: { row } }));
}

/** 保存校验（新增编辑页 PRD §4.3）：单头必填 + 明细底线。 */
export function validateRequestForSave(form) {
  const fieldErrors = {};
  if (!form?.warehouse) fieldErrors.warehouse = emptyFieldMessage('入库仓');
  if (!form?.businessType) fieldErrors.businessType = emptyFieldMessage('业务类型');
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const lines = form.lines || [];
  if (!lines.length) return { message: '请至少添加一行有效商品明细' };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.product) return { message: `第${index + 1}行请选择商品` };
    const raw = line.quantity;
    const quantity = Number(raw);
    if (raw === '' || raw == null || !Number.isFinite(quantity) || quantity <= 0) {
      return { message: `第${index + 1}行申请入库数量必须大于 0` };
    }
    if (!Number.isInteger(quantity)) {
      return { message: `第${index + 1}行申请入库数量须为正整数` };
    }
  }
  return null;
}

/** 提交校验（§4.4）：在保存校验之上复核入库仓仍启用、业务类型在已确认枚举内。 */
export function validateRequestForSubmit(form) {
  const base = validateRequestForSave(form);
  if (base) return base;

  const warehouse = resolveLogicalWarehouseRow(form.warehouse);
  const usable = warehouse
    && warehouse.auditStatus === 'approved'
    && warehouse.useStatus === 'enabled';
  if (!usable) return { message: '所选入库仓不可用' };
  if (!otherInboundRequestBusinessTypes.includes(form.businessType)) {
    return { message: '所选业务类型不可用' };
  }
  return null;
}

// —— 状态动作（§6.5） ——

export function applySubmitRequest(row) {
  return persistOtherInboundRequest({
    ...row,
    status: 'pending',
    submittedAt: nowStamp(),
    submitter: '当前用户',
    updater: '当前用户',
    updatedAt: nowStamp(),
  });
}

/** 审核通过：进入已审核并自动推送仓库；审核不占库、不增加库存（R07）。 */
export function applyApproveRequest(row) {
  const next = persistOtherInboundRequest({
    ...row,
    status: 'approved',
    auditor: '当前用户',
    auditTime: nowStamp(),
    updater: '当前用户',
    updatedAt: nowStamp(),
  });
  simulateRequestPush(next.id);
  return loadOtherInboundRequestById(next.id) || next;
}

export function applyWithdrawRequest(row, withdrawComment) {
  return persistOtherInboundRequest({
    ...row,
    status: 'draft',
    withdrawComment,
    withdrawTime: nowStamp(),
    withdrawOperator: '当前用户',
    updater: '当前用户',
    updatedAt: nowStamp(),
  });
}

/**
 * 取消：待审核／已审核／推送失败 → 已取消；待收货 → 取消中（等仓库回执，R15～R17）。
 * 取消原因必填，由弹窗校验。
 */
export function applyCancelRequest(row, cancelReason) {
  const stamp = nowStamp();
  if (row.status === 'pending_receive') {
    return persistOtherInboundRequest({
      ...row,
      status: 'cancelling',
      cancelReason,
      updater: '当前用户',
      updatedAt: stamp,
    });
  }
  return persistOtherInboundRequest({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    updater: '当前用户',
    updatedAt: stamp,
  });
}

/** 回传零收：仓库最终确认整单零执行，申请单按取消结束、不生成结果单（S03、R14）。 */
export function applyZeroReceiptCancelRequest(row, cancelReason) {
  const stamp = nowStamp();
  return persistOtherInboundRequest({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '系统',
    updater: '系统',
    updatedAt: stamp,
  });
}

/** Demo：取消中收到仓库回执；同意→已取消，拒绝→恢复待收货（§6.5）。 */
export function applyWarehouseCancelResult(row, agreed) {
  const stamp = nowStamp();
  if (agreed) {
    return persistOtherInboundRequest({
      ...row,
      status: 'cancelled',
      cancelTime: stamp,
      cancelOperator: '系统',
      updater: '系统',
      updatedAt: stamp,
    });
  }
  return persistOtherInboundRequest({
    ...row,
    status: 'pending_receive',
    cancelReason: '',
    updater: '系统',
    updatedAt: stamp,
  });
}

export function applyRetryPushRequest(row) {
  const next = persistOtherInboundRequest({
    ...row,
    status: 'approved',
    pushState: '',
    updater: '当前用户',
    updatedAt: nowStamp(),
  });
  simulateRequestPush(next.id);
  return loadOtherInboundRequestById(next.id) || next;
}

// —— 人工确认（F09／R20；详情页入口，弹窗与Mock §3.9） ——

function buildManualConfirmLogEntry({ time, operator, remark }) {
  return { id: `manual-confirm-${time}`, time, operator, action: '人工确认', remark };
}

/** 录入数量按整数解析；空值按 0 处理，由调用方按 0～申请数量校验。 */
function parseConfirmActual(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return 0;
  const value = Number(text);
  return Number.isFinite(value) && Number.isInteger(value) ? value : NaN;
}

/**
 * 人工确认执行结束形成的其他入库单：按正式口径走草稿→待审核（R20、AC16）。
 * 原型按「待审核 + 演示数据」落库：不直接记账、不推送财务ERP，审核通过后才增加库存并推送；
 * 原型不提供该结果单的审核入口，边界见弹窗与Mock §3.9。
 */
function createManualConfirmInbound(request, lines, actuals, { operator, time }) {
  const existing = loadOtherInboundByRequestId(request.id, request.requestNo);
  if (existing) return existing;

  const activeLines = lines
    .map((line, index) => ({ line, index, actualQty: actuals[index] }))
    .filter((item) => item.actualQty > 0);
  if (!activeLines.length) throw new Error('实收合计为 0，请勾选零收或填写实收数量');

  const inboundNo = nextDocumentNo(
    'QTRK',
    String(time).slice(0, 10),
    loadAllOtherInbounds([]).map((row) => row.inboundNo),
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
    auditStatus: 'pending',
    financeErpPushStatus: 'un_pushed',
    actualInboundTime: time,
    pushTime: '',
    pushFailReason: '',
    remark: '人工确认执行结束形成（演示数据，待审核）',
    auditor: '',
    auditTime: '',
    creator: operator,
    createdAt: time,
    updater: operator,
    updatedAt: time,
    demoMock: true,
    lines: activeLines.map((item) => ({
      id: `other-inbound-line-${Date.now()}-${item.index + 1}`,
      sourceRequestLineId: item.line.id,
      sourceInboundLine: `${request.requestNo} 第${item.index + 1}行`,
      product: item.line.product,
      quantity: item.actualQty,
    })),
  });

  // 待审核单尚未审核：清掉规范化里的审核时间兜底，审核人保持为空
  const pending = { ...inbound, auditor: '', auditTime: '' };
  upsertMockRow(OTHER_INBOUND_STORAGE_KEY, pending);
  return pending;
}

/**
 * 人工确认（R20）：确认接单／确认执行结束（含零收）／确认取消结果。
 * - 确认接单：已审核→待收货，库存不变；
 * - 确认执行结束：回写实收与未收，并形成其他入库单（草稿→待审核；原型按待审核落库并标注演示数据，不直接记账）；
 * - 零收：已取消、不生成结果单；
 * - 确认取消结果：仓库同意→已取消；拒绝→恢复待收货。
 * 记录人工确认人／时间／内容，确认类型与填写内容随操作日志保留；不能无来源新建其他入库单。
 */
export function applyManualConfirmRequest(row, payload = {}) {
  const latest = loadOtherInboundRequestById(row?.id) || row;
  if (!latest || !canManualConfirmRequest(latest)) {
    throw new Error(buildStatusMismatchMessage(latest || row, '人工确认'));
  }

  const confirmType = payload.confirmType || resolveManualConfirmType(latest);
  const operator = payload.operator || '当前用户';
  const stamp = nowStamp();
  const appendLog = (remark) => [
    ...(latest.manualConfirmLogs || []),
    buildManualConfirmLogEntry({ time: stamp, operator, remark }),
  ];

  if (confirmType === 'accept') {
    const content = '确认接单：已核实仓库实际接收本单';
    return persistOtherInboundRequest({
      ...latest,
      status: 'pending_receive',
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(content),
      updater: operator,
      updatedAt: stamp,
    });
  }

  if (confirmType === 'finish') {
    const lines = refreshRequestLines(latest.lines || []);
    const zeroReceive = Boolean(payload.zeroReceive);
    const actuals = lines.map((line, index) => {
      const quantity = Number(line.quantity || 0);
      const actualQty = zeroReceive ? 0 : parseConfirmActual(payload.lineReceipts?.[index]);
      if (!zeroReceive) {
        if (!Number.isInteger(actualQty)) throw new Error(`第${index + 1}行实收数量须为整数`);
        if (actualQty < 0) throw new Error(`第${index + 1}行实收数量不能小于 0`);
        if (actualQty > quantity) {
          throw new Error(`第${index + 1}行实收数量超过申请数量（申请 ${quantity}），本次确认被拒绝`);
        }
      }
      return actualQty;
    });

    const totalRequestQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    const totalActual = actuals.reduce((sum, value) => sum + value, 0);
    if (!zeroReceive && totalActual <= 0) {
      throw new Error('执行结束实收合计为 0：请填写实收数量，或勾选零收（整单按取消结束）');
    }

    if (zeroReceive) {
      const content = `确认零收：整单按取消结束（申请 ${totalRequestQty}）`;
      return persistOtherInboundRequest({
        ...latest,
        status: 'cancelled',
        cancelReason: '人工确认零收：整单按取消结束',
        cancelTime: stamp,
        cancelOperator: operator,
        confirmBy: operator,
        confirmAt: stamp,
        confirmContent: content,
        manualConfirmLogs: appendLog(content),
        lines: lines.map((line) => ({ ...line, actualQty: 0 })),
        updater: operator,
        updatedAt: stamp,
      });
    }

    const inbound = createManualConfirmInbound(latest, lines, actuals, { operator, time: stamp });
    const content = `确认执行结束：实收 ${actuals.join('、')}（申请 ${lines.map((line) => Number(line.quantity || 0)).join('、')}）`;
    return persistOtherInboundRequest({
      ...latest,
      status: 'received',
      lines: lines.map((line, index) => ({ ...line, actualQty: actuals[index] })),
      inboundId: inbound.id,
      inboundNo: inbound.inboundNo,
      lastReceiveTime: stamp,
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(`${content}，已形成演示用其他入库单 ${inbound.inboundNo}（待审核）`),
      updater: operator,
      updatedAt: stamp,
    });
  }

  if (confirmType === 'cancel_result') {
    const agreed = payload.cancelResult !== 'reject';
    const content = agreed ? '确认取消结果：仓库同意取消' : '确认取消结果：仓库拒绝取消，恢复等待实际结果';
    if (agreed) {
      return persistOtherInboundRequest({
        ...latest,
        status: 'cancelled',
        cancelTime: stamp,
        cancelOperator: operator,
        confirmBy: operator,
        confirmAt: stamp,
        confirmContent: content,
        manualConfirmLogs: appendLog(content),
        updater: operator,
        updatedAt: stamp,
      });
    }
    return persistOtherInboundRequest({
      ...latest,
      status: 'pending_receive',
      cancelReason: '',
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(content),
      updater: operator,
      updatedAt: stamp,
    });
  }

  throw new Error(buildStatusMismatchMessage(latest, '人工确认'));
}

/**
 * 审核后自动推送仓库（R10）。
 * `pushState` 只是推送记录里的发送过程标记，不改变「单据状态」字段（§6.1）；
 * 推送成功 → 待收货，明确失败 → 推送失败（等待人工重试）。
 */
export function simulateRequestPush(requestId, { forceFail = false } = {}) {
  const request = loadOtherInboundRequestById(requestId);
  if (!request || request.status !== 'approved' || request.pushState === 'pushing') return request;

  const shouldFail = forceFail || Boolean(request.demoPushFail);
  const pushing = persistOtherInboundRequest({ ...request, pushState: 'pushing' });

  window.setTimeout(() => {
    const current = loadOtherInboundRequestById(requestId);
    if (!current || current.status !== 'approved' || current.pushState !== 'pushing') return;

    if (shouldFail) {
      persistOtherInboundRequest({
        ...current,
        status: 'push_failed',
        pushState: '',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
        updater: '系统',
        updatedAt: nowStamp(),
      });
      return;
    }

    persistOtherInboundRequest({
      ...current,
      status: 'pending_receive',
      pushState: '',
      lastPushTime: nowStamp(),
      pushFailReason: '',
      updater: '系统',
      updatedAt: nowStamp(),
    });
  }, 600);

  return pushing;
}

/**
 * Demo：模拟仓库回传（弹窗与Mock §5）。
 * 逐行录入实收（不超过申请数量）：实收合计>0 生成其他入库单并回写实收与状态；勾选零收则按取消处理。
 */
export function applyMockReceiptRequest(row, payload = {}) {
  const lines = refreshRequestLines(row.lines || []);

  if (payload.zeroReceive) {
    // 零收：实收显示0、未收＝申请数量（主PRD R12），不生成结果单、库存不变。
    const zeroLines = lines.map((line) => ({ ...line, actualQty: 0 }));
    return applyZeroReceiptCancelRequest(
      { ...row, lines: zeroLines },
      payload.cancelReason || '仓库回传零收，整单按取消结束',
    );
  }

  const receipts = lines.map((line, index) => ({
    lineId: line.id,
    actualQty: payload.lineReceipts?.[index] ?? line.quantity,
  }));

  const inbound = generateOtherInboundFromRequest(row, { receipts, demoMock: true });
  if (!inbound) throw new Error('实收合计为 0，请勾选零收或填写实收数量');

  const actualMap = new Map((inbound.lines || []).map((line) => [line.sourceRequestLineId, line.quantity]));
  const nextLines = lines.map((line) => ({ ...line, actualQty: actualMap.get(line.id) ?? 0 }));

  return persistOtherInboundRequest({
    ...row,
    status: 'received',
    lines: nextLines,
    inboundId: inbound.id,
    inboundNo: inbound.inboundNo,
    lastReceiveTime: inbound.actualInboundTime,
    updater: '系统',
    updatedAt: inbound.actualInboundTime,
  });
}

export function loadOtherInboundForRequest(row) {
  if (!row) return null;
  return loadOtherInboundByRequestId(row.id, row.requestNo);
}

/** 详情页操作日志：含建单、提交、审核、撤回、推送、回传、取消等记录，按时间倒序。 */
export function buildOtherInboundRequestOperationLogs(row) {
  const entries = [];
  if (!row) return entries;

  const push = (time, operator, action, remark) => {
    if (!time && !operator && !action) return;
    entries.push({
      id: `${action}-${time || entries.length}`,
      time: time || '-',
      operator: operator || '-',
      action,
      remark: remark || '-',
    });
  };

  push(row.createdAt, row.creator, '创建', '创建其他入库申请单');
  if (row.submittedAt) push(row.submittedAt, row.submitter || row.creator, '提交', '提交审核');
  if (row.withdrawComment) {
    push(row.withdrawTime || row.updatedAt, row.withdrawOperator || row.updater, '撤回', row.withdrawComment);
  }
  if (row.auditTime) push(row.auditTime, row.auditor, '审核', '审核通过并推送仓库');
  if (row.lastPushTime) push(row.lastPushTime, '系统', '推送仓库', '推送仓库成功');
  if (row.status === 'push_failed' && row.pushFailReason) {
    push(row.updatedAt, '系统', '推送仓库', `推送失败：${row.pushFailReason}`);
  }
  const manualConfirmLogs = Array.isArray(row.manualConfirmLogs) ? row.manualConfirmLogs : [];
  const confirmedReceive = manualConfirmLogs.some((log) => (
    String(log.remark || '').startsWith('确认执行结束') || String(log.remark || '').startsWith('确认零收')
  ));
  if (row.lastReceiveTime && !confirmedReceive) {
    push(row.lastReceiveTime, '系统', '回传收货', row.inboundNo ? `仓库回传实收，生成 ${row.inboundNo}` : '仓库回传实收');
  }
  if (row.cancelTime) push(row.cancelTime, row.cancelOperator, '取消', row.cancelReason);
  if (manualConfirmLogs.length) {
    manualConfirmLogs.forEach((log) => push(log.time, log.operator, log.action || '人工确认', log.remark));
  } else if (row.confirmAt) {
    push(row.confirmAt, row.confirmBy, '人工确认', row.confirmContent);
  }

  return entries.sort((left, right) => String(right.time).localeCompare(String(left.time)));
}
