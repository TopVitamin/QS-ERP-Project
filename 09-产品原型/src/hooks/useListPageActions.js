export function useListPageActions({ onFeedback, state }) {
  function notify(message, type = 'success') {
    onFeedback?.(message, type);
  }

  function getSelectedRows() {
    const selectedIdSet = new Set(state.filteredSelectedIds);
    return state.filteredRows.filter((row) => selectedIdSet.has(row.id));
  }

  function getSelectedIds() {
    return getSelectedRows().map((row) => row.id);
  }

  return { notify, getSelectedRows, getSelectedIds };
}
