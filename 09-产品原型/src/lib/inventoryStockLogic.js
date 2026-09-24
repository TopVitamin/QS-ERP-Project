/**
 * 库存共享服务：库存余额、预占记录与库存流水。
 *
 * 口径（《库存查询主PRD》《预占与冻结主PRD》《库存流水主PRD》）：
 * - 可用库存＝即时库存−预占库存−冻结库存；
 * - 预占由来源业务单据审核时占用，实际出库消耗、执行结束或取消释放；预占的占用与释放不记流水；
 * - 冻结、解冻是即时操作，只改冻结与可用，各生成一条库存流水；
 * - 只有已审核结果单改变即时库存并产生流水；
 * - 任何会让即时库存或可用库存为负的记账都阻止（INV-FR09）。
 *
 * 其他出入库、调拨等结果单记账统一走 `postStockEntries`，不在模块内自行改库存。
 */
import { skuOptions } from '../data/masterData.js';
import { products } from '../data/productData.js';
import {
  stockCompareSeeds,
  stockEventTypeLabels,
  stockFlowSeeds,
  stockReservationSeeds,
  stockRowSeeds,
} from '../data/inventoryStockData.js';
import {
  resolveLogicalWarehousePhysical,
  resolveLogicalWarehouseRow,
  resolvePhysicalWarehouseLabel,
} from '../data/warehouseData.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';

export const STOCK_STORAGE_KEY = 'qs-erp:inventory-stock:v1';
export const STOCK_RESERVATION_STORAGE_KEY = 'qs-erp:inventory-reservations:v1';
export const STOCK_FLOW_STORAGE_KEY = 'qs-erp:inventory-flows:v1';
export const STOCK_COMPARE_STORAGE_KEY = 'qs-erp:inventory-compare:v1';

export { stockEventTypeLabels };

export function nowStamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatSignedQty(value) {
  const number = Number(value || 0);
  if (number > 0) return `+${number}`;
  return String(number);
}

/** 四组变动明细统一按 `前 → 后（变动）` 表达；无变化显示 `x → x（0）`。 */
export function formatQtyChange(before, change) {
  const start = Number(before || 0);
  const delta = Number(change || 0);
  return `${start} → ${start + delta}（${formatSignedQty(delta)}）`;
}

// —— 库存余额 ——

export function loadStockRows() {
  return readMockRows(STOCK_STORAGE_KEY, stockRowSeeds);
}

/**
 * 写回库存行前统一补齐展示字段（逻辑仓 Code-Name、实体仓、库存状态、商品信息、可用库存）。
 * 其他出入库、调拨等模块也会调用本函数写回预占变化，统一在这里解析，
 * 避免任一模块在库存查询页之前写入「只有数量字段」的行、导致列表展示成 `-`。
 */
export function persistStockRows(rows) {
  writeMockRows(STOCK_STORAGE_KEY, rows.map((row) => resolveStockRow(row)));
}

export function persistStockRow(row) {
  upsertMockRow(STOCK_STORAGE_KEY, resolveStockRow(row));
}

export function computeAvailableQty(row) {
  return Number(row?.instantQty || 0) - Number(row?.reservedQty || 0) - Number(row?.frozenQty || 0);
}

export function resolveStockProduct(product) {
  const sku = skuOptions.find((option) => option.value === product) || {};
  const master = products.find((row) => row.code === (sku.skuCode || product));
  const barcodes = master?.barcodes?.length ? master.barcodes : (sku.barcode ? [sku.barcode] : []);
  return {
    productCode: sku.skuCode || product,
    productName: master?.name || sku.productName || '',
    unit: master?.unit || sku.unit || '',
    // 多条码合并展示用英文分号（《原型开发说明》「多条码展示」）
    barcode: barcodes.join(';'),
    barcodes,
  };
}

