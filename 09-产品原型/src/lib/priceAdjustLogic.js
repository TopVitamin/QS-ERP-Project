import { skuOptions, taxRateOptions } from '../data/masterData.js';
import { emptyFieldMessage } from './formValidation.js';
import { matchesDateRange, matchesMultiSelect } from './listFilters.js';
import { readMockRows, writeMockRows } from './mockStorage.js';
import { applyApprovedAdjustmentToPriceList, getProductBarcodes, nowStamp } from './priceLogic.js';

/**
 * 价格调整单逻辑（采购／销售共用）。
 * 业务规则依据《采购价格调整单主PRD》《销售价格调整单主PRD》§6.4 状态—功能矩阵与 R01～R13；
 * 字段与枚举依据价格相关详细稿 TSV；审核通过后写入价目表当前价见《弹窗与Mock》§4（仅 Demo）。
 */

export const PURCHASE_ADJUST_STORAGE_KEY = 'qs-erp:purchase-price-adjustments:v1';
export const SALES_ADJUST_STORAGE_KEY = 'qs-erp:sales-price-adjustments:v1';

/** 备注类字段最大长度（REMARK_500）。 */
export const REMARK_500_MAX = 500;

export const priceAdjustStatusLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  rejected: '已驳回',
};

/** 列表状态列语义色文字 tone（列表页 Demo PRD §4.3）。 */
export const priceAdjustStatusToneClassNames = {
  draft: 'text-erp-warning',
  pending: 'text-erp-info',
  approved: 'text-erp-success',
  rejected: 'text-erp-danger',
};

const priceAdjustStatusBadgeTones = {
  draft: 'warning',
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
};

const priceAdjustSeedRows = { purchase: [], sales: [] };

/** 种子数据注册：由 priceAdjustData 调用。 */
export function registerPriceAdjustSeedRows(side, rows = []) {
  priceAdjustSeedRows[side] = rows;
}

function storageKeyFor(side) {
  return side === 'sales' ? SALES_ADJUST_STORAGE_KEY : PURCHASE_ADJUST_STORAGE_KEY;
}

/** 调整单本地 Mock 存储键：详情页订阅变更用。 */
export function getPriceAdjustStorageKey(side) {
  return storageKeyFor(side);
}

export function loadAllPriceAdjustments(side) {
  return readMockRows(storageKeyFor(side), priceAdjustSeedRows[side] || []);
}

export function loadPriceAdjustById(side, id) {
  if (!id) return null;
  return loadAllPriceAdjustments(side).find((row) => row.id === id) || null;
}

export function findPriceAdjustByNo(side, adjustNo) {
  if (!adjustNo) return null;
  return loadAllPriceAdjustments(side).find((row) => row.adjustNo === adjustNo) || null;
}

export function persistPriceAdjust(row) {
  const next = normalizePriceAdjustRow(row);
  const rows = loadAllPriceAdjustments(next.side);
  const index = rows.findIndex((item) => item.id === next.id);
  const nextRows = index < 0
    ? [next, ...rows]
    : rows.map((item, itemIndex) => (itemIndex === index ? next : item));
  writeMockRows(storageKeyFor(next.side), nextRows);
  return next;
}

export function deletePriceAdjustById(side, id) {
  const nextRows = loadAllPriceAdjustments(side).filter((item) => item.id !== id);
  writeMockRows(storageKeyFor(side), nextRows);
  return nextRows;
}

let lineSequence = 0;

export function createPriceAdjustLineId() {
  return `price-adjust-line-${Date.now()}-${lineSequence++}`;
}

/** 明细商品信息按所选商品实时带出（商品编码、条码、名称、基本单位）。 */
export function enrichPriceAdjustLine(line = {}) {
  const sku = skuOptions.find((item) => item.value === line.product);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || getProductBarcodes(line.product),
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '',
  };
}

export function refreshPriceAdjustLines(lines = []) {
  return lines.map((line) => enrichPriceAdjustLine(line));
}

