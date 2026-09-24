import { useEffect, useMemo, useState } from 'react';
import { calculateLineAmount } from '../lib/format.js';
import { hasFieldErrors, normalizeValidationResult } from '../lib/formValidation.js';

function focusFirstFieldError(fieldErrors) {
  if (typeof document === 'undefined') return;
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;
  const target = document.querySelector(`[data-field-key="${firstKey}"] input, [data-field-key="${firstKey}"] button, [data-field-key="${firstKey}"] textarea`);
  target?.focus?.();
  target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

function focusFirstLineError(lineErrors) {
  if (typeof document === 'undefined') return;
  const firstLineId = Object.keys(lineErrors)[0];
  if (!firstLineId) return;
  const row = document.querySelector(`[data-line-error="${firstLineId}"]`);
  row?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

export function useDocumentForm({
  mode,
  context,
  contextId,
  getInitialForm,
  validate,
  transformOnSubmit,
  prepareOnSave,
  onPersist,
  onFeedback,
  onNavigate,
  navigateOnSave = true,
}) {
  const [form, setForm] = useState(() => getInitialForm(mode, context));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(getInitialForm(mode, context)));
  const [fieldErrors, setFieldErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const dirty = JSON.stringify(form) !== savedSnapshot;

  const totalQuantity = useMemo(
    () => form.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
    [form.lines],
  );

  const totalAmount = useMemo(
    () => form.lines.reduce((sum, line) => sum + calculateLineAmount(line), 0),
    [form.lines],
  );

  useEffect(() => {
    const nextForm = getInitialForm(mode, context);
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
    setLineErrors({});
  }, [mode, contextId, context, getInitialForm]);

  function clearFieldError(key) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  /** 明细行内错误：字段变更后清除该行的对应错误；整行替换或删除时清除该行全部错误。 */
  function clearLineError(id, key) {
    setLineErrors((current) => {
      const rowErrors = current[id];
      if (!rowErrors) return current;
      if (key && !rowErrors[key]) return current;
      const next = { ...current };
      if (key) {
        const nextRowErrors = { ...rowErrors };
        delete nextRowErrors[key];
        if (Object.keys(nextRowErrors).length) next[id] = nextRowErrors;
        else delete next[id];
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function updateField(key, value) {
    clearFieldError(key);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLine(id, key, value) {
    clearLineError(id, key);
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, [key]: value } : line)),
    }));
  }

  function addLine(createLine) {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createLine()],
    }));
  }

  function removeLine(id) {
    clearLineError(id);
    setForm((current) => ({
      ...current,
      lines: current.lines.length <= 1 ? current.lines : current.lines.filter((line) => line.id !== id),
    }));
  }

  function replaceLineWithItems(id, items, createLine) {
    clearLineError(id);
    setForm((current) => {
      const targetIndex = current.lines.findIndex((line) => line.id === id);
      if (targetIndex < 0) return current;

      const targetLine = current.lines[targetIndex];
      // 未选商品（items 为空）时保留一行空行：把原行作为模板传入，避免 createLineFromSku 读 undefined 模板。
      const nextLines = items.length
        ? items.map((item) => createLine(item, targetLine))
        : [createLine(undefined, targetLine)];

      return {
        ...current,
        lines: [...current.lines.slice(0, targetIndex), ...nextLines, ...current.lines.slice(targetIndex + 1)],
      };
    });
  }

  function applyValidationResult(result) {
    const normalized = normalizeValidationResult(result);
    if (!normalized) return true;

    setFieldErrors(normalized.fieldErrors);
    setLineErrors(normalized.lineErrors);
    if (hasFieldErrors(normalized.fieldErrors)) {
      focusFirstFieldError(normalized.fieldErrors);
      return false;
    }
    if (Object.keys(normalized.lineErrors).length) {
      // 明细错误在行内展示，不再重复 Toast。
      focusFirstLineError(normalized.lineErrors);
      return false;
    }

    if (normalized.message) {
      onFeedback?.(normalized.message, 'warning');
    }
    return false;
  }

  function save(message, shouldSubmit = false) {
    if (!applyValidationResult(validate?.(form))) return false;

    const transformedForm = shouldSubmit && transformOnSubmit ? transformOnSubmit(form) : form;
    const nextForm = prepareOnSave ? prepareOnSave(transformedForm, { mode, shouldSubmit, context }) : transformedForm;
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
    setLineErrors({});
    onPersist?.(nextForm, { mode, shouldSubmit, context });
    onFeedback?.(message, 'success');
    if (navigateOnSave) onNavigate?.();
    return true;
  }

  return {
    form,
    dirty,
    fieldErrors,
    setFieldErrors,
    lineErrors,
    setLineErrors,
    totalQuantity,
    totalAmount,
    updateField,
    updateLine,
    addLine,
    removeLine,
    replaceLineWithItems,
    save,
    applyValidationResult,
  };
}
