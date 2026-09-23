import { emptyFieldMessage } from './formValidation.js';
import { formatNow } from './partnerMasterLogic.js';

export const AUXILIARY_STORAGE_KEY = 'qs-erp:auxiliary-items:v2';
export const CATEGORY_STORAGE_KEY = 'qs-erp:product-categories:v1';

export const auxiliaryTypePrefixes = {
  brand: 'PP',
  unit: 'DW',
  settlement: 'JS',
  payment_terms: 'FK',
  collection_terms: 'SK',
};

export const auxiliaryTypeLabels = {
  unit: '基本单位',
  currency: '币别',
  settlement: '结算方式',
  brand: '品牌',
  payment_terms: '付款条件',
  collection_terms: '收款条件',
  product_category: '商品分类',
};

export const levelLabels = { 1: '一级', 2: '二级', 3: '三级' };

export function canEnable(row) {
  return row?.useStatus === 'disabled';
}

export function canDisable(row) {
  return row?.useStatus === 'enabled';
}

export function canAddChildCategory(row) {
  return row?.useStatus === 'enabled' && (row.level === 1 || row.level === 2);
}

export function getAuxiliaryDeleteBlockReason(row) {
  if (row.referenced) return '该记录已被业务引用，不能删除，可改为禁用';
  return null;
}

export function getCategoryDeleteBlockReason(row, categories = []) {
  if ((categories || []).some((item) => item.parentId === row.id)) {
    return '该分类有下级，不能删除，可改为禁用';
  }
  if (row.referenced) return '该记录已被业务引用，不能删除，可改为禁用';
  return null;
}

export function createEmptyAuxiliaryForm(type) {
  return {
    type,
    code: '',
    name: '',
    remark: '',
    useStatus: 'enabled',
  };
}

export function createEmptyCategoryForm(parent = null) {
  return {
    code: '',
    name: '',
    parentId: parent?.id || '',
    level: parent ? parent.level + 1 : 1,
    remark: '',
    useStatus: 'enabled',
  };
}

