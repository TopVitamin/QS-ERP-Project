import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { cn } from '../../lib/utils.js';
import { formatAmount } from '../../lib/format.js';

function normalizeSkuOption(option) {
  return {
    ...option,
    value: String(option.value),
    skuCode: option.skuCode || String(option.value),
    productName: option.productName || option.label || String(option.value),
    barcode: option.barcode || '—',
    spec: option.spec || '—',
    unit: option.unit || '—',
    availableStock: option.availableStock ?? '—',
    referencePrice: option.referencePrice ?? null,
  };
}

function containsKeyword(value, keyword) {
  return String(value || '').toLowerCase().includes(keyword.trim().toLowerCase());
}

function pageButtonClassName(active) {
  return cn(
    'inline-flex h-6 min-w-6 items-center justify-center rounded-erp-control px-1.5 text-[11px] outline-none transition-colors',
    active ? 'bg-erp-primary text-white' : 'text-erp-text-muted hover:bg-erp-primary-soft hover:text-erp-primary',
  );
}

export function SkuSelectionDialog({
  open,
  onOpenChange,
  options = [],
  selectedValues = [],
  onConfirm,
  title = '选择商品 / SKU',
  pageSize = 8,
}) {
  const normalizedOptions = useMemo(
    () => options.filter((option) => option?.value !== '' && option?.value != null).map(normalizeSkuOption),
    [options],
  );
  const [draftSelectedValues, setDraftSelectedValues] = useState([]);
  const [searchFields, setSearchFields] = useState({ productName: '', skuCode: '', barcode: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setDraftSelectedValues((Array.isArray(selectedValues) ? selectedValues : []).map((value) => String(value)));
    setSearchFields({ productName: '', skuCode: '', barcode: '' });
    setPage(1);
  }, [open, selectedValues]);

  const filteredOptions = useMemo(
    () => normalizedOptions.filter((option) => (
      containsKeyword(option.productName, searchFields.productName)
      && containsKeyword(option.skuCode, searchFields.skuCode)
      && containsKeyword(option.barcode, searchFields.barcode)
    )),
    [normalizedOptions, searchFields],
  );
  const pageCount = Math.max(1, Math.ceil(filteredOptions.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOptions = filteredOptions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedSet = useMemo(() => new Set(draftSelectedValues), [draftSelectedValues]);
  const selectedOptions = normalizedOptions.filter((option) => selectedSet.has(option.value));
  const pageSelectedCount = pageOptions.filter((option) => selectedSet.has(option.value)).length;
  const allPageSelected = pageOptions.length > 0 && pageSelectedCount === pageOptions.length;
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected;

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  function updateSearchField(key, value) {
    setSearchFields((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function toggleSku(value) {
    setDraftSelectedValues((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleCurrentPage() {
    const pageValues = pageOptions.map((option) => option.value);
    setDraftSelectedValues((current) => {
      if (allPageSelected) return current.filter((value) => !pageValues.includes(value));
      return [...new Set([...current, ...pageValues])];
    });
  }

  function removeSelected(value) {
    setDraftSelectedValues((current) => current.filter((item) => item !== value));
  }

  function clearSelected() {
    setDraftSelectedValues([]);
  }

  function confirmSelection() {
    onConfirm?.(selectedOptions);
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="flex h-[min(680px,calc(100vh-32px))] w-[min(1080px,calc(100vw-32px))] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-erp-border-header p-0">
          <div className="border-b border-erp-border-header px-4 pb-3 pt-4 pr-12">
            <DialogTitle className="text-[16px]">{title}</DialogTitle>
          </div>
          <div className="px-4 pb-4 pr-12 pt-3">
            <div className="grid w-[calc(100%_-_220px)] grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] items-end gap-2">
              <SearchField label="商品名称" value={searchFields.productName} onChange={(value) => updateSearchField('productName', value)} placeholder="请输入商品名称" />
              <SearchField label="商品编码" value={searchFields.skuCode} onChange={(value) => updateSearchField('skuCode', value)} placeholder="请输入 SKU 编码" />
              <SearchField label="条码" value={searchFields.barcode} onChange={(value) => updateSearchField('barcode', value)} placeholder="请输入条码" />
              <Button variant="primary" size="compact" onClick={() => setPage(1)}>搜索</Button>
              <Button variant="outline" size="compact" onClick={() => { setSearchFields({ productName: '', skuCode: '', barcode: '' }); setPage(1); }}>重置</Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col border-r border-erp-border-header" aria-label="可选 SKU">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[776px] table-fixed border-collapse text-left text-[12px]">
                <colgroup>
                  <col className="w-9" />
                  <col className="w-[105px]" />
                  <col className="w-[160px]" />
                  <col className="w-[145px]" />
                  <col className="w-[115px]" />
                  <col className="w-[45px]" />
                  <col className="w-[70px]" />
                  <col className="w-[100px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 h-9 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section">
                  <tr>
                    <th className="border-r border-erp-border-table-column px-2 text-center" aria-label="本页全选">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleCurrentPage}
                        aria-label="本页全选"
                      />
                    </th>
                    <th className="border-r border-erp-border-table-column px-2 font-normal">SKU 编码</th>
                    <th className="border-r border-erp-border-table-column px-2 font-normal">商品名称</th>
                    <th className="border-r border-erp-border-table-column px-2 font-normal">规格 / 属性</th>
                    <th className="border-r border-erp-border-table-column px-2 font-normal">条码</th>
                    <th className="border-r border-erp-border-table-column px-2 font-normal">单位</th>
                    <th className="border-r border-erp-border-table-column px-2 text-right font-normal">可用库存</th>
                    <th className="px-2 text-right font-normal">参考含税采购价</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOptions.map((option) => {
                    const checked = selectedSet.has(option.value);
                    return (
                      <tr
                        key={option.value}
                        className={cn('h-10 cursor-pointer border-b border-erp-border-table-row outline-none hover:bg-erp-primary-soft/40 focus-visible:bg-erp-primary-soft/40', checked && 'bg-erp-primary-soft/25')}
                        aria-selected={checked}
                        tabIndex={0}
                        onClick={() => toggleSku(option.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSku(option.value);
                          }
                        }}
                      >
                        <td className="border-r border-erp-border-table-column px-2 text-center" onClick={(event) => event.stopPropagation()}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleSku(option.value)} aria-label={`选择${option.productName}（${option.skuCode}）`} />
                        </td>
                        <td className="truncate border-r border-erp-border-table-column px-2 text-erp-text-section" title={option.skuCode}>{option.skuCode}</td>
                        <td className="truncate border-r border-erp-border-table-column px-2 text-erp-text-section" title={option.productName}>{option.productName}</td>
                        <td className="truncate border-r border-erp-border-table-column px-2 text-erp-text-muted" title={option.spec}>{option.spec}</td>
                        <td className="truncate border-r border-erp-border-table-column px-2 text-erp-text-muted" title={option.barcode}>{option.barcode}</td>
                        <td className="border-r border-erp-border-table-column px-2 text-erp-text-muted">{option.unit}</td>
                        <td className="border-r border-erp-border-table-column px-2 text-right text-erp-text-muted">{option.availableStock}</td>
                        <td className="px-2 text-right text-erp-text-muted">{option.referencePrice == null ? '—' : `¥ ${formatAmount(option.referencePrice)}`}</td>
                      </tr>
                    );
                  })}
                  {!pageOptions.length && (
                    <tr>
                      <td colSpan="8" className="h-32 text-center text-[12px] text-erp-text-muted">没有匹配的 SKU</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex h-10 shrink-0 items-center justify-between border-t border-erp-border-light px-4 text-[11px] text-erp-text-muted">
              <span>已选 {selectedOptions.length} 个 SKU，翻页后仍会保留</span>
              <div className="flex items-center gap-1.5">
                <span className="mr-1">第 {currentPage} / {pageCount} 页</span>
                <button type="button" className={pageButtonClassName(false)} disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="上一页"><ChevronLeft className="h-3.5 w-3.5" /></button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button key={pageNumber} type="button" className={pageButtonClassName(pageNumber === currentPage)} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                ))}
                <button type="button" className={pageButtonClassName(false)} disabled={currentPage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="下一页"><ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </section>

          <aside className="flex w-[220px] shrink-0 flex-col" aria-label="已选 SKU">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-erp-border-light px-3">
              <span className="text-[12px] font-medium text-erp-text-section">已选 SKU（{selectedOptions.length}）</span>
              <Button variant="text" size="compact" disabled={!selectedOptions.length} onClick={clearSelected}>清空</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {selectedOptions.length ? selectedOptions.map((option) => (
                <div key={option.value} className="group flex min-w-0 items-center gap-2 border-b border-erp-border-light px-2 py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-erp-text-section" title={option.productName}>{option.productName}</div>
                    <div className="mt-0.5 truncate text-[10px] text-erp-text-muted" title={option.skuCode}>{option.skuCode}</div>
                  </div>
                  <button type="button" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-erp-control text-erp-text-muted opacity-0 transition-opacity hover:bg-erp-danger-bg hover:text-erp-danger group-hover:opacity-100" onClick={() => removeSelected(option.value)} aria-label={`取消选择${option.productName}（${option.skuCode}）`}>
                    <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              )) : <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-erp-text-muted">暂未选择 SKU</div>}
            </div>
          </aside>
        </div>

        <DialogFooter className="mt-0 shrink-0 justify-end border-t border-erp-border-header px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="compact" onClick={() => onOpenChange?.(false)}>取消</Button>
            <Button variant="primary" size="compact" onClick={confirmSelection}>确定</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchField({ label, value, onChange, placeholder }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] text-erp-text-muted">{label}</span>
      <Input variant="underline" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
    </label>
  );
}
