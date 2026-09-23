import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from './DocumentEditorFrame.jsx';
import { FormFields } from './FormControl.jsx';
import { LineItemTable } from './LineItemTable.jsx';
import { Button } from '../ui/button.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { useDocumentForm } from '../../hooks/useDocumentForm.js';
import { currencySymbol } from '../../lib/money.js';

function groupFormFields(fields, fieldSections, fallbackTitle) {
  if (!fieldSections?.length) {
    return [{ title: fallbackTitle, fields }];
  }

  return fieldSections.map((section) => ({
    title: section.title,
    fields: fields.filter((field) => field.section === section.key),
  }));
}

/**
 * 配置驱动的单据新增/编辑页。
 * 页面只负责提供业务配置，通用的编辑状态、基础信息和明细区由此组件统一编排。
 */
export function DocumentFormPage({ mode = 'create', context, onFeedback, onOpenPage, config }) {
  const isCreate = mode === 'create';
  const contextId = context?.row?.id || 'create';
  const hiddenOnCreate = new Set(config.hiddenOnCreate || []);
  const baseFormFields = typeof config.formFields === 'function' ? config.formFields({ mode, context }) : config.formFields;

  const {
    form,
    dirty,
    fieldErrors,
    setFieldErrors,
    totalQuantity,
    totalAmount,
    updateField,
    updateLine,
    addLine,
    removeLine,
    replaceLineWithItems,
    save,
    applyValidationResult,
  } = useDocumentForm({
    mode,
    context,
    contextId,
    getInitialForm: config.getInitialForm,
    validate: config.validate,
    transformOnSubmit: config.transformOnSubmit,
    prepareOnSave: config.prepareOnSave,
    navigateOnSave: config.navigateOnSave,
    onPersist: (nextForm, meta) => {
      if (config.toListRow && config.persistRow) config.persistRow(config.toListRow(nextForm, meta), meta);
    },
    onFeedback,
    onNavigate: () => onOpenPage?.(config.listPageId),
  });

  const fields = baseFormFields.filter((field) => {
    if (isCreate && hiddenOnCreate.has(field.key)) return false;
    if (typeof field.visible === 'function' && !field.visible(form)) return false;
    return true;
  });
  const sections = groupFormFields(fields, config.fieldSections, config.infoSectionTitle);

  const rawStatusBadges = config.getStatusBadges?.({ form, mode, context }) ?? [];
  const statusBadges = isCreate && config.showStatusOnCreate !== true ? [] : rawStatusBadges;
  const showSubmit = config.showSubmit?.({ form, mode, context }) ?? true;

  function handleSave(shouldSubmit = false) {
    if (shouldSubmit && config.onSubmitRequest) {
      config.onSubmitRequest({
        form,
        save: (message) => save(message, true),
        applyValidationResult,
        setFieldErrors,
      });
      return;
    }
    const messageBuilder = shouldSubmit ? config.submitMessage : config.saveMessage;
    save(messageBuilder({ form, isCreate }), shouldSubmit);
  }

  return (
    <DocumentEditorFrame
      title={isCreate ? config.createTitle : config.editTitle}
      statuses={statusBadges}
      dirty={dirty}
      onCancel={() => onOpenPage?.(config.listPageId)}
      onSave={() => handleSave(false)}
      onSaveAndSubmit={showSubmit ? () => handleSave(true) : undefined}
      saveLabel={config.saveLabel || '保存'}
      submitLabel={config.submitLabel || '提交审核'}
      showSubmit={showSubmit}
    >
      {sections.map((section) => (
        <EditorCard key={section.title} title={section.title}>
          <div className={config.fieldGridClassName || erpFieldGridClassName}>
            <FormFields fields={section.fields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          </div>
        </EditorCard>
      ))}

      <EditorCard
        title={config.lineSectionTitle}
        actions={(
          <Button variant="outline" size="compact" onClick={() => addLine(config.createLine)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
            {config.addLineLabel || '添加明细'}
          </Button>
        )}
      >
        <LineItemTable
          variant={config.lineVariant}
          mode="edit"
          lines={form.lines}
          onLineChange={updateLine}
          onLineRemove={removeLine}
          onLineSkusSelect={(lineId, selectedSkus) => replaceLineWithItems(lineId, selectedSkus, config.createLineFromSku || config.createLine)}
          enableSkuPicker={config.enableSkuPicker}
          editorOptions={config.lineEditorOptions}
          summary={config.buildLineSummary?.({
            form,
            totalQuantity,
            totalAmount,
            currency: form[config.currencyKey || 'currency'],
          }) ?? {
            quantity: { label: config.summary.quantityLabel, value: totalQuantity },
            amount: { label: config.summary.amountLabel, value: totalAmount, format: 'amount', prefix: `${currencySymbol(form[config.currencyKey || 'currency'])} `, emphasis: true },
          }}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
