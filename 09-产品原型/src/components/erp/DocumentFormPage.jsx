import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from './DocumentEditorFrame.jsx';
import { FormFields } from './FormControl.jsx';
import { LineItemTable } from './LineItemTable.jsx';
import { Button } from '../ui/button.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { useDocumentForm } from '../../hooks/useDocumentForm.js';

/**
 * 配置驱动的单据新增/编辑页。
 * 页面只负责提供业务配置，通用的编辑状态、基础信息和明细区由此组件统一编排。
 */
export function DocumentFormPage({ mode = 'create', context, onFeedback, onOpenPage, config }) {
  const isCreate = mode === 'create';
  const contextId = context?.row?.id || 'create';
  const hiddenOnCreate = new Set(config.hiddenOnCreate || []);
  const formFields = typeof config.formFields === 'function' ? config.formFields({ mode, context }) : config.formFields;
  const fields = formFields.filter((field) => !(isCreate && hiddenOnCreate.has(field.key)));

  const {
    form,
    dirty,
    totalQuantity,
    totalAmount,
    updateField,
    updateLine,
    addLine,
    removeLine,
    replaceLineWithItems,
    save,
  } = useDocumentForm({
    mode,
    context,
    contextId,
    getInitialForm: config.getInitialForm,
    validate: config.validate,
    transformOnSubmit: config.transformOnSubmit,
    prepareOnSave: config.prepareOnSave,
    onPersist: (nextForm, meta) => {
      if (config.toListRow && config.persistRow) config.persistRow(config.toListRow(nextForm, meta), meta);
    },
    onFeedback,
    onNavigate: () => onOpenPage?.(config.listPageId),
  });

  function handleSave(shouldSubmit = false) {
    const messageBuilder = shouldSubmit ? config.submitMessage : config.saveMessage;
    save(messageBuilder({ form, isCreate }), shouldSubmit);
  }

  return (
    <DocumentEditorFrame
      title={isCreate ? config.createTitle : config.editTitle}
      status={isCreate ? undefined : form[config.statusKey || 'status']}
      dirty={dirty}
      onCancel={() => onOpenPage?.(config.listPageId)}
      onSave={() => handleSave(false)}
      onSaveAndSubmit={() => handleSave(true)}
      saveLabel={config.saveLabel || '保存草稿'}
      submitLabel={config.submitLabel || '保存并审核'}
    >
      <EditorCard title={config.infoSectionTitle}>
        <div className={config.fieldGridClassName || erpFieldGridClassName}>
          <FormFields fields={fields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard
        title={config.lineSectionTitle}
        actions={(
          <Button variant="outline" size="compact" onClick={() => addLine(config.createLine)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
            {config.addLineLabel || '新增明细'}
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
          summary={{
            quantity: { label: config.summary.quantityLabel, value: totalQuantity },
            amount: { label: config.summary.amountLabel, value: totalAmount, format: 'amount', prefix: '¥ ', emphasis: true },
          }}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
