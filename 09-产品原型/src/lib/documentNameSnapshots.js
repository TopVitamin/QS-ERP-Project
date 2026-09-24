import { customerOptions, logisticsProductOptions, supplierOptions } from '../data/masterData.js';
import { getSelectableCustomerOptions } from '../data/customerData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableLogisticsProductOptions } from '../data/logisticsData.js';
import { readMockRows, writeMockRows } from './mockStorage.js';

function optionName(code, options) {
  const option = options.find((item) => item.value === code || item.code === code);
  if (!option) return '';
  if (option.name) return option.name;
  const label = String(option.label || '');
  return label.startsWith(`${code} `) ? label.slice(String(code).length + 1) : label;
}

function capture(row, entity, codeField, options, previous = null, inherited = null) {
  const nameField = `${entity}NameSnapshot`;
  const codeSnapshotField = `${entity}SnapshotCode`;
  const code = row[codeField] || '';
  const inheritedName = inherited?.[nameField];
  const previousName = previous?.[nameField];
  const rowName = row[nameField];
  let name = '';

  if (inherited?.[codeField] === code && inheritedName) name = inheritedName;
  else if (previous?.[codeField] === code && previousName) name = previousName;
  else if (row[codeSnapshotField] === code && rowName) name = rowName;
  else name = optionName(code, options);

  return {
    ...row,
    [nameField]: name,
    [codeSnapshotField]: code,
  };
}

function customerNameOptions() {
  return [...getSelectableCustomerOptions(), ...customerOptions];
}

function supplierNameOptions() {
  return [...getSelectableSupplierOptions(), ...supplierOptions];
}

export function captureSalesDocumentNames(row, { previous = null, inherited = null } = {}) {
  const warehouses = getInventoryLogicalWarehouseOptions();
  const logistics = [...getSelectableLogisticsProductOptions(), ...logisticsProductOptions];
  let next = capture(row, 'customer', 'customer', customerNameOptions(), previous, inherited);
  next = capture(next, 'warehouse', 'warehouse', warehouses, previous, inherited);
  if (next.logisticsProduct) next = capture(next, 'logisticsProduct', 'logisticsProduct', logistics, previous, inherited);
  return next;
}

export function capturePurchaseDocumentNames(row, { previous = null, inherited = null } = {}) {
  const warehouses = getInventoryLogicalWarehouseOptions();
  let next = capture(row, 'supplier', 'supplier', supplierNameOptions(), previous, inherited);
  next = capture(next, 'warehouse', 'warehouse', warehouses, previous, inherited);
  return next;
}

export function formatSnapshotCodeName(code, name) {
  if (!code) return '-';
  return name ? `${code} ${name}` : code;
}

export function loadRowsWithNameSnapshots(storageKey, fallbackRows, captureNames) {
  const rows = readMockRows(storageKey, fallbackRows);
  const next = normalizeRowsWithNameSnapshots(rows, captureNames);
  const changed = JSON.stringify(next) !== JSON.stringify(rows);
  if (changed) writeMockRows(storageKey, next);
  return next;
}

export function normalizeRowsWithNameSnapshots(rows, captureNames) {
  return rows.map((row) => {
    const captured = captureNames(row, { previous: row });
    return captured;
  });
}

export function normalizeSalesRows(rows) {
  return normalizeRowsWithNameSnapshots(rows, captureSalesDocumentNames);
}

export function normalizePurchaseRows(rows) {
  return normalizeRowsWithNameSnapshots(rows, capturePurchaseDocumentNames);
}
