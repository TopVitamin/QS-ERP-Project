import { currencyOptions, skuOptions, taxRateOptions } from '../data/masterData.js';
import { getSelectableCustomerOptions } from '../data/customerData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { nextDocumentNo } from './documentNo.js';
import { EMPTY_PLACEHOLDER } from './format.js';
import { writeMockRows } from './mockStorage.js';
import { loadAllOutbounds } from './salesOutboundLogic.js';
import {
  computeSourceOutboundOccupancy,
  enrichSalesReturnLine,
  loadAllSalesReturns,
  normalizeSalesReturnRow,
  nowStamp,
  SALES_RETURN_STORAGE_KEY,
} from './salesReturnLogic.js';

/**
 * 销售退货单列表导入（一期正式能力）：按「单据序号」把多行归并为一张退货单。
 * 依据《销售退货单前端Demo版PRD_列表页》§8 与《销售退货单主PRD》R20：
 * 按保存草稿口径整批校验，任一行失败则整批不导入；全部通过时生成 N 张草稿（草稿+正常，单号按 XSTH 规则），仍须逐单提交审核。
 * 销售退货为收货业务，不按可用库存卡数量（主 PRD R09、R20）；校验与落库只在本文件实现，不改动 salesReturnLogic 的既有行为。
 */

export const SALES_RETURN_IMPORT_FIELDS = [
  { key: 'documentKey', label: '单据序号', required: true, example: 'A001' },
  { key: 'customer', label: '客户', required: true, example: 'CUS000001' },
  { key: 'currency', label: '币别', required: true, options: currencyOptions, example: '人民币' },
  { key: 'warehouse', label: '收货仓库', required: true, example: 'LWH000001' },
  { key: 'returnDeadline', label: '退货截止日期', required: true, example: '2026-10-31' },
  { key: 'sourceOutboundNo', label: '来源销售出库单号', example: 'XSCK-20260917-0001' },
  { key: 'remark', label: '备注', example: '' },
  { key: 'productCode', label: '商品编码', required: true, example: 'SP0101020001' },
  { key: 'quantity', label: '退货数量', required: true, example: '10' },
  { key: 'price', label: '含税单价', example: '169' },
  { key: 'taxRate', label: '税率', example: '13' },
];

