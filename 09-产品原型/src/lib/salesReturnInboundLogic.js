import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { computeLineTaxMetrics, computeLinesTotals, EMPTY_PLACEHOLDER } from './format.js';
import { readMockRows, upsertMockRow } from './mockStorage.js';
import {
  loadSalesReturnById,
  nowStamp,
  RETURN_INBOUND_STORAGE_KEY,
  RETURN_NOTICE_STORAGE_KEY,
} from './salesReturnLogic.js';

export { RETURN_INBOUND_STORAGE_KEY };

export const auditStatusLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
};

/** 来源类型：路径一=销退收货通知，路径二=外部ToC（主PRD §7.1） */
export const sourceTypeLabels = {
  notice: '销退收货通知',
  toc: '外部ToC',
};

export const kingdeePushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

export function enrichSalesReturnInboundLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  const metrics = computeLineTaxMetrics({ ...line, quantity });
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
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

export function refreshSalesReturnInboundLines(lines = []) {
  return lines.map(enrichSalesReturnInboundLine);
}

export function normalizeSalesReturnInboundRow(row) {
  const sourceType = row.sourceType || 'notice';
  const isExternalToc = sourceType === 'toc';
  // 路径二无关联通知与销售退货单：来源通知行一并留空，列表与详情展示「-」（主PRD §7.4 回写范围）
  const lines = refreshSalesReturnInboundLines(row.lines || []).map((line) => (
    isExternalToc ? { ...line, sourceNoticeLineId: '', sourceNoticeLine: '' } : line
  ));
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    sourceType,
    externalOrderNo: row.externalOrderNo || '',
    sourceNoticeId: isExternalToc ? '' : row.sourceNoticeId || '',
    sourceNoticeNo: isExternalToc ? '' : row.sourceNoticeNo || '',
    sourceReturnId: isExternalToc ? '' : row.sourceReturnId || '',
    sourceReturnNo: isExternalToc ? '' : row.sourceReturnNo || '',
    lines,
    totalReceiveQty: totals.quantity,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    // 业务日期取实际收货时间的日期部分（主PRD Q02）
    businessDate: row.businessDate || String(row.actualReceiveTime || '').slice(0, 10),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

export function persistSalesReturnInbound(row) {
  const next = normalizeSalesReturnInboundRow(row);
  upsertMockRow(RETURN_INBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllSalesReturnInbounds(seed = []) {
  return readMockRows(RETURN_INBOUND_STORAGE_KEY, seed);
}

export function loadSalesReturnInboundById(id) {
  return loadAllSalesReturnInbounds([]).find((item) => item.id === id) || null;
}

export function loadSalesReturnInboundsByNoticeId(noticeId, noticeNo) {
  return loadAllSalesReturnInbounds([])
    .filter((item) => item.sourceNoticeId === noticeId || (noticeNo && item.sourceNoticeNo === noticeNo))
    .sort((left, right) => String(right.actualReceiveTime || right.createdAt || '').localeCompare(String(left.actualReceiveTime || left.createdAt || '')));
}

export function loadSalesReturnInboundsByReturnId(returnId, returnNo) {
  return loadAllSalesReturnInbounds([])
    .filter((item) => item.sourceReturnId === returnId || (returnNo && item.sourceReturnNo === returnNo))
    .sort((left, right) => String(right.actualReceiveTime || right.createdAt || '').localeCompare(String(left.actualReceiveTime || left.createdAt || '')));
}

function resolveReturnLine(returnRow, sourceReturnLineId, product) {
  return (returnRow?.lines || []).find((line) => line.id === sourceReturnLineId || line.product === product) || null;
}

function buildInboundLinesFromNotice(noticeRow, returnRow) {
  return refreshSalesReturnInboundLines(
    (noticeRow.lines || [])
      .filter((line) => Number(line.receivedQty || 0) > 0)
      .map((line, index) => {
        const returnLine = resolveReturnLine(returnRow, line.sourceReturnLineId || line.id, line.product);
        return enrichSalesReturnInboundLine({
          id: `${line.id || `notice-line-${index + 1}`}-inbound`,
          sourceNoticeLineId: line.id,
          sourceNoticeLine: `第${index + 1}行`,
          product: line.product,
          productCode: line.productCode,
          barcode: line.barcode,
          productName: line.productName,
          unit: line.unit,
          quantity: Number(line.receivedQty || 0),
          price: returnLine?.price ?? 0,
          taxRate: returnLine?.taxRate ?? '13',
        });
      }),
  );
}

function clearKingdeeTimer(inboundId) {
  const timer = kingdeeTimers.get(inboundId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(inboundId);
  }
}

function scheduleKingdeeAttempt(inboundId, attempt = 1, forceFail = false) {
  clearKingdeeTimer(inboundId);
  const current = loadSalesReturnInboundById(inboundId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  persistSalesReturnInbound({
    ...current,
    kingdeePushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(inboundId);
    const latest = loadSalesReturnInboundById(inboundId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    if (forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX) {
      persistSalesReturnInbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail && attempt < KINGDEE_AUTO_RETRY_MAX) {
      persistSalesReturnInbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(inboundId, attempt + 1, true);
      return;
    }

    persistSalesReturnInbound({
      ...latest,
      kingdeePushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(inboundId, timer);
  return loadSalesReturnInboundById(inboundId);
}

/** Demo Mock：模拟销退入库单推送金蝶（失败重推入口在系统集成中心，本模块不提供按钮） */
export function simulateSalesReturnInboundKingdeePush(inboundId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(inboundId, 1, forceFail);
}

/** 通知收货完成（含虚拟入库）后自动生成已审核销退入库单（R02、R03、R13） */
export function createSalesReturnInboundFromNotice(noticeRow) {
  if (!noticeRow || noticeRow.status !== 'received') return null;
  const existing = loadSalesReturnInboundsByNoticeId(noticeRow.id, noticeRow.noticeNo)[0];
  if (existing) return existing;

  const receivedTotal = (noticeRow.lines || []).reduce((sum, line) => sum + Number(line.receivedQty || 0), 0);
  if (receivedTotal <= 0) return null;

  const returnRow = loadSalesReturnById(noticeRow.sourceReturnId);
  const lines = buildInboundLinesFromNotice(noticeRow, returnRow);
  if (!lines.length) return null;

  const actualReceiveTime = noticeRow.finalReceiveTime || nowStamp();
  const businessDate = actualReceiveTime.slice(0, 10);
  const existingNos = loadAllSalesReturnInbounds([]).map((row) => row.inboundNo);
  const inboundNo = nextDocumentNo('XTRK', businessDate, existingNos);

  const inbound = persistSalesReturnInbound({
    id: `sales-return-inbound-${Date.now()}`,
    inboundNo,
    sourceType: 'notice',
    externalOrderNo: '',
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceReturnId: noticeRow.sourceReturnId,
    sourceReturnNo: noticeRow.sourceReturnNo,
    customer: noticeRow.customer,
    warehouse: noticeRow.warehouse,
    currency: returnRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    businessDate,
    actualReceiveTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualReceiveTime,
    creator: '系统',
    createdAt: actualReceiveTime,
    updater: '系统',
    updatedAt: actualReceiveTime,
    lines,
  });

  upsertMockRow(RETURN_NOTICE_STORAGE_KEY, {
    ...noticeRow,
    inboundId: inbound.id,
    inboundNo: inbound.inboundNo,
  });

  simulateSalesReturnInboundKingdeePush(inbound.id);
  return inbound;
}

/** 种子数据构造：按来源通知的实际收货数量生成入库单，价格沿来源销售退货单（Mock 演示用） */
export function buildSeedSalesReturnInboundFromNotice(noticeRow, returnRow, overrides = {}) {
  const lines = buildInboundLinesFromNotice(noticeRow, returnRow);
  const actualReceiveTime = noticeRow.finalReceiveTime || nowStamp();
  const businessDate = actualReceiveTime.slice(0, 10);
  return normalizeSalesReturnInboundRow({
    id: overrides.id || `sales-return-inbound-seed-${noticeRow.id}`,
    inboundNo: overrides.inboundNo || nextDocumentNo('XTRK', businessDate, []),
    sourceType: 'notice',
    externalOrderNo: '',
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceReturnId: noticeRow.sourceReturnId,
    sourceReturnNo: noticeRow.sourceReturnNo,
    customer: noticeRow.customer,
    warehouse: noticeRow.warehouse,
    currency: returnRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: overrides.kingdeePushStatus || 'push_success',
    businessDate,
    actualReceiveTime,
    pushTime: overrides.pushTime || actualReceiveTime,
    pushFailReason: overrides.pushFailReason || '',
    remark: '',
    auditor: '',
    auditTime: actualReceiveTime,
    creator: '系统',
    createdAt: actualReceiveTime,
    updater: '系统',
    updatedAt: overrides.updatedAt || actualReceiveTime,
    lines,
    ...overrides,
  });
}

function hasValue(value) {
  return value != null && value !== '' && value !== EMPTY_PLACEHOLDER;
}

function pushLogEntry(entries, { time, operator, action, remark }) {
  if (!hasValue(time) && !hasValue(operator) && !hasValue(action)) return;
  entries.push({
    id: `${action}-${time || entries.length}`,
    time: time || EMPTY_PLACEHOLDER,
    operator: operator || EMPTY_PLACEHOLDER,
    action,
    remark: remark || EMPTY_PLACEHOLDER,
  });
}

function mergeLogEntries(...sources) {
  const map = new Map();
  sources.flat().forEach((entry) => {
    if (!entry) return;
    map.set(entry.id, entry);
  });
  return [...map.values()].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

export function buildSalesReturnInboundOperationLogs(row) {
  const entries = [];
  const isExternalToc = row.sourceType === 'toc';

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator || '系统',
    action: '生成',
    remark: isExternalToc ? '按渠道退货结果归集生成入库单' : '根据销退收货通知回传生成入库单',
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
    const pushLabel = kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus;
    pushLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送金蝶',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : pushLabel || '推送金蝶',
    });
  }

  return mergeLogEntries(entries, row.operationLogs || []);
}
