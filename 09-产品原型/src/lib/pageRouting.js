/** 旧菜单 pageId 到新四入口的兼容映射。 */
export const LEGACY_PAGE_ALIASES = {
  'warehouse-list': 'warehouse-physical',
  'base-logistics': 'base-logistics-carrier',
  warehouse: 'warehouse-physical',
  logistics: 'base-logistics-carrier',
};

export function normalizePageId(pageId) {
  if (!pageId) return null;
  return LEGACY_PAGE_ALIASES[pageId] || pageId;
}

export function readPageIdFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  return hash ? normalizePageId(hash) : null;
}

export function writePageIdToHash(pageId) {
  if (typeof window === 'undefined') return;
  const nextHash = pageId && pageId !== 'home' ? `#${pageId}` : '';
  const { pathname, search } = window.location;
  const target = `${pathname}${search}${nextHash}`;
  if (`${pathname}${search}${window.location.hash}` !== target) {
    window.history.replaceState(null, '', target);
  }
}
