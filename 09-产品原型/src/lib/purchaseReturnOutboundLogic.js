import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { computeLineTaxMetrics, computeLinesTotals } from './format.js';
import { auditStatusLabels, financeErpPushStatusLabels } from './inboundLogic.js';
import {
  loadAllReturnOutbounds,
  loadReturnById,
  nowStamp,
  pushLogEntry,
  mergeLogEntries,
  registerReturnOutboundSeedRows,
  RETURN_OUTBOUND_STORAGE_KEY,
  upsertReturnOutboundRow,
  upsertReturnNoticeRow,
} from './purchaseReturnLogic.js';

export {
  auditStatusLabels,
  financeErpPushStatusLabels,
  RETURN_OUTBOUND_STORAGE_KEY,
  registerReturnOutboundSeedRows,
};

/**
 * 采退出库单模块逻辑（只读结果单）。
 * 业务规则依据《采退出库单主PRD》§6.4 状态—功能矩阵、R01～R10：
 * 由通知回传或虚拟出库自动生成并自动审核，整单只读；推送财务ERP失败在系统集成中心重推。
 */

const FINANCE_ERP_AUTO_RETRY_MAX = 3;
const financeErpTimers = new Map();

export function enrichReturnOutboundLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  const metrics = computeLineTaxMetrics({ ...line, quantity });
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    quantity,
    price: Number(line.price || 0),
    taxRate: line.taxRate ?? '',
    netPrice: metrics.netUnit,
    netAmount: metrics.netAmount,
    grossAmount: metrics.grossAmount,
    taxAmount: metrics.taxAmount,
  };
}

export function refreshReturnOutboundLines(lines = []) {
  return lines.map(enrichReturnOutboundLine);
}

