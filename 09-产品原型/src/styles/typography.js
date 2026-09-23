/**
 * ERP typography tokens.
 *
 * Rule: labels use 12px + leading-5; controls use 12px in h-7 without forced line-height.
 * Do NOT put leading-5 on inputs/buttons/selects — it makes 28px controls look vertically off.
 */

/** @typedef {'compact' | 'comfortable'} FieldSize */

const fieldSizeTokens = {
  compact: {
    label: 'text-[12px] leading-5',
    control: 'h-7 text-[12px]',
    value: 'min-h-7 text-[12px]',
    labelHeight: 'h-5',
    gap: 'gap-1',
  },
  comfortable: {
    label: 'text-[14px] leading-5',
    control: 'h-8 text-[14px]',
    value: 'min-h-8 text-[14px]',
    labelHeight: 'h-5',
    gap: 'gap-1',
  },
};

/** Detail page: label + value stack, no control height. */
export const detailFieldTokens = {
  label: 'text-[12px] leading-4',
  labelHeight: 'h-4',
  value: 'text-[12px] leading-5',
  gap: 'gap-1',
};

/** @param {FieldSize} [size] */
export function getFieldSizeTokens(size = 'compact') {
  return fieldSizeTokens[size] ?? fieldSizeTokens.compact;
}

/** Semantic text styles for page chrome (not form controls). */
export const typography = {
  pageTitle: 'text-erp-page-title font-medium leading-none text-erp-text-title',
  docTitle: 'text-erp-doc-title font-medium leading-none text-erp-text-title',
  sectionTitle: 'text-erp-section-title font-normal leading-6 text-erp-text-section',
  body: 'text-erp-compact',
  caption: 'text-erp-caption leading-4',
  tab: 'text-erp-tab',
  emphasis: 'text-erp-emphasis font-semibold leading-5',
  labelMuted: 'text-erp-text-muted',
  link: 'text-erp-compact text-erp-primary',
};

/** Six-column field grid used by filters, forms, and detail cards. */
export const erpFieldGridClassName = 'grid grid-cols-6 gap-x-5 gap-y-3 px-4 py-4';

/** Default column count for master-data form dialogs. */
export const dialogFormColumns = 2;

/** Dialog form grids — separate from page-level 6-column erpFieldGridClassName. */
export const dialogFieldGridClassName = {
  1: 'grid grid-cols-1 gap-x-5 gap-y-3',
  2: 'grid grid-cols-2 gap-x-5 gap-y-3',
  4: 'grid grid-cols-4 gap-x-5 gap-y-3',
};

/** Full-width span within dialog grids. */
export const dialogFieldFullSpanClassName = {
  1: 'col-span-1',
  2: 'col-span-2',
  4: 'col-span-4',
};

/** @param {1 | 2 | 4} [columns] */
export function getDialogFieldGridClassName(columns = dialogFormColumns) {
  return dialogFieldGridClassName[columns] ?? dialogFieldGridClassName[dialogFormColumns];
}
