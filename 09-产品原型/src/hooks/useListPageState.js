import { useEffect, useMemo, useRef, useState } from 'react';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';

export function useListPageState({ initialRows, initialFilters, filterRows, initialVisibility, storageKey }) {
  const [rows, setRows] = useState(() => readMockRows(storageKey, initialRows));
  const skipPersistRef = useRef(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);

  const filteredRows = useMemo(() => rows.filter((row) => filterRows(row, appliedFilters)), [rows, appliedFilters, filterRows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredRows, currentPage, pageSize]);
  const visibleSelectedIds = useMemo(() => pageRows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id), [pageRows, selectedIds]);
  const filteredSelectedIds = useMemo(() => filteredRows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id), [filteredRows, selectedIds]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!storageKey) return undefined;
    return subscribeMockRows(storageKey, (nextRows) => {
      skipPersistRef.current = true;
      setRows(nextRows);
    });
  }, [storageKey]);

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

  function resetFilters() {
    setDraftFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
    setCurrentPage(1);
    setSelectedIds([]);
    setVisibility({ ...initialVisibility });
  }

  function setPageSize(size) {
    setPageSizeState(size);
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
    filteredRows,
    pageRows,
    pageCount,
    currentPage,
    pageSize,
    selectedIds,
    visibleSelectedIds,
    filteredSelectedIds,
    visibility,
    setFilter,
    applyFilters,
    resetFilters,
    setPage: setCurrentPage,
    setPageSize,
    setVisibility: (key, value) => setVisibility((current) => ({ ...current, [key]: value })),
    toggleRow,
    togglePage,
    updateRow,
    updateRows,
    removeRows,
  };
}
