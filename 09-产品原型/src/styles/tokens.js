/** Theme metadata and semantic shape names used by the ERP UI. */
export const erpThemePresets = [
  { id: 'blue', label: '蓝色' },
  { id: 'green', label: '绿色' },
  { id: 'violet', label: '紫色' },
];

export const erpRadius = {
  control: 'var(--erp-radius-control)',
  section: 'var(--erp-radius-section)',
  overlay: 'var(--erp-radius-overlay)',
  dialog: 'var(--erp-radius-dialog)',
  status: 'var(--erp-radius-status)',
};

export const erpShadow = {
  overlay: 'var(--erp-shadow-overlay)',
  dialog: 'var(--erp-shadow-dialog)',
  flyout: 'var(--erp-shadow-flyout)',
};

export const erpSurface = {
  page: 'bg-erp-surface',
  card: 'bg-erp-surface-panel border-erp-border-card',
  tableHead: 'bg-erp-surface-table-head',
  summary: 'bg-erp-surface-muted border-t border-erp-border-header',
};