/** 同组单头字段：同一「单据序号」的各行必须一致（列表页 §8.2） */
const GROUP_HEADER_FIELDS = [
  { key: 'customer', label: '客户' },
  { key: 'currency', label: '币别' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'returnDeadline', label: '退货截止日期' },
  { key: 'sourceOutboundNo', label: '来源销售出库单号' },
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

function findSourceLine(outbound, sku) {
  const index = (outbound?.lines || []).findIndex((line) => line.product === sku.value || line.productCode === sku.skuCode);
  if (index < 0) return null;
  return { line: outbound.lines[index], lineNo: index + 1 };
}

/**
 * 分组导入校验：返回逐行结果与归并后的单据信息。
 * item.document 只在行校验通过时生成，commit 直接据此落库，避免二次解析文件。
 */
export function validateSalesReturnImport(target, headers, rows) {
  const fields = SALES_RETURN_IMPORT_FIELDS;
  const fieldByLabel = new Map(fields.map((field) => [field.label, field]));
  const missingColumns = fields.filter((field) => field.required && !headers.includes(field.label)).map((field) => field.label);
  const unknownColumns = headers.filter((header) => header && !fieldByLabel.has(header));

  const customerOptions = getSelectableCustomerOptions();
  const warehouseOptions = getSelectableLogicalWarehouseOptions();
  const outboundRows = loadAllOutbounds(salesOutbounds);
  const occupancy = computeSourceOutboundOccupancy(loadAllSalesReturns([]));
  /** 同一原出库单行在本次文件内的已分配数量：草稿不占额度，但同批导入不允许累计超出剩余可退额度 */
  const allocatedByOutboundLine = new Map();
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

    // 单头必填（列表页 §8.3）
    if (!values.customer) errors.push(`第${rowNumber}行客户不能为空`);
    if (!values.currency) errors.push(`第${rowNumber}行币别不能为空`);
    if (!values.warehouse) errors.push(`第${rowNumber}行收货仓库不能为空`);
    if (!values.returnDeadline) errors.push(`第${rowNumber}行退货截止日期不能为空`);

    // 单头取值：客户审核通过且启用，仓库、币别取自档案
    const customer = matchOption(values.customer, customerOptions);
    if (values.customer && !customer) errors.push(`第${rowNumber}行所选客户不可用`);
    const currency = matchOption(values.currency, currencyOptions);
    if (values.currency && !currency) errors.push(`第${rowNumber}行币别不在可选值范围`);
    const warehouse = matchOption(values.warehouse, warehouseOptions);
    if (values.warehouse && !warehouse) errors.push(`第${rowNumber}行所选收货仓库不可用`);
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

    // 来源销售出库单：须为已审核的原出库单，商品在来源明细中，收货仓库与来源一致（列表页 §8.2）
    const sourceOutboundNo = values.sourceOutboundNo || '';
    let sourceOutbound = null;
    let sourceLine = null;
    if (sourceOutboundNo) {
      sourceOutbound = outboundRows.find((row) => row.outboundNo === sourceOutboundNo && row.auditStatus === 'approved') || null;
      if (!sourceOutbound) {
        errors.push(`第${rowNumber}行来源销售出库单号不是已审核的销售出库单`);
      } else {
        if (sku) {
          sourceLine = findSourceLine(sourceOutbound, sku);
          if (!sourceLine) errors.push(`第${rowNumber}行商品不在来源销售出库单中`);
        }
        if (warehouse && sourceOutbound.warehouse !== warehouse.value) {
          errors.push(`第${rowNumber}行收货仓库须与来源销售出库单仓库一致`);
        }
      }
    }

    // 价格：非空非负；来源合法且留空时按原出库价带入（列表页 §8.2）
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

    // 税率：留空时来源行随原出库税率带出，无来源按新增页默认 13%
    const taxRateOption = values.taxRate ? matchOption(values.taxRate, taxRateOptions) : null;
    if (values.taxRate && !taxRateOption) errors.push(`第${rowNumber}行税率不在可选值范围`);
    const taxRate = values.taxRate
      ? (taxRateOption?.value ?? '')
      : String(sourceLine?.line.taxRate ?? '13');

    // 溯源不超剩余可退额度（草稿不占额度；同批文件内同一原出库单行累计校验）
    if (sourceLine && Number.isFinite(quantity) && quantity > 0) {
      const occupied = occupancy.get(`${sourceOutbound.id}::${sourceLine.line.id}`) || 0;
      const remaining = Math.max(0, Number(sourceLine.line.quantity || 0) - occupied);
      const used = allocatedByOutboundLine.get(sourceLine.line.id) || 0;
      if (quantity > remaining - used) errors.push(`第${rowNumber}行退货数量超过该出库单剩余可退额度`);
      else allocatedByOutboundLine.set(sourceLine.line.id, used + quantity);
    }

    // 同组单头字段一致性（列表页 §8.2）
    const headerValues = {
      customer: customer?.value || values.customer || '',
      currency: currency?.value || values.currency || '',
      warehouse: warehouse?.value || values.warehouse || '',
      returnDeadline,
      sourceOutboundNo,
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
        sourceOutboundId: sourceOutbound?.id || '',
        sourceOutboundNo: sourceOutbound?.outboundNo || '',
      },
      line: enrichSalesReturnLine({
        id: `sales-return-line-import-${Date.now()}-${index}`,
        sourceOutboundLineId: sourceLine?.line.id || '',
        sourceOutboundLine: sourceLine ? `${sourceOutbound.outboundNo} 行${sourceLine.lineNo}` : '',
        product: sku.value,
        productCode: sku.skuCode || sku.value,
        barcode: sku.barcode || '',
        productName: sku.productName || sku.label || '',
        unit: sku.unit || '个',
        quantity,
        price,
        taxRate,
        returnedQty: 0,
        inTransitQty: 0,
      }),
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
 * 整批落库：任一行校验失败则整批不导入；全部通过时生成 N 张草稿（草稿+正常，单号按 XSTH 规则）。
 * 草稿与手工新建草稿同权：可编辑、可提交、可删除（列表页 §8.4）。
 */
export function commitSalesReturnImport(target, { fileName, validation, operator } = {}) {
  const failureItems = (validation?.items || []).filter((item) => item.action === 'error' || !item.document);
  if (failureItems.length || validation?.headerErrors?.length) {
    return { status: 'failed', documents: [], failureItems };
  }

  const existingRows = loadAllSalesReturns([]);
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
    const returnNo = nextDocumentNo('XSTH', today, existingNos);
    existingNos.push(returnNo);
    return normalizeSalesReturnRow({
      id: `sales-return-import-${Date.now()}-${index}`,
      returnNo,
      customer: group.header.customer,
      currency: group.header.currency,
      warehouse: group.header.warehouse,
      returnDeadline: group.header.returnDeadline,
      sourceOutboundId: group.header.sourceOutboundId,
      sourceOutboundNo: group.header.sourceOutboundNo,
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

  writeMockRows(SALES_RETURN_STORAGE_KEY, [...createdRows, ...existingRows]);
  return { status: 'done', documents: createdRows, failureItems: [] };
}