export function generateAuxiliaryCode(type, existingRows = []) {
  if (type === 'currency') return '';
  const prefix = auxiliaryTypePrefixes[type];
  if (!prefix) return '';
  const sameType = existingRows.filter((row) => row.type === type);
  const numbers = sameType
    .map((row) => Number(String(row.code || '').replace(prefix, '')))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export function generateCategoryCode(parent, siblings = []) {
  if (!parent) {
    const level1 = siblings.filter((item) => item.level === 1);
    const numbers = level1.map((item) => Number(item.code)).filter((value) => Number.isFinite(value));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return String(next).padStart(2, '0');
  }
  const children = siblings.filter((item) => item.parentId === parent.id);
  const numbers = children
    .map((item) => Number(String(item.code || '').slice(parent.code.length)))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${parent.code}${String(next).padStart(2, '0')}`;
}

export function validateAuxiliaryForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();
  if (!code) fieldErrors.code = form.type === 'currency' ? emptyFieldMessage('币别代码') : '资料编码不能为空';
  if (!name) fieldErrors.name = emptyFieldMessage('资料名称');
  const duplicate = existingRows.find((row) => row.type === form.type && row.code === code && row.id !== currentId);
  if (duplicate) fieldErrors.code = '资料编码已存在';
  if (name && existingRows.some((row) => row.type === form.type && row.name === name && row.id !== currentId)) {
    fieldErrors.name = '同一资料类型下资料名称已存在';
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function getDescendantIds(categoryId, categories = []) {
  const result = new Set();
  function walk(parentId) {
    for (const item of categories) {
      if (item.parentId === parentId) {
        result.add(item.id);
        walk(item.id);
      }
    }
  }
  walk(categoryId);
  return result;
}

export function validateCategoryForSave(form, categories = [], currentId = null) {
  const fieldErrors = {};
  const name = String(form.name || '').trim();
  if (!name) fieldErrors.name = emptyFieldMessage('分类名称');
  if (form.level > 1 && !form.parentId) fieldErrors.parentId = '请选择上级分类';

  if (form.parentId && currentId) {
    const descendants = getDescendantIds(currentId, categories);
    if (form.parentId === currentId || descendants.has(form.parentId)) {
      fieldErrors.parentId = '不能选择自身或其下级作为上级';
    }
  }

  const parent = categories.find((item) => item.id === form.parentId);
  if (form.level > 1) {
    if (!parent) fieldErrors.parentId = '上级分类与当前级别不符';
    else if (parent.level !== form.level - 1) fieldErrors.parentId = '上级分类与当前级别不符';
  }

  // 同一上级下分类名称不允许重复（2026-09-23确认）。
  if (name && categories.some((row) => row.name === name && (row.parentId || null) === (form.parentId || null) && row.id !== currentId)) {
    fieldErrors.name = '同一上级下分类名称已存在';
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function applyEnable(row) {
  return { ...row, useStatus: 'enabled', updater: '当前用户', updatedAt: formatNow() };
}

export function applyDisable(row) {
  return { ...row, useStatus: 'disabled', updater: '当前用户', updatedAt: formatNow() };
}

export function auxiliaryToForm(row) {
  return {
    type: row.type,
    code: row.code,
    name: row.name,
    remark: row.remark || '',
    useStatus: row.useStatus || 'enabled',
  };
}

export function categoryToForm(row) {
  return {
    code: row.code,
    name: row.name,
    parentId: row.parentId || '',
    level: row.level,
    remark: row.remark || '',
    useStatus: row.useStatus || 'enabled',
  };
}

export function formToAuxiliaryRow(form, contextRow = null) {
  const now = formatNow();
  return {
    ...contextRow,
    ...form,
    id: contextRow?.id || `aux-${form.type}-${Date.now()}`,
    useStatus: form.useStatus || contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
    referenced: contextRow?.referenced || false,
    code: contextRow?.code || form.code,
  };
}

export function formToCategoryRow(form, contextRow = null, categories = []) {
  const now = formatNow();
  const isCreate = !contextRow;
  const parent = categories.find((item) => item.id === form.parentId);
  const code = contextRow?.code || (isCreate ? generateCategoryCode(parent, categories) : form.code);
  const level = contextRow?.level || (parent ? parent.level + 1 : 1);
  return {
    ...contextRow,
    ...form,
    id: contextRow?.id || `cat-${Date.now()}`,
    code,
    level,
    parentId: level === 1 ? '' : form.parentId,
    useStatus: form.useStatus || contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
    referenced: contextRow?.referenced || false,
  };
}

export function buildParentOptions(categories, row) {
  if (!row || row.level === 1) return [];
  const targetParentLevel = row.level - 1;
  const descendants = getDescendantIds(row.id, categories);
  return categories
    .filter((item) => item.level === targetParentLevel && item.id !== row.id && !descendants.has(item.id))
    .map((item) => ({ value: item.id, label: `${item.code} ${item.name}` }));
}

export function filterCategoryTreeRows(rows, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchedIds = new Set();

  function rowMatches(row) {
    const matchesKeyword = !keyword || [row.code, row.name].some((value) => String(value || '').toLowerCase().includes(keyword));
    const matchesLevel = !filters.level || String(row.level) === String(filters.level);
    const matchesStatus = !filters.useStatus || row.useStatus === filters.useStatus;
    const matchesUpdatedAt = !filters.updatedAt?.from && !filters.updatedAt?.to
      || matchesDateRange(row.updatedAt, filters.updatedAt);
    return matchesKeyword && matchesLevel && matchesStatus && matchesUpdatedAt;
  }

  for (const row of rows) {
    if (rowMatches(row)) matchedIds.add(row.id);
  }

  const visibleIds = new Set(matchedIds);
  if (keyword || filters.level || filters.useStatus || filters.updatedAt?.from || filters.updatedAt?.to) {
    for (const id of matchedIds) {
      let parentId = rows.find((item) => item.id === id)?.parentId;
      while (parentId) {
        visibleIds.add(parentId);
        parentId = rows.find((item) => item.id === parentId)?.parentId;
      }
    }
  } else {
    rows.forEach((row) => visibleIds.add(row.id));
  }

  return rows.filter((row) => visibleIds.has(row.id));
}

function matchesDateRange(value, range) {
  if (!range?.from && !range?.to) return true;
  if (!value) return false;
  const time = new Date(String(value).replace(' ', 'T')).getTime();
  if (range.from) {
    const from = new Date(`${range.from}T00:00:00`).getTime();
    if (time < from) return false;
  }
  if (range.to) {
    const to = new Date(`${range.to}T23:59:59`).getTime();
    if (time > to) return false;
  }
  return true;
}

export function sortCategoriesForTree(rows) {
  return [...rows].sort((a, b) => {
    if (a.code !== b.code) return String(a.code).localeCompare(String(b.code));
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

export function getEnabledBrandOptions(rows) {
  return rows
    .filter((row) => row.type === 'brand' && row.useStatus === 'enabled')
    .map((row) => ({ value: row.name, label: row.name }));
}
