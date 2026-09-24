import { currencyOptions, skuOptions, taxRateOptions } from '../data/masterData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import { EMPTY_PLACEHOLDER } from './format.js';
import { writeMockRows } from './mockStorage.js';
import {
  computeInboundLineRemaining,
  createReturnLineId,
  loadAllReturns,
  loadSourceInboundByNo,
  normalizeReturnRow,
  nowStamp,
  PURCHASE_RETURN_STORAGE_KEY,
} from './purchaseReturnLogic.js';

/**
 * 采购退货单列表导入（一期正式能力）：按「单据序号」把多行归并为一张退货单。
 * 依据《采购退货单前端Demo版PRD_列表页》§7 与《采购退货单主PRD》R15：
 * 按保存草稿口径整批校验，任一行失败则整批不导入；全部通过时生成 N 张草稿（草稿+正常，单号按 CGTH 规则），仍须逐单提交审核。
 * 校验与落库只在本文件实现，transferTargets 仅挂载钩子；不改动 purchaseReturnLogic 的既有行为。
 */

export const PURCHASE_RETURN_IMPORT_FIELDS = [
  { key: 'documentKey', label: '单据序号', required: true, example: 'A001' },
  { key: 'supplier', label: '供应商', required: true, example: 'SUP000002' },
  { key: 'currency', label: '币别', required: true, options: currencyOptions, example: '人民币' },
  { key: 'warehouse', label: '出库仓库', required: true, example: 'LWH000002' },
  { key: 'returnDeadline', label: '退货截止日期', required: true, example: '2026-10-31' },
  { key: 'sourceInboundNo', label: '来源采购入库单号', example: 'CGRK-20260918-0001' },
  { key: 'remark', label: '备注', example: '' },
  { key: 'productCode', label: '商品编码', required: true, example: 'SP0101010001' },
  { key: 'quantity', label: '退货数量', required: true, example: '10' },
  { key: 'price', label: '含税单价', example: '113' },
  { key: 'taxRate', label: '税率', example: '13' },
];

/** 同组单头字段：同一「单据序号」的各行必须一致（列表页 §7.2） */
const GROUP_HEADER_FIELDS = [
  { key: 'supplier', label: '供应商' },
  { key: 'currency', label: '币别' },
  { key: 'warehouse', label: '出库仓库' },
  { key: 'returnDeadline', label: '退货截止日期' },
  { key: 'sourceInboundNo', label: '来源采购入库单号' },
  { key: 'remark', label: '备注' },
];

function normalizeText(value) {
  const text = String(value ?? '').trim();
  return text === EMPTY_PLACEHOLDER ? '' : text;
}

/** 主数据选项匹配：编码、名称、Code-Name 均可（Code-Name 展示规则；名称不一致时按编码前缀兜底） */
function matchOption(text, options = []) {
  const target = String(text || '').trim().toLowerCase();
  if (!target) return null;
  const exact = options.find((option) => [option.value, option.code, option.name, option.label]
    .filter(Boolean)
    .some((candidate) => String(candidate).trim().toLowerCase() === target));
  if (exact) return exact;
  const code = target.split(/\s+/)[0];
  return options.find((option) => String(option.value || '').trim().toLowerCase() === code) || null;
}

