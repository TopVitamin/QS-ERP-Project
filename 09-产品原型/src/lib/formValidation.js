/** 将校验结果统一成 { fieldErrors, lineErrors, message }，供表单页内联标红。 */
export function normalizeValidationResult(result) {
  if (!result) return null;
  if (typeof result === 'string') return { fieldErrors: {}, lineErrors: {}, message: result };
  const fieldErrors = result.fieldErrors || {};
  const lineErrors = result.lineErrors || {};
  const firstFieldMessage = Object.values(fieldErrors)[0];
  const firstLineMessage = Object.values(lineErrors).flatMap((errors) => Object.values(errors))[0];
  return {
    fieldErrors,
    lineErrors,
    message: result.message || firstFieldMessage || firstLineMessage || null,
  };
}

export function emptyFieldMessage(label) {
  const text = typeof label === 'string' ? label.replace(/\s*\*$/, '').trim() : label;
  return `${text}不能为空`;
}

export function hasFieldErrors(fieldErrors = {}) {
  return Object.keys(fieldErrors).length > 0;
}
