import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const erpFontSizes = [
  'erp-compact',
  'erp-comfortable',
  'erp-caption',
  'erp-tab',
  'erp-section-title',
  'erp-emphasis',
  'erp-doc-title',
  'erp-page-title',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: erpFontSizes }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
