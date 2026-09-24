import { useEffect, useMemo, useRef, useState } from 'react';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const numA = Number(a);
  const numB = Number(b);
  if (a !== '' && b !== '' && a != null && b != null && !Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }
  return String(a ?? '').localeCompare(String(b ?? ''), 'zh-CN', { numeric: true });
}

export function useListPageState({ initialRows, initialFilters, filterRows, initialVisibility, storageKey, columns = [], initialSort = null, initialPinnedKeys = [], normalizeRows = null, mergeSeedRows = false }) {
  const [rows, setRows] = useState(() => {
    const storedRows = readMockRows(storageKey, null);
    const sourceRows = Array.isArray(storedRows) && mergeSeedRows
      ? [...storedRows, ...initialRows.filter((seed) => !storedRows.some((row) => row.id === seed.id))]
      : (Array.isArray(storedRows) ? storedRows : initialRows);
    return normalizeRows ? normalizeRows(sourceRows) : sourceRows;
  });
  const skipPersistRef = useRef(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [columnOrder, setColumnOrder] = useState(() => columns.map((column) => column.key));
  const [pinnedKeys, setPinnedKeys] = useState(initialPinnedKeys);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);
  const [sort, setSort] = useState(initialSort);

  const filteredRows = useMemo(() => rows.filter((row) => filterRows(row, appliedFilters)), [rows, appliedFilters, filterRows]);
  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.key === sort.key);
    const getValue = column?.sortValue || ((row) => row[sort.key]);
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => compareValues(getValue(a), getValue(b)) * factor);
  }, [filteredRows, sort, columns]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [sortedRows, currentPage, pageSize]);
  const visibleSelectedIds = useMemo(() => pageRows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id), [pageRows, selectedIds]);
  const filteredSelectedIds = useMemo(() => filteredRows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id), [filteredRows, selectedIds]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setColumnOrder((current) => {
      const keys = columns.map((column) => column.key);
      const kept = current.filter((key) => keys.includes(key));
      const added = keys.filter((key) => !kept.includes(key));
      if (kept.length === current.length && added.length === 0) return current;
      return [...kept, ...added];
    });
  }, [columns]);

  useEffect(() => {
    if (!storageKey) return undefined;
    return subscribeMockRows(storageKey, (nextRows) => {
      skipPersistRef.current = true;
      setRows(normalizeRows ? normalizeRows(nextRows) : nextRows);
    });
  }, [storageKey, normalizeRows]);

  useEffect(() => {
    if (!storageKey) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeMockRows(storageKey, rows);
  }, [rows, storageKey]);

  function setFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function applyQuickFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    setAppliedFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function resetFilters() {
    // 重置只清空查询区条件与勾选：保留审核页签（审核状态由页签维护），排序回到模块默认。
    const keepAuditStatus = 'auditStatus' in initialFilters ? { auditStatus: appliedFilters.auditStatus } : {};
    setDraftFilters({ ...initialFilters, ...keepAuditStatus });
    setAppliedFilters({ ...initialFilters, ...keepAuditStatus });
    setCurrentPage(1);
    setSelectedIds([]);
    setSort(initialSort);
  }

  function resetColumns() {
    setVisibility({ ...initialVisibility });
    setColumnOrder(columns.map((column) => column.key));
    setPinnedKeys([...initialPinnedKeys]);
  }

  function togglePin(key) {
    const willPin = !pinnedKeys.includes(key);
    setPinnedKeys((current) => (willPin ? [...current, key] : current.filter((item) => item !== key)));
    if (willPin) {
      setColumnOrder((current) => [key, ...current.filter((item) => item !== key)]);
    }
  }

  function setPageSize(size) {
    setPageSizeState(size);
    setCurrentPage(1);
  }

  function toggleSort(key) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
    setCurrentPage(1);
  }

  function toggleRow(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function togglePage(checked) {
    setSelectedIds((current) => {
      if (checked) return [...new Set([...current, ...pageRows.map((row) => row.id)])];
      const pageIds = new Set(pageRows.map((row) => row.id));
      return current.filter((id) => !pageIds.has(id));
    });
  }

  function updateRow(id, updater) {
    setRows((current) => current.map((row) => row.id === id ? updater(row) : row));
  }

  function updateRows(ids, updater) {
    const idSet = new Set(ids);
    setRows((current) => current.map((row) => idSet.has(row.id) ? updater(row) : row));
  }

  function removeRows(ids) {
    const idSet = new Set(ids);
    setRows((current) => current.filter((row) => !idSet.has(row.id)));
    setSelectedIds((current) => current.filter((id) => !idSet.has(id)));
  }

  return {
    rows,
    draftFilters,
    appliedFilters,
    filteredRows,
    sortedRows,
    pageRows,
    pageCount,
    currentPage,
    pageSize,
    selectedIds,
    visibleSelectedIds,
    filteredSelectedIds,
    visibility,
    columnOrder,
    pinnedKeys,
    sort,
    togglePin,
    setFilter,
    applyFilters,
    applyQuickFilter,
    resetFilters,
    resetColumns,
    setColumnOrder,
    setPage: setCurrentPage,
    setPageSize,
    setVisibility: (key, value) => setVisibility((current) => ({ ...current, [key]: value })),
    toggleRow,
    togglePage,
    toggleSort,
    updateRow,
    updateRows,
    removeRows,
  };
}
