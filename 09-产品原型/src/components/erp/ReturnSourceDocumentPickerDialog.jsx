import { useMemo, useState } from 'react';
import { resolveOptionLabel } from '../../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../../lib/format.js';
import { createReturnSourceFilters, filterReturnSourceDocuments } from '../../lib/returnSourcePicker.js';
import { getDialogFieldGridClassName } from '../../styles/typography.js';
import { Button } from '../ui/button.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { ClearableInput } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const headClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row last:border-b-0';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 退货单溯源选单：候选列表支持按单号、伙伴、商品编码筛选；两步确认带出明细。
 */
export function ReturnSourceDocumentPickerDialog({
  title,
  listDescription,
  detailDescriptionPrefix,
  quotaHint,
  partnerLabel,
  partnerOptions = [],
  warehouseOptions = [],
  warehouseLabel = '仓库',
  candidates = [],
  state,
  getDocumentNo,
  getPartner,
  getWarehouse,
  getBusinessDate,
  getAmount,
  onCancel,
  onSelect,
  onConfirm,
}) {
  const [filters, setFilters] = useState(createReturnSourceFilters);
  const document = candidates.find((item) => item.id === state.documentId) || null;
  const step = state.step === 'detail' && document ? 'detail' : 'list';

  const filteredCandidates = useMemo(() => filterReturnSourceDocuments(candidates, filters, {
    getDocumentNo,
    getPartner,
    getLineProductCodes: (doc) => (doc.lines || []).map((line) => line.productCode),
  }), [candidates, filters, getDocumentNo, getPartner]);

  const partnerSelectOptions = [{ value: '', label: `全部${partnerLabel}` }, ...partnerOptions];

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const detailDescription = document
    ? `${detailDescriptionPrefix} ${getDocumentNo(document)} 明细与剩余可退额度，确认后带出。`
    : detailDescriptionPrefix;

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onCancel?.(); }}
      size="xl"
      title={title}
      description={step === 'list' ? listDescription : detailDescription}
      footer={step === 'list' ? (
        <Button variant="outline" size="compact" onClick={onCancel}>取消</Button>
      ) : (
        <>
          <Button variant="outline" size="compact" className="mr-auto" onClick={() => onSelect?.(document, { step: 'list' })}>
            返回候选单
          </Button>
          <Button variant="outline" size="compact" onClick={onCancel}>取消</Button>
          <Button variant="primary" size="compact" onClick={() => onConfirm?.(document)}>确认带出</Button>
        </>
      )}
    >
      <div className="mt-3 space-y-3">
        {step === 'list' ? (
          <div className={getDialogFieldGridClassName(4)}>
            <FormField label="单号" fieldKey="source-document-no">
              <ClearableInput
                value={filters.documentNo}
                onChange={(event) => updateFilter('documentNo', event.target.value)}
                onClear={() => updateFilter('documentNo', '')}
                placeholder="请输入单号"
                aria-label="单号"
              />
            </FormField>
            <FormField label={partnerLabel} fieldKey="source-partner">
              <SelectField
                options={partnerSelectOptions}
                value={filters.partner}
                onValueChange={(value) => updateFilter('partner', value)}
                placeholder={`全部${partnerLabel}`}
                ariaLabel={partnerLabel}
              />
            </FormField>
            <FormField label="商品编码" fieldKey="source-product-code" className="col-span-2">
              <ClearableInput
                value={filters.productCode}
                onChange={(event) => updateFilter('productCode', event.target.value)}
                onClear={() => updateFilter('productCode', '')}
                placeholder="请输入商品编码"
                aria-label="商品编码"
              />
            </FormField>
          </div>
        ) : null}

        <div className="overflow-hidden rounded border border-erp-border-table-row">
          <div className="table-scroll overflow-x-auto">
            {step === 'list' ? (
              <table className={tableClassName} style={{ minWidth: '860px' }}>
                <colgroup>
                  <col className="w-[190px]" />
                  <col className="w-[200px]" />
                  <col className="w-[160px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                  <col className="w-[80px]" />
                </colgroup>
                <thead className={headClassName}>
                  <tr>
                    <th className={thClassName}>单号</th>
                    <th className={thClassName}>{partnerLabel}</th>
                    <th className={thClassName}>{warehouseLabel}</th>
                    <th className={thClassName}>业务日期</th>
                    <th className={`${thClassName} text-right`}>价税合计</th>
                    <th className={thClassName} />
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((item) => (
                    <tr key={item.id} className={rowClassName}>
                      <td className={tdClassName}>{getDocumentNo(item)}</td>
                      <td className={tdClassName}>{resolveOptionLabel(getPartner(item), partnerOptions)}</td>
                      <td className={tdClassName}>{resolveOptionLabel(getWarehouse(item), warehouseOptions)}</td>
                      <td className={tdClassName}>{getBusinessDate(item) || EMPTY_PLACEHOLDER}</td>
                      <td className={`${tdClassName} text-right`}>{formatAmount(getAmount(item) ?? 0)}</td>
                      <td className={`${tdClassName} text-center`}>
                        <button
                          type="button"
                          className="px-1 text-erp-primary hover:underline"
                          onClick={() => onSelect?.(item, { step: 'detail' })}
                        >
                          选择
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredCandidates.length && (
                    <tr>
                      <td colSpan="6" className="h-24 text-center text-[12px] text-erp-text-muted">
                        {candidates.length ? '没有符合条件的单据，请调整筛选条件' : '暂无可选来源单据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className={tableClassName} style={{ minWidth: '760px' }}>
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[200px]" />
                  <col className="w-[130px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead className={headClassName}>
                  <tr>
                    <th className={thClassName}>商品编码</th>
                    <th className={thClassName}>商品名称</th>
                    <th className={`${thClassName} text-right`}>实际数量</th>
                    <th className={`${thClassName} text-right`}>剩余可退额度</th>
                  </tr>
                </thead>
                <tbody>
                  {(document.lines || []).map((line) => (
                    <tr key={line.id} className={rowClassName}>
                      <td className={tdClassName}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                      <td className={tdClassName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                      <td className={`${tdClassName} text-right`}>{line.quantity ?? 0}</td>
                      <td className={`${tdClassName} text-right ${line.remainingQuota > 0 ? '' : 'text-erp-text-muted'}`}>
                        {line.remainingQuota ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {quotaHint ? <p className="text-[12px] text-erp-text-muted">{quotaHint}</p> : null}
      </div>
    </SimpleDialog>
  );
}
