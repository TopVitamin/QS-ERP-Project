import { readMockRows } from '../lib/mockStorage.js';
import { CATEGORY_STORAGE_KEY, seedCategories } from './auxiliaryData.js';

function getCategoryRows() {
  return readMockRows(CATEGORY_STORAGE_KEY, seedCategories);
}

function buildTree(rows, parentId = '') {
  return rows
    .filter((row) => (row.parentId || '') === parentId)
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      level: row.level,
      useStatus: row.useStatus,
      children: row.level < 3 ? buildTree(rows, row.id) : undefined,
    }));
}

export function getProductCategoryTree() {
  return buildTree(getCategoryRows());
}

export const productCategoryTree = getProductCategoryTree();

export function getCategoryPath(categoryId) {
  const rows = getCategoryRows();
  const target = rows.find((row) => row.id === categoryId);
  if (!target) return '';
  const names = [target.name];
  let parentId = target.parentId;
  while (parentId) {
    const parent = rows.find((row) => row.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join('/');
}

export function flattenCategoryOptions() {
  const rows = getCategoryRows();
  const options = [{ value: '', label: '全部分类' }];
  const level1 = rows.filter((row) => row.level === 1);
  for (const l1 of level1) {
    options.push({ value: l1.id, label: l1.name, level: 1 });
    const level2 = rows.filter((row) => row.parentId === l1.id);
    for (const l2 of level2) {
      options.push({ value: l2.id, label: `${l1.name} / ${l2.name}`, level: 2 });
      const level3 = rows.filter((row) => row.parentId === l2.id);
      for (const l3 of level3) {
        options.push({ value: l3.id, label: `${l1.name} / ${l2.name} / ${l3.name}`, level: 3 });
      }
    }
  }
  return options;
}

export function matchesCategoryFilter(product, categoryId) {
  if (!categoryId) return true;
  if (product.categoryId === categoryId) return true;
  const path = getCategoryPath(product.categoryId);
  const selectedPath = getCategoryPath(categoryId);
  if (!selectedPath) return false;
  const selectedLevel = flattenCategoryOptions().find((item) => item.value === categoryId)?.level || 3;
  if (selectedLevel === 3) return product.categoryId === categoryId;
  return path.startsWith(selectedPath);
}

// 一级、二级仅作为归属路径，不因自身禁用阻断：上级分类禁用不级联，既有启用的三级分类仍可被新商品引用（商品主PRD R02）。
export function getLevel1Options() {
  return getCategoryRows()
    .filter((row) => row.level === 1)
    .map((item) => ({ value: item.id, label: item.name }));
}

export function getLevel2Options(level1Id) {
  return getCategoryRows()
    .filter((row) => row.parentId === level1Id)
    .map((item) => ({ value: item.id, label: item.name }));
}

export function getLevel3Options(level2Id) {
  return getCategoryRows()
    .filter((row) => row.parentId === level2Id && row.useStatus === 'enabled')
    .map((item) => ({ value: item.id, label: item.name }));
}

export function resolveCategorySelection(categoryId) {
  const rows = getCategoryRows();
  const target = rows.find((row) => row.id === categoryId);
  if (!target) return { level1Id: '', level2Id: '', level3Id: '' };
  if (target.level === 1) return { level1Id: target.id, level2Id: '', level3Id: '' };
  if (target.level === 2) return { level1Id: target.parentId, level2Id: target.id, level3Id: '' };
  const level2 = rows.find((row) => row.id === target.parentId);
  return { level1Id: level2?.parentId || '', level2Id: target.parentId, level3Id: target.id };
}