export function normalizeReturnOutboundRow(row) {
  const lines = refreshReturnOutboundLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    lines,
    totalOutboundQty: totals.quantity,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalAmount: totals.netAmount,
    businessDate: row.businessDate || String(row.actualOutboundTime || '').slice(0, 10),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

export function persistReturnOutbound(row) {
  return upsertReturnOutboundRow(normalizeReturnOutboundRow(row));
}

export function loadReturnOutboundById(id) {
  if (!id) return null;
  return loadAllReturnOutbounds().find((item) => item.id === id) || null;
}

export function loadReturnOutboundsByNoticeId(noticeId, noticeNo) {
  return loadAllReturnOutbounds()
    .filter((item) => item.sourceNoticeId === noticeId || (noticeNo && item.sourceNoticeNo === noticeNo))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

export function loadReturnOutboundsByReturnId(returnId, returnNo) {
  return loadAllReturnOutbounds()
    .filter((item) => item.sourceReturnId === returnId || (returnNo && item.sourceReturnNo === returnNo))
    .sort((left, right) => String(right.actualOutboundTime || right.createdAt || '')
      .localeCompare(String(left.actualOutboundTime || left.createdAt || '')));
}

/** 明细价格沿来源采购退货单交易价格（出库PRD §7.2） */
function buildReturnOutboundLines(noticeRow, returnRow) {
  return refreshReturnOutboundLines(
    (noticeRow.lines || [])
      .map((line, index) => ({ line, lineNo: index + 1 }))
      .filter(({ line }) => Number(line.shippedQty || 0) > 0)
      .map(({ line, lineNo }) => {
        const returnLine = (returnRow?.lines || [])
          .find((item) => item.id === line.sourceReturnLineId || item.product === line.product) || null;
        return enrichReturnOutboundLine({
          id: `${noticeRow.id}-outbound-line-${lineNo}`,
          sourceNoticeLineId: line.id,
          sourceNoticeLine: `${noticeRow.noticeNo} 行${lineNo}`,
          product: line.product,
          productCode: line.productCode,
          productName: line.productName,
          unit: line.unit,
          quantity: Number(line.shippedQty || 0),
          price: returnLine?.price ?? 0,
          taxRate: returnLine?.taxRate ?? '13',
        });
      }),
  );
}

function clearFinanceErpTimer(outboundId) {
  const timer = financeErpTimers.get(outboundId);
  if (timer) {
    window.clearTimeout(timer);
    financeErpTimers.delete(outboundId);
  }
}

function scheduleFinanceErpAttempt(outboundId, attempt = 1, forceFail = false) {
  clearFinanceErpTimer(outboundId);
  const current = loadReturnOutboundById(outboundId);
  if (!current || current.financeErpPushStatus === 'push_success') return current;

  persistReturnOutbound({
    ...current,
    financeErpPushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    financeErpTimers.delete(outboundId);
    const latest = loadReturnOutboundById(outboundId);
    if (!latest || latest.financeErpPushStatus !== 'pushing') return;

    const shouldFail = forceFail && attempt >= FINANCE_ERP_AUTO_RETRY_MAX;
    if (shouldFail) {
      persistReturnOutbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，财务ERP未确认接收',
      });
      return;
    }

    if (forceFail && attempt < FINANCE_ERP_AUTO_RETRY_MAX) {
      persistReturnOutbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleFinanceErpAttempt(outboundId, attempt + 1, true);
      return;
    }

    persistReturnOutbound({
      ...latest,
      financeErpPushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  financeErpTimers.set(outboundId, timer);
  return loadReturnOutboundById(outboundId);
}

export function simulateReturnOutboundFinanceErpPush(outboundId, { forceFail = false } = {}) {
  return scheduleFinanceErpAttempt(outboundId, 1, forceFail);
}

/**
 * 生成采退出库单：通知已发货且有实出时调用，创建即已审核并触发推送财务ERP。
 * 一张通知最多一张有效出库单；零出不生成（R02）。
 */
export function createReturnOutboundFromNotice(noticeRow) {
  if (!noticeRow || noticeRow.status !== 'shipped') return null;

  const existing = loadReturnOutboundsByNoticeId(noticeRow.id, noticeRow.noticeNo)[0];
  if (existing) return existing;

  const shippedTotal = (noticeRow.lines || []).reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  if (shippedTotal <= 0) return null;

  const returnRow = loadReturnById(noticeRow.sourceReturnId);
  const lines = buildReturnOutboundLines(noticeRow, returnRow);
  if (!lines.length) return null;

  const actualOutboundTime = noticeRow.finalShipTime || nowStamp();
  const businessDate = actualOutboundTime.slice(0, 10);
  const outboundNo = nextDocumentNo(
    'CTCK',
    businessDate,
    loadAllReturnOutbounds().map((row) => row.outboundNo),
  );

  const outbound = persistReturnOutbound({
    id: `return-outbound-${Date.now()}`,
    outboundNo,
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceReturnId: noticeRow.sourceReturnId,
    sourceReturnNo: noticeRow.sourceReturnNo,
    supplier: noticeRow.supplier,
    warehouse: noticeRow.warehouse,
    currency: returnRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: 'un_pushed',
    businessDate,
    actualOutboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualOutboundTime,
    creator: '系统',
    createdAt: actualOutboundTime,
    updater: '系统',
    lines,
  });

  upsertReturnNoticeRow({
    ...noticeRow,
    outboundId: outbound.id,
    outboundNo: outbound.outboundNo,
  });

  simulateReturnOutboundFinanceErpPush(outbound.id);
  return outbound;
}

/** 演示种子：由通知种子按实出数量与退货单价格构造已审核出库单 */
export function buildSeedReturnOutboundFromNotice(noticeRow, returnRow, overrides = {}) {
  const lines = buildReturnOutboundLines(noticeRow, returnRow);
  const actualOutboundTime = noticeRow.finalShipTime || nowStamp();
  const businessDate = actualOutboundTime.slice(0, 10);
  return normalizeReturnOutboundRow({
    id: overrides.id || `return-outbound-seed-${noticeRow.id}`,
    outboundNo: overrides.outboundNo || nextDocumentNo('CTCK', businessDate, []),
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceReturnId: noticeRow.sourceReturnId,
    sourceReturnNo: noticeRow.sourceReturnNo,
    supplier: noticeRow.supplier,
    warehouse: noticeRow.warehouse,
    currency: returnRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: overrides.financeErpPushStatus || 'push_success',
    businessDate,
    actualOutboundTime,
    pushTime: overrides.pushTime || actualOutboundTime,
    pushFailReason: overrides.pushFailReason || '',
    remark: '',
    auditor: '',
    auditTime: actualOutboundTime,
    creator: '系统',
    createdAt: actualOutboundTime,
    updater: '系统',
    updatedAt: overrides.updatedAt || actualOutboundTime,
    lines,
    ...overrides,
  });
}

export function buildReturnOutboundOperationLogs(row) {
  const entries = [];

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator || '系统',
    action: '生成',
    remark: '根据采退发货通知回传生成采退出库单',
  });

  if (row.auditTime) {
    pushLogEntry(entries, {
      time: row.auditTime,
      operator: row.auditor || '系统',
      action: '审核',
      remark: '自动审核通过',
    });
  }

  if (row.pushTime) {
    pushLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送财务ERP',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : (financeErpPushStatusLabels[row.financeErpPushStatus] || '推送财务ERP'),
    });
  }

  return mergeLogEntries(entries, row.operationLogs || []);
}