/** 库存行补齐展示字段：实体仓、库存状态、商品信息与可用库存。 */
export function resolveStockRow(row) {
  const logical = resolveLogicalWarehouseRow(row.logicalWarehouse);
  const physical = resolveLogicalWarehousePhysical(row.logicalWarehouse);
  const product = resolveStockProduct(row.product);
  return {
    ...row,
    logicalWarehouseCode: logical?.code || row.logicalWarehouse,
    logicalWarehouseLabel: logical ? `${logical.code} ${logical.name}` : row.logicalWarehouse,
    physicalWarehouse: physical.code || '',
    physicalWarehouseLabel: physical.label,
    stockStatus: logical?.stockStatus || '',
    isTransit: logical?.warehouseKind === 'transit',
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    barcode: product.barcode,
    barcodes: product.barcodes,
    instantQty: Number(row.instantQty || 0),
    reservedQty: Number(row.reservedQty || 0),
    frozenQty: Number(row.frozenQty || 0),
    availableQty: computeAvailableQty(row),
  };
}

/** 记账前按需建行：结果单落在一个尚无库存记录的逻辑仓时，先建 0 行，避免「没有库存记录」直接报错。 */
export function ensureStockRow(logicalWarehouse, product, time) {
  const rows = loadStockRows();
  const existing = rows.find((row) => row.logicalWarehouse === logicalWarehouse && row.product === product);
  if (existing) return existing;
  const row = {
    id: `stock-auto-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    logicalWarehouse,
    product,
    instantQty: 0,
    reservedQty: 0,
    frozenQty: 0,
    updatedAt: time || nowStamp(),
  };
  persistStockRows([...rows, row]);
  return row;
}

export function listStockRows() {
  return loadStockRows().map(resolveStockRow);
}

export function getStockRow(logicalWarehouse, product) {
  const row = loadStockRows().find((item) => item.logicalWarehouse === logicalWarehouse && item.product === product);
  return row ? resolveStockRow(row) : null;
}

/** 商品在该逻辑仓是否还有可出数量（含无库存行时按 0 计）。 */
export function getAvailableStock(logicalWarehouse, product) {
  const row = loadStockRows().find((item) => item.logicalWarehouse === logicalWarehouse && item.product === product);
  return row ? computeAvailableQty(row) : 0;
}

// —— 预占 ——

export function loadReservations() {
  return readMockRows(STOCK_RESERVATION_STORAGE_KEY, stockReservationSeeds);
}

export function persistReservations(rows) {
  writeMockRows(STOCK_RESERVATION_STORAGE_KEY, rows);
}

/** 「预占库存」列「查看来源」的来源单据行清单（库存查询主PRD R11）。 */
export function listReservationsForStock(logicalWarehouse, product) {
  return loadReservations()
    .filter((row) => row.logicalWarehouse === logicalWarehouse && row.product === product && row.status === 'active')
    .map((row) => ({ ...row, remainingQty: Math.max(0, Number(row.reservedQty || 0) - Number(row.consumedQty || 0) - Number(row.releasedQty || 0)) }))
    .filter((row) => row.remainingQty > 0)
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

function persistReservation(row) {
  upsertMockRow(STOCK_RESERVATION_STORAGE_KEY, row);
}

/** 审核时占用可用量；可用不足时报错（《预占与冻结主PRD》F01、R02）。 */
export function reserveStock({ logicalWarehouse, product, quantity, sourceType, sourceNo, sourceLineNo = 1, time }) {
  const amount = Number(quantity || 0);
  if (amount <= 0) return null;
  const rows = loadStockRows();
  const index = rows.findIndex((row) => row.logicalWarehouse === logicalWarehouse && row.product === product);
  if (index < 0) throw new Error('该逻辑仓没有此商品的库存记录，不能占用可用量');
  const row = rows[index];
  if (computeAvailableQty(row) < amount) {
    throw new Error(`可用库存不足，当前可用 ${computeAvailableQty(row)}`);
  }
  const nextRow = { ...row, reservedQty: Number(row.reservedQty || 0) + amount, updatedAt: time || nowStamp() };
  const nextRows = [...rows];
  nextRows[index] = nextRow;
  persistStockRows(nextRows);

  const reservation = {
    id: `res-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    logicalWarehouse,
    product,
    sourceType,
    sourceNo,
    sourceLineNo,
    reservedQty: amount,
    consumedQty: 0,
    releasedQty: 0,
    status: 'active',
    createdAt: time || nowStamp(),
  };
  persistReservation(reservation);
  return { row: nextRow, reservation };
}

