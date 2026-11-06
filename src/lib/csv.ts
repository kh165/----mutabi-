/**
 * Utilities for exporting user logs and admin reports to CSV format.
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Add UTF-8 BOM so Excel opens Arabic correctly
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map(row =>
        row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