export function normalizePriceAdjustRow(row) {
  const lines = refreshPriceAdjustLines(row.lines || []);
  return {
    ...row,
    lines,
    lineCount: lines.length,
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

/* ------------------------------------------------------------------ *
 * 状态—功能矩阵（主PRD §6.4）
 * ------------------------------------------------------------------ */

export function canEditPriceAdjust(row) {
  return row?.auditStatus === 'draft' || row?.auditStatus === 'rejected';
}

export function canSubmitPriceAdjust(row) {
  return canEditPriceAdjust(row);
}

export function canDeletePriceAdjust(row) {
  return canEditPriceAdjust(row);
}

export function canApprovePriceAdjust(row) {
  return row?.auditStatus === 'pending';
}

export function canRejectPriceAdjust(row) {
  return row?.auditStatus === 'pending';
}

export function canViewPriceList(row) {
  return row?.auditStatus === 'approved';
}

export function getPriceAdjustStatusBadges(row) {
  if (!row?.auditStatus) return [];
  return [{
    label: priceAdjustStatusLabels[row.auditStatus] || row.auditStatus,
    tone: priceAdjustStatusBadgeTones[row.auditStatus] || 'neutral',
  }];
}

/* ------------------------------------------------------------------ *
 * 校验：保存草稿与提交（R05、R06；新增编辑页 Demo PRD §4）
 * ------------------------------------------------------------------ */

/** 明细行内错误：同一商品只能出现一次（R04）；文案与新增编辑页 Demo PRD §4.1 一致。 */
export const DUPLICATE_PRODUCT_MESSAGE = '该商品已存在，请勿重复添加';

/** 同一商品只能出现一次；返回重复行下标，无重复返回 -1（R04）。 */
export function findDuplicateProductLineIndex(lines = []) {
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const product = lines[index]?.product;
    if (!product) continue;
    if (seen.has(product)) return index;
    seen.add(product);
  }
  return -1;
}

/** 重复商品的行 id 列表（同一商品只保留首行）。 */
export function collectDuplicateProductLineIds(lines = []) {
  const seen = new Set();
  const duplicated = [];
  for (const line of lines) {
    if (!line?.product) continue;
    if (seen.has(line.product)) duplicated.push(line.id);
    else seen.add(line.product);
  }
  return duplicated;
}

/** 选品/明细变化时同步重复商品的行内错误；只维护本规则文案，保留其他行内错误。 */
export function syncDuplicateLineErrors(lines, setLineErrors) {
  setLineErrors((current) => {
    const duplicatedIds = new Set(collectDuplicateProductLineIds(lines));
    const next = { ...current };
    let changed = false;

    for (const [lineId, rowErrors] of Object.entries(current)) {
      if (rowErrors.productCode === DUPLICATE_PRODUCT_MESSAGE && !duplicatedIds.has(lineId)) {
        const nextRowErrors = { ...rowErrors };
        delete nextRowErrors.product;
        if (Object.keys(nextRowErrors).length) next[lineId] = nextRowErrors;
        else delete next[lineId];
        changed = true;
      }
    }

    for (const lineId of duplicatedIds) {
      if (!current[lineId]?.product) {
        next[lineId] = { ...(next[lineId] || {}), productCode: DUPLICATE_PRODUCT_MESSAGE };
        changed = true;
      }
    }

    return changed ? next : current;
  });
}

function collectLineErrors(form, { forSubmit }) {
  const lineErrors = {};
  const messages = [];

  form.lines?.forEach((line, index) => {
    const rowErrors = {};
    if (!line.product && forSubmit) rowErrors.productCode = '请选择商品';
    if (line.price === '' || line.price == null) {
      if (forSubmit) rowErrors.price = '请填写大于0的含税单价';
    } else if (Number(line.price) <= 0) {
      rowErrors.price = forSubmit ? '请填写大于0的含税单价' : '含税单价必须大于0';
    }
    if (line.taxRate === '' || line.taxRate == null) {
      if (forSubmit) rowErrors.taxRate = '请选择税率';
    } else if (!taxRateOptions.some((option) => option.value === String(line.taxRate))) {
      rowErrors.taxRate = '税率最多2位小数，允许0%';
    }
    if (Object.keys(rowErrors).length) {
      lineErrors[line.id] = rowErrors;
      messages.push(`第${index + 1}行${Object.values(rowErrors)[0]}`);
    }
  });

  for (const lineId of collectDuplicateProductLineIds(form.lines || [])) {
    lineErrors[lineId] = { ...(lineErrors[lineId] || {}), productCode: DUPLICATE_PRODUCT_MESSAGE };
    messages.push(DUPLICATE_PRODUCT_MESSAGE);
  }

  return { lineErrors, message: messages[0] };
}

function validateLinesForSave(form) {
  if (!form.lines?.length) return { message: '请至少添加一行商品明细' };
  const result = collectLineErrors(form, { forSubmit: false });
  if (Object.keys(result.lineErrors).length) return result;
  return null;
}

function validateLinesForSubmit(form) {
  if (!form.lines?.length) return { message: '请至少添加一行商品明细' };
  const result = collectLineErrors(form, { forSubmit: true });
  if (Object.keys(result.lineErrors).length) return result;
  return null;
}

/** 保存草稿：允许供应商、币别、价格、税率留空待补；零值、负值与重复商品阻断。 */
export function validatePriceAdjustForSave(form) {
  return validateLinesForSave(form);
}

/** 提交（采购）：单头供应商、币别完整，明细每行商品、含税单价、税率完整。 */
export function validatePurchaseAdjustForSubmit(form) {
  const fieldErrors = {};
  if (!form.supplier) fieldErrors.supplier = emptyFieldMessage('供应商');
  if (!form.currency) fieldErrors.currency = emptyFieldMessage('币别');
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return validateLinesForSubmit(form);
}

/** 提交（销售）：单头面向范围及对应范围值、币别完整，明细每行商品、含税单价、税率完整。 */
export function validateSalesAdjustForSubmit(form) {
  const fieldErrors = {};
  if (!form.range) fieldErrors.range = emptyFieldMessage('面向范围');
  if (form.range === 'level' && !form.customerLevel) fieldErrors.customerLevel = emptyFieldMessage('客户等级');
  if (form.range === 'customer' && !form.customer) fieldErrors.customer = emptyFieldMessage('客户');
  if (!form.currency) fieldErrors.currency = emptyFieldMessage('币别');
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return validateLinesForSubmit(form);
}

/* ------------------------------------------------------------------ *
 * 状态流转：提交、审核（写入价目表）、驳回、删除
 * ------------------------------------------------------------------ */

export function applySubmitPriceAdjust(row) {
  const stamp = nowStamp();
  return persistPriceAdjust({
    ...row,
    auditStatus: 'pending',
    submittedAt: stamp,
    submitter: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyApprovePriceAdjust(row) {
  const stamp = nowStamp();
  const next = persistPriceAdjust({
    ...row,
    auditStatus: 'approved',
    auditor: '当前用户',
    auditTime: stamp,
    updatedAt: stamp,
    updater: '当前用户',
    // Demo 标记：本次审核通过后本地更新了价目表（弹窗与Mock PRD §4）。
    isMock: true,
  });
  // Demo Mock（弹窗与Mock PRD §4）：审核通过后按明细新增或覆盖价目表当前价。
  applyApprovedAdjustmentToPriceList(next);
  return next;
}

export function applyRejectPriceAdjust(row, returnComment) {
  const stamp = nowStamp();
  return persistPriceAdjust({
    ...row,
    auditStatus: 'rejected',
    auditor: '当前用户',
    auditTime: stamp,
    rejectedAt: stamp,
    returnComment,
    updatedAt: stamp,
    updater: '当前用户',
  });
}

/* ------------------------------------------------------------------ *
 * 追溯：调整单 → 价目表预置筛选（R13）
 * ------------------------------------------------------------------ */

export function buildPriceListPresetFilters(row) {
  if (row?.side === 'sales') {
    const preset = { range: [row.range], currency: row.currency };
    if (row.range === 'level') preset.level = [row.customerLevel];
    if (row.range === 'customer') preset.customer = row.customer;
    return preset;
  }
  return { supplier: row?.supplier, currency: row?.currency };
}

/* ------------------------------------------------------------------ *
 * 列表筛选
 * ------------------------------------------------------------------ */

export function filterPurchaseAdjustRows(row, filters = {}) {
  const adjustNo = String(filters.adjustNo || '').trim().toLowerCase();
  const productCode = String(filters.productCode || '').trim().toLowerCase();
  const barcode = String(filters.barcode || '').trim().toLowerCase();

  return (!adjustNo || String(row.adjustNo || '').toLowerCase().includes(adjustNo))
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.currency || row.currency === filters.currency)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)))
    && matchesDateRange(row.createdAt, filters.createdAtRange);
}

export function filterSalesAdjustRows(row, filters = {}) {
  const adjustNo = String(filters.adjustNo || '').trim().toLowerCase();
  const productCode = String(filters.productCode || '').trim().toLowerCase();
  const barcode = String(filters.barcode || '').trim().toLowerCase();

  return (!adjustNo || String(row.adjustNo || '').toLowerCase().includes(adjustNo))
    && matchesMultiSelect(row.range, filters.range)
    && matchesMultiSelect(row.customerLevel, filters.customerLevel)
    && (!filters.customer || row.customer === filters.customer)
    && (!filters.currency || row.currency === filters.currency)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)))
    && (!barcode || row.lines?.some((line) => String(line.barcode || '').toLowerCase().includes(barcode)))
    && matchesDateRange(row.createdAt, filters.createdAtRange);
}