/**
 * 作用在内存副本上，不写库；调用方校验全部通过后再统一落库，避免批次部分失败时预占被改了一半。
 */
function applyReservationChange(reservations, { logicalWarehouse, product, sourceNo, sourceLineNo, consumeReserved = 0, releaseReserved = 0, time }) {
  let consumeLeft = Number(consumeReserved || 0);
  let releaseLeft = Number(releaseReserved || 0);
  if (consumeLeft <= 0 && releaseLeft <= 0) return reservations;

  const candidates = reservations
    .filter((row) => row.logicalWarehouse === logicalWarehouse && row.product === product && row.status === 'active')
    .filter((row) => !sourceNo || (row.sourceNo === sourceNo && (sourceLineNo == null || row.sourceLineNo === sourceLineNo)))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

  let next = reservations;
  for (const record of candidates) {
    if (consumeLeft <= 0 && releaseLeft <= 0) break;
    const remaining = Math.max(0, Number(record.reservedQty || 0) - Number(record.consumedQty || 0) - Number(record.releasedQty || 0));
    if (remaining <= 0) continue;
    const consume = Math.min(consumeLeft, remaining);
    const release = Math.min(releaseLeft, remaining - consume);
    if (consume <= 0 && release <= 0) continue;
    consumeLeft -= consume;
    releaseLeft -= release;
    const consumedQty = Number(record.consumedQty || 0) + consume;
    const releasedQty = Number(record.releasedQty || 0) + release;
    const closed = consumedQty + releasedQty >= Number(record.reservedQty || 0);
    next = next.map((row) => (row.id === record.id
      ? { ...row, consumedQty, releasedQty, status: closed ? 'closed' : 'active', updatedAt: time || nowStamp() }
      : row));
  }
  return next;
}

// —— 记账与流水 ——

/** 流水行补齐展示字段（逻辑仓 Code-Name、实体仓、库存状态、商品信息与四组变动明细文本）。 */
export function resolveStockFlow(row) {
  const logical = resolveLogicalWarehouseRow(row.logicalWarehouse);
  const physical = resolveLogicalWarehousePhysical(row.logicalWarehouse);
  const product = resolveStockProduct(row.product);
  return {
    ...row,
    logicalWarehouseLabel: logical ? `${logical.code} ${logical.name}` : row.logicalWarehouse,
    physicalWarehouse: physical.code || '',
    physicalWarehouseLabel: physical.label,
    stockStatus: logical?.stockStatus || '',
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    barcode: product.barcode,
    barcodes: product.barcodes,
    eventTypeLabel: stockEventTypeLabels[row.eventType] || row.eventType,
    // 变动方向由即时库存的作用方向决定；冻结、解冻不改变即时库存，留空（《库存流水主PRD》R06）
    direction: row.direction || (Number(row.instantChange || 0) > 0 ? 'increase' : Number(row.instantChange || 0) < 0 ? 'decrease' : ''),
    // 页面与导出按同一表达式 `前 → 后（变动）`，导出直接读这四个字段
    instantChangeText: formatQtyChange(row.instantBefore, row.instantChange),
    availableChangeText: formatQtyChange(row.availableBefore, row.availableChange),
    reservedChangeText: formatQtyChange(row.reservedBefore, row.reservedChange),
    frozenChangeText: formatQtyChange(row.frozenBefore, row.frozenChange),
  };
}

export function loadStockFlows() {
  return readMockRows(STOCK_FLOW_STORAGE_KEY, stockFlowSeeds)
    .map(resolveStockFlow)
    .sort((left, right) => String(right.time || '').localeCompare(String(left.time || '')));
}

