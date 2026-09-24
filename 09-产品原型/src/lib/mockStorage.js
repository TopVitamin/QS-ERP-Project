const mockDataEventName = 'qs-erp:mock-data-changed';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function readMockRows(storageKey, fallbackRows = []) {
  const storage = getStorage();
  if (!storageKey || !storage) return fallbackRows;

  try {
    const stored = storage.getItem(storageKey);
    if (!stored) return fallbackRows;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallbackRows;
  } catch {
    return fallbackRows;
  }
}

export function writeMockRows(storageKey, rows) {
  const storage = getStorage();
  if (!storageKey || !storage) return;

  try {
    storage.setItem(storageKey, JSON.stringify(rows));
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(mockDataEventName, { detail: { storageKey, rows } }));
    }
  } catch {
    // Mock 页面即使无法使用浏览器存储，也继续保留当前标签页内存状态。
  }
}

export function upsertMockRow(storageKey, row) {
  const rows = readMockRows(storageKey);
  const index = rows.findIndex((item) => item.id === row.id);
  const nextRows = index < 0
    ? [row, ...rows]
    : rows.map((item, itemIndex) => (itemIndex === index ? row : item));
  writeMockRows(storageKey, nextRows);
}

/**
 * 首次加载时把种子写进 `localStorage`。
 * 模块内的 `upsertMockRow` 按 key 读取时没有种子兜底，若某个集合从未落库，
 * 第一次局部写入（如审核后自动生成下游单据）会把种子挤掉，列表只剩新单；
 * 各模块在自己的 data 文件末尾调用本函数补齐。
 */
export function ensureSeedRows(storageKey, seedRows = []) {
  if (!storageKey || !seedRows.length) return;
  if (readMockRows(storageKey, []).length) return;
  writeMockRows(storageKey, seedRows);
}

export function subscribeMockRows(storageKey, onChange) {
  if (!storageKey || !getStorage()) return () => {};

  function handleCustomEvent(event) {
    if (event.detail?.storageKey === storageKey) onChange(event.detail.rows);
  }

  function handleStorageEvent(event) {
    if (event.key === storageKey) onChange(readMockRows(storageKey));
  }

  window.addEventListener(mockDataEventName, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(mockDataEventName, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
