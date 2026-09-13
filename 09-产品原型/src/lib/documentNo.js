export function nextDocumentNo(prefix, date) {
  const day = String(date || '').replaceAll('-', '');
  return `${prefix}-${day}-${String(Date.now()).slice(-5).padStart(5, '0')}`;
}