/** 写回流水：统一在这里补齐展示字段，避免只写数量字段导致列表按库存状态、逻辑仓筛不到。 */
export function appendStockFlows(rows) {
  if (!rows.length) return;
  const existing = readMockRows(STOCK_FLOW_STORAGE_KEY, stockFlowSeeds);
  writeMockRows(STOCK_FLOW_STORAGE_KEY, [...rows.map(resolveStockFlow), ...existing]);
}

/**
 * 结果单记账、冻结、解冻的统一入口。
 *
 * entries: [{
 *   logicalWarehouse, product,
 *   instantDelta = 0,                     // 即时库存增减
 *   frozenDelta = 0,                      // 冻结增减
 *   consumeReserved = 0, releaseReserved = 0, // 预占消耗、释放（正数）
 *   reservationSourceNo, reservationSourceLineNo,  // 定位预占记录；不传则按该行全部有效预占依次处理
 * }]
 * meta: { eventType, sourceType, sourceNo, businessType, operator, time }
 *
 * 返回本次生成的流水行；任一行校验不通过则整批不生效并抛错（不记负数）。
 */
export function postStockEntries(entries, meta = {}) {
  const list = (entries || []).filter(Boolean);
  if (!list.length) return [];

  const rows = loadStockRows();
  const nextRows = [...rows];
  let nextReservations = loadReservations();
  const time = meta.time || nowStamp();
  const operator = meta.operator || '当前用户';
  const flows = [];

  list.forEach((entry) => {
    const index = nextRows.findIndex((row) => row.logicalWarehouse === entry.logicalWarehouse && row.product === entry.product);
    if (index < 0) throw new Error(`库存行不存在：${entry.logicalWarehouse} ${entry.product}`);

    const row = nextRows[index];
    const instantBefore = Number(row.instantQty || 0);
    const reservedBefore = Number(row.reservedQty || 0);
    const frozenBefore = Number(row.frozenQty || 0);
    const availableBefore = computeAvailableQty(row);

    const instantChange = Number(entry.instantDelta || 0);
    const frozenChange = Number(entry.frozenDelta || 0);
    const reservedChange = -(Number(entry.consumeReserved || 0) + Number(entry.releaseReserved || 0));

    const instantAfter = instantBefore + instantChange;
    const frozenAfter = frozenBefore + frozenChange;
    const reservedAfter = reservedBefore + reservedChange;
    if (instantAfter < 0) throw new Error('即时库存不足，本次记账被阻止');
    if (reservedAfter < 0) throw new Error('预占数量不足，本次记账被阻止');
    if (frozenAfter < 0) throw new Error('冻结库存不足，本次操作被阻止');
    const availableAfter = instantAfter - reservedAfter - frozenAfter;
    if (availableAfter < 0) throw new Error('可用库存不足，本次操作被阻止');

    nextRows[index] = {
      ...row,
      instantQty: instantAfter,
      reservedQty: reservedAfter,
      frozenQty: frozenAfter,
      updatedAt: time,
    };

    // 预占只改内存副本：整批校验通过后与库存行、流水一起落库
    nextReservations = applyReservationChange(nextReservations, {
      logicalWarehouse: entry.logicalWarehouse,
      product: entry.product,
      sourceNo: entry.reservationSourceNo || meta.reservationSourceNo || meta.sourceNo,
      sourceLineNo: entry.reservationSourceLineNo ?? meta.reservationSourceLineNo,
      consumeReserved: entry.consumeReserved,
      releaseReserved: entry.releaseReserved,
      time,
    });

    const direction = instantChange > 0 ? 'increase' : instantChange < 0 ? 'decrease' : '';
    flows.push({
      id: `flow-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      time,
      eventType: meta.eventType || 'result_in',
      logicalWarehouse: entry.logicalWarehouse,
      product: entry.product,
      instantBefore, instantChange, instantAfter,
      availableBefore, availableChange: availableAfter - availableBefore, availableAfter,
      reservedBefore, reservedChange, reservedAfter,
      frozenBefore, frozenChange, frozenAfter,
      direction,
      changeQty: Math.abs(instantChange),
      sourceType: meta.sourceType || '',
      sourceNo: meta.sourceNo || '',
      businessType: meta.businessType || '',
      operator,
    });
  });

  persistStockRows(nextRows);
  persistReservations(nextReservations);
  appendStockFlows(flows);
  return flows;
}

/** 冻结：只能从可用量取，超量阻断（《库存查询主PRD》F02、R06）。 */
export function applyFreeze(row, { quantity, reason }) {
  const amount = Number(quantity || 0);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('冻结数量必须为大于0的整数');
  const current = getStockRow(row.logicalWarehouse, row.product);
  if (!current) throw new Error('库存行不存在，请刷新后重试');
  if (amount > current.availableQty) throw new Error(`冻结数量不能超过当前可用库存（当前可用 ${current.availableQty}）`);

  postStockEntries(
    [{ logicalWarehouse: row.logicalWarehouse, product: row.product, frozenDelta: amount }],
    { eventType: 'freeze', sourceType: '', sourceNo: '', businessType: '', operator: '当前用户' },
  );
  return { ...current, frozenQty: current.frozenQty + amount, availableQty: current.availableQty - amount, freezeReason: reason };
}

/** 解冻：只能解冻已冻结数量（《库存查询主PRD》F03、R07）。 */
export function applyUnfreeze(row, { quantity, reason }) {
  const amount = Number(quantity || 0);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('解冻数量必须为大于0的整数');
  const current = getStockRow(row.logicalWarehouse, row.product);
  if (!current) throw new Error('库存行不存在，请刷新后重试');
  if (amount > current.frozenQty) throw new Error(`解冻数量不能超过当前冻结库存（当前冻结 ${current.frozenQty}）`);

  postStockEntries(
    [{ logicalWarehouse: row.logicalWarehouse, product: row.product, frozenDelta: -amount }],
    { eventType: 'unfreeze', sourceType: '', sourceNo: '', businessType: '', operator: '当前用户' },
  );
  return { ...current, frozenQty: current.frozenQty - amount, availableQty: current.availableQty + amount, unfreezeReason: reason };
}

// —— 库存比对 ——

export const COMPARE_NONE = 'none';
export const COMPARE_ERP_MORE = 'erp_more';
export const COMPARE_WAREHOUSE_MORE = 'warehouse_more';

export function resolveCompareDirection(difference) {
  if (difference > 0) return COMPARE_ERP_MORE;
  if (difference < 0) return COMPARE_WAREHOUSE_MORE;
  return COMPARE_NONE;
}

export function loadCompareRows() {
  return readMockRows(STOCK_COMPARE_STORAGE_KEY, stockCompareSeeds)
    .map((row) => {
      const physical = resolvePhysicalWarehouseLabel(row.physicalWarehouse);
      const product = resolveStockProduct(row.product);
      const difference = Number(row.erpQty || 0) - Number(row.warehouseQty || 0);
      return {
        ...row,
        physicalWarehouseLabel: physical,
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        barcode: product.barcode,
        barcodes: product.barcodes,
        erpQty: Number(row.erpQty || 0),
        warehouseQty: Number(row.warehouseQty || 0),
        difference,
        direction: resolveCompareDirection(difference),
      };
    })
    .sort((left, right) => {
      const byTime = String(right.compareTime || '').localeCompare(String(left.compareTime || ''));
      if (byTime !== 0) return byTime;
      const byWarehouse = String(left.physicalWarehouse || '').localeCompare(String(right.physicalWarehouse || ''), 'zh-CN', { numeric: true });
      if (byWarehouse !== 0) return byWarehouse;
      const byProduct = String(left.productCode || '').localeCompare(String(right.productCode || ''), 'zh-CN', { numeric: true });
      if (byProduct !== 0) return byProduct;
      return COMPARE_STATUS_ORDER.indexOf(left.stockStatus) - COMPARE_STATUS_ORDER.indexOf(right.stockStatus);
    });
}

const COMPARE_STATUS_ORDER = ['normal', 'defective', 'inspection'];

export function latestCompareTime() {
  const times = loadCompareRows().map((row) => row.compareTime).filter(Boolean).sort();
  return times.length ? times[times.length - 1] : '';
}