/** 兼容 Excel 日期显示：2026/10/31 18:00 → 2026-10-31 18:00:00 */
function normalizeDeadline(text) {
  const value = String(text || '').replaceAll('/', '-').replace('T', ' ').trim();
  const matched = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (!matched) return '';
  const [, year, month, day] = matched;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function findSourceLine(inbound, sku) {
  const index = (inbound?.lines || []).findIndex((line) => line.product === sku.value || line.productCode === sku.skuCode);
  if (index < 0) return null;
  return { line: inbound.lines[index], lineNo: index + 1 };
}

/**
 * 分组导入校验：返回逐行结果与归并后的单据信息。
 * item.document 只在行校验通过时生成，commit 直接据此落库，避免二次解析文件。
 */
export function validatePurchaseReturnImport(target, headers, rows) {
  const fields = PURCHASE_RETURN_IMPORT_FIELDS;
  const fieldByLabel = new Map(fields.map((field) => [field.label, field]));
  const missingColumns = fields.filter((field) => field.required && !headers.includes(field.label)).map((field) => field.label);
  const unknownColumns = headers.filter((header) => header && !fieldByLabel.has(header));

  const supplierOptions = getSelectableSupplierOptions();
  const warehouseOptions = getSelectableLogicalWarehouseOptions();
  /** 同一入库单行在本次文件内的已分配数量：草稿不占额度，但同批导入不允许累计超出剩余可退额度 */
  const allocatedByInboundLine = new Map();
  const groups = new Map();

  const items = rows.map((cells, index) => {
    const rowNumber = index + 2;
    const values = {};
    const errors = [];
    headers.forEach((header, cellIndex) => {
      const field = fieldByLabel.get(header);
      if (!field) return;
      values[field.key] = normalizeText(cells[cellIndex]);
    });

    const documentKey = values.documentKey || '';
    if (!documentKey) errors.push('「单据序号」不能为空');

    // 单头必填（列表页 §7.3）
    if (!values.supplier) errors.push(`第${rowNumber}行供应商不能为空`);
    if (!values.currency) errors.push(`第${rowNumber}行币别不能为空`);
    if (!values.warehouse) errors.push(`第${rowNumber}行出库仓库不能为空`);
    if (!values.returnDeadline) errors.push(`第${rowNumber}行退货截止日期不能为空`);

    // 单头取值：供应商审核通过且启用，仓库、币别取自档案
    const supplier = matchOption(values.supplier, supplierOptions);
    if (values.supplier && !supplier) errors.push(`第${rowNumber}行所选供应商不可用`);
    const currency = matchOption(values.currency, currencyOptions);
    if (values.currency && !currency) errors.push(`第${rowNumber}行币别不在可选值范围`);
    const warehouse = matchOption(values.warehouse, warehouseOptions);
    if (values.warehouse && !warehouse) errors.push(`第${rowNumber}行所选出库仓库不可用`);
    const returnDeadline = values.returnDeadline ? normalizeDeadline(values.returnDeadline) : '';
    if (values.returnDeadline && !returnDeadline) errors.push(`第${rowNumber}行退货截止日期格式不正确`);

    // 明细：商品存在且数量为正整数
    const sku = matchOption(values.productCode, skuOptions);
    if (!values.productCode) errors.push(`第${rowNumber}行商品编码不能为空`);
    else if (!sku) errors.push(`第${rowNumber}行商品编码不存在`);
    const quantityText = values.quantity || '';
    const quantity = Number(quantityText);
    if (!quantityText) errors.push(`第${rowNumber}行退货数量不能为空`);
    else if (!Number.isFinite(quantity) || quantity <= 0) errors.push(`第${rowNumber}行退货数量必须大于0`);
    else if (!Number.isInteger(quantity)) errors.push(`第${rowNumber}行退货数量必须为整数`);

    // 来源采购入库单：须为已审核的原入库单，且商品在来源明细中
    const sourceInboundNo = values.sourceInboundNo || '';
    let sourceInbound = null;
    let sourceLine = null;
    if (sourceInboundNo) {
      sourceInbound = loadSourceInboundByNo(sourceInboundNo);
      if (!sourceInbound || sourceInbound.auditStatus !== 'approved') {
        sourceInbound = null;
        errors.push(`第${rowNumber}行来源采购入库单号不是已审核的采购入库单`);
      } else if (sku) {
        sourceLine = findSourceLine(sourceInbound, sku);
        if (!sourceLine) errors.push(`第${rowNumber}行商品不在来源采购入库单中`);
      }
    }

    // 价格：非空非负；来源合法且留空时按原入库价带入（列表页 §7.3）
    const priceText = values.price || '';
    let price = priceText === '' ? '' : Number(priceText);
    if (priceText === '') {
      if (sourceLine) price = Number(sourceLine.line.price || 0);
      else errors.push(`第${rowNumber}行含税单价不能为空`);
    } else if (!Number.isFinite(price)) {
      errors.push(`第${rowNumber}行含税单价格式不正确`);
    } else if (price < 0) {
      errors.push(`第${rowNumber}行含税单价不能为负数`);
    }

    // 税率：留空时来源行随原入库税率带出，无来源按新增页默认 13%
    const taxRateOption = values.taxRate ? matchOption(values.taxRate, taxRateOptions) : null;
    if (values.taxRate && !taxRateOption) errors.push(`第${rowNumber}行税率不在可选值范围`);
    const taxRate = values.taxRate
      ? (taxRateOption?.value ?? '')
      : String(sourceLine?.line.taxRate ?? '13');

    // 有来源不超剩余可退额度（草稿不占额度；同批文件内同一入库单行累计校验）
    if (sourceLine && Number.isFinite(quantity) && quantity > 0) {
      const remaining = computeInboundLineRemaining(sourceLine.line.id) ?? 0;
      const used = allocatedByInboundLine.get(sourceLine.line.id) || 0;
      if (quantity > remaining - used) errors.push(`第${rowNumber}行退货数量超过该入库单剩余可退额度`);
      else allocatedByInboundLine.set(sourceLine.line.id, used + quantity);
    }

    // 同组单头字段一致性（列表页 §7.2）
    const headerValues = {
      supplier: supplier?.value || values.supplier || '',
      currency: currency?.value || values.currency || '',
      warehouse: warehouse?.value || values.warehouse || '',
      returnDeadline,
      sourceInboundNo,
      remark: values.remark || '',
    };
    if (documentKey) {
      const group = groups.get(documentKey) || { key: documentKey, headerValues: null, rowNumbers: [] };
      if (!group.headerValues) group.headerValues = headerValues;
      else {
        GROUP_HEADER_FIELDS.forEach((field) => {
          if (group.headerValues[field.key] !== headerValues[field.key]) {
            errors.push(`单据序号${documentKey}的${field.label}与同组其他行不一致`);
          }
        });
      }
      group.rowNumbers.push(rowNumber);
      groups.set(documentKey, group);
    }

    const document = errors.length ? null : {
      key: documentKey,
      header: {
        ...headerValues,
        sourceInboundId: sourceInbound?.id || '',
      },
      line: {
        id: createReturnLineId(),
        sourceInboundLineId: sourceLine?.line.id || '',
        sourceInboundLine: sourceLine ? `${sourceInbound.inboundNo} 行${sourceLine.lineNo}` : '',
        product: sku.value,
        productCode: sku.skuCode || sku.value,
        barcode: sku.barcode || '',
        productName: sku.productName || sku.label || '',
        unit: sku.unit || '个',
        quantity,
        price,
        taxRate,
        receivedQty: 0,
        inTransitQty: 0,
      },
    };

    return {
      rowNumber,
      documentKey,
      values,
      errors,
      action: errors.length ? 'error' : 'create',
      document,
    };
  });

  const errorCount = items.filter((item) => item.action === 'error').length;
  return {
    items,
    groups: [...groups.values()],
    summary: {
      total: items.length,
      create: items.length - errorCount,
      update: 0,
      error: errorCount,
      documentCount: groups.size,
    },
    unknownColumns,
    headerErrors: missingColumns.map((label) => `缺少必填列「${label}」`),
  };
}

/**
 * 整批落库：任一行校验失败则整批不导入；全部通过时生成 N 张草稿（草稿+正常，单号按 CGTH 规则）。
 * 草稿与手工新建草稿同权：可编辑、可提交、可删除（列表页 §7.3）。
 */
export function commitPurchaseReturnImport(target, { fileName, validation, operator } = {}) {
  const failureItems = (validation?.items || []).filter((item) => item.action === 'error' || !item.document);
  if (failureItems.length || validation?.headerErrors?.length) {
    return { status: 'failed', documents: [], failureItems };
  }

  const existingRows = loadAllReturns();
  const existingNos = existingRows.map((row) => row.returnNo);
  const stamp = nowStamp();
  const today = stamp.slice(0, 10);
  const creator = operator || '当前用户';

  const groupMap = new Map();
  validation.items.forEach((item) => {
    const group = groupMap.get(item.document.key) || { header: item.document.header, lines: [] };
    group.lines.push(item.document.line);
    groupMap.set(item.document.key, group);
  });

  const createdRows = [...groupMap.values()].map((group, index) => {
    const returnNo = nextDocumentNo('CGTH', today, existingNos);
    existingNos.push(returnNo);
    return normalizeReturnRow({
      id: `return-import-${Date.now()}-${index}`,
      returnNo,
      supplier: group.header.supplier,
      currency: group.header.currency,
      warehouse: group.header.warehouse,
      returnDeadline: group.header.returnDeadline,
      sourceInboundNo: group.header.sourceInboundNo,
      sourceInboundId: group.header.sourceInboundId,
      remark: group.header.remark,
      auditStatus: 'draft',
      businessStatus: 'normal',
      lines: group.lines,
      creator,
      createdAt: stamp,
      updater: creator,
      updatedAt: stamp,
    });
  });

  writeMockRows(PURCHASE_RETURN_STORAGE_KEY, [...createdRows, ...existingRows]);
  return { status: 'done', documents: createdRows, failureItems: [] };
}
