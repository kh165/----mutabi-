import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportToCSV } from '../src/lib/csv.js';

describe('exportToCSV formula injection protection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function captureCSV(headers, rows) {
    let csv;
    vi.stubGlobal('Blob', class {
      constructor(parts) { csv = parts.join(''); }
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    const link = { setAttribute: vi.fn(), click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => link);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => link);

    exportToCSV('test', headers, rows);
    return csv;
  }

  it('prefixes formula-like text, including after whitespace, without breaking CSV escaping', () => {
    const csv = captureCSV(['Header'], [['=1+1', ' +SUM(A1:A2)', '\t-2', ' @cmd', 'safe "text"']]);
    expect(csv).toBe('\uFEFF"Header"\r\n"\'=1+1","\' +SUM(A1:A2)","\'\t-2","\' @cmd","safe ""text"""');
  });

  it('leaves ordinary strings and non-string negative numbers unchanged', () => {
    const csv = captureCSV(['Name', 'Amount'], [['hello', -5, '2026-11-14', '']]);
    expect(csv).toBe('\uFEFF"Name","Amount"\r\n"hello","-5","2026-11-14",""');
  });
});
