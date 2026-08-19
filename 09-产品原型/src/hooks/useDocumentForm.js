import { useEffect, useMemo, useState } from 'react';
import { calculateLineAmount } from '../lib/format.js';

export function useDocumentForm({
  mode,
  context,
  contextId,
  getInitialForm,
  validate,
  transformOnSubmit,
  onFeedback,
  onNavigate,
}) {
  const [form, setForm] = useState(() => getInitialForm(mode, context));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(getInitialForm(mode, context)));
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
  }, [mode, contextId]);

  function updateField(key, value) {
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

  function save(message, shouldSubmit = false) {
    const error = validate?.(form);
    if (error) {
      onFeedback?.(error, 'warning');
      return;
    }
    const nextForm = shouldSubmit && transformOnSubmit ? transformOnSubmit(form) : form;
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    onFeedback?.(message, 'success');
    onNavigate?.();
  }

  return {
    form,
    dirty,
    totalQuantity,
    totalAmount,
    updateField,
    updateLine,
    addLine,
    removeLine,
    save,
  };
}
