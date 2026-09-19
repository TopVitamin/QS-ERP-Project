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
  }, [mode, contextId, context, getInitialForm]);

  function clearFieldError(key) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateField(key, value) {
    clearFieldError(key);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLine(id, key, value) {
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
    setForm((current) => ({
      ...current,
      lines: current.lines.length <= 1 ? current.lines : current.lines.filter((line) => line.id !== id),
    }));
  }

  function replaceLineWithItems(id, items, createLine) {
    setForm((current) => {
      const targetIndex = current.lines.findIndex((line) => line.id === id);
      if (targetIndex < 0) return current;

      const targetLine = current.lines[targetIndex];
      const nextLines = items.length
        ? items.map((item) => createLine(item, targetLine))
        : [createLine()];

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
    if (hasFieldErrors(normalized.fieldErrors)) {
      focusFirstFieldError(normalized.fieldErrors);
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
