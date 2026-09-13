const DELIMITERS = { csv: ',', tsv: '\t' };
let xlsxModulePromise;

function loadXlsx() {
  xlsxModulePromise ||= import('xlsx');
  return xlsxModulePromise;
}

export function resolveFileFormat(fileName) {
  const extension = String(fileName).split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xls') return 'xlsx';
  if (extension === 'tsv') return 'tsv';
  return 'csv';
}

export function normalizeCellValue(value) {
  return String(value ?? '').replace(/\uFEFF/g, '').trim();
}

export function parseDelimitedText(text, delimiter) {
  const source = String(text).replace(/^\uFEFF/, '');
  const matrix = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(value);
      value = '';
      continue;
    }
    if (char === '\n') {
      row.push(value);
      matrix.push(row);
      row = [];
      value = '';
      continue;
    }
    if (char === '\r') {
      if (source[index + 1] === '\n') continue;
      row.push(value);
      matrix.push(row);
      row = [];
      value = '';
      continue;
    }
    value += char;
  }
  if (value !== '' || row.length) {
    row.push(value);
    matrix.push(row);
  }
  return matrix;
}

export function matrixToTable(matrix) {
  const normalized = (Array.isArray(matrix) ? matrix : []).map((row) => (Array.isArray(row) ? row.map(normalizeCellValue) : []));
  const nonEmpty = normalized.filter((row) => row.some((cell) => cell !== ''));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const [headers, ...rows] = nonEmpty;
  return { headers, rows };
}

export async function parseSpreadsheetFile(file) {
  const format = resolveFileFormat(file.name);
  if (format === 'xlsx') {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { format, headers: [], rows: [] };
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
    return { format, ...matrixToTable(matrix) };
  }
  const text = await file.text();
  return { format, ...matrixToTable(parseDelimitedText(text, DELIMITERS[format])) };
}

function escapeCell(value, delimiter) {
  const text = value == null ? '' : String(value);
  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toDelimitedText({ headers, rows, format }) {
  const delimiter = DELIMITERS[format] || ',';
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCell(cell, delimiter)).join(delimiter));
  return lines.join('\r\n');
}

export function buildDelimitedBlob({ headers, rows, format }) {
  return new Blob([`\uFEFF${toDelimitedText({ headers, rows, format })}`], { type: 'text/plain;charset=utf-8' });
}

export async function buildWorkbookBlob(sheets) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function buildSheetBlob({ headers, rows, format = 'csv', sheetName = '数据' }) {
  if (format === 'xlsx') return buildWorkbookBlob([{ name: sheetName, headers, rows }]);
  return buildDelimitedBlob({ headers, rows, format });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
