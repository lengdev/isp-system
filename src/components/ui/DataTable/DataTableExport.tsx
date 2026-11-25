import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Code2, Printer, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Popover } from '../Popover';
import { Button } from '../Button';
import { DataTableColumnDef } from './types';
import { downloadCSV } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

interface DataTableExportProps<T> {
  data: T[];
  selectedRows: T[];
  filteredData: T[];
  columns: DataTableColumnDef<T>[];
  visibleColumnIds: string[];
  filename?: string;
  onToast: (toast: { type: 'success' | 'info' | 'error'; title: string; message: string }) => void;
}

export const DataTableExport = <T extends Record<string, any>>({
  data,
  selectedRows,
  filteredData,
  columns,
  visibleColumnIds,
  filename = 'export-data',
  onToast,
}: DataTableExportProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<'filtered' | 'selected' | 'all'>('filtered');
  const [columnScope, setColumnScope] = useState<'visible' | 'all'>('visible');

  const exportColumns = columns.filter((col) => {
    if (columnScope === 'visible') return visibleColumnIds.includes(col.id);
    return true;
  });

  const getTargetRows = (): T[] => {
    if (scope === 'selected' && selectedRows.length > 0) return selectedRows;
    if (scope === 'all') return data;
    return filteredData;
  };

  const getFormattedData = () => {
    const rows = getTargetRows();
    const expandedDescriptors = exportColumns.flatMap((col) => {
      if (col.exportFields && col.exportFields.length > 0) {
        return col.exportFields.map((field) => ({
          header: field.header,
          getValue: (row: T) => field.getValue(row) ?? '',
        }));
      }
      return [
        {
          header: typeof col.header === 'string' ? col.header : col.id,
          getValue: (row: T) => {
            if (col.exportValue) return col.exportValue(row);
            if (col.accessorFn) return col.accessorFn(row);
            if (col.accessorKey) return row[col.accessorKey as string];
            return '';
          },
        },
      ];
    });

    const headers = expandedDescriptors.map((d) => d.header);
    const formattedRows = rows.map((row) =>
      expandedDescriptors.map((d) => d.getValue(row))
    );

    return { headers, formattedRows, rows };
  };

  const handleExportCSV = () => {
    const { headers, formattedRows } = getFormattedData();
    downloadCSV(`${filename}-${Date.now()}.csv`, headers, formattedRows);
    onToast({
      type: 'success',
      title: 'CSV Export Complete',
      message: `Exported ${formattedRows.length} records to CSV.`,
    });
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    const { headers, formattedRows } = getFormattedData();
    const sheetData = [headers, ...formattedRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}-${Date.now()}.xlsx`);
    onToast({
      type: 'success',
      title: 'Excel Export Complete',
      message: `Exported ${formattedRows.length} records to Excel workbook.`,
    });
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    const { rows } = getFormattedData();
    const jsonStr = JSON.stringify(rows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast({
      type: 'success',
      title: 'JSON Export Complete',
      message: `Downloaded JSON structure with ${rows.length} records.`,
    });
    setIsOpen(false);
  };

  const handlePrintPDF = () => {
    window.print();
    setIsOpen(false);
  };

  return (
    <Popover
      align="right"
      width="288px"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button
          type="button"
          className="h-8 flex items-center gap-1.5 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] text-[12px] font-medium transition-colors shadow-xs select-none whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 stroke-[1.75]" />
          <span className="hidden sm:inline">Export</span>
        </button>
      }
      content={
        <div className="w-72 p-3.5 select-none space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-[12px]">
              Export Options
            </span>
            <span className="text-[11px] text-gray-400">
              {getTargetRows().length} rows
            </span>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Data Scope
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'filtered', label: 'Filtered' },
                { id: 'selected', label: `Selected (${selectedRows.length})`, disabled: selectedRows.length === 0 },
                { id: 'all', label: `All (${data.length})` },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => setScope(opt.id as any)}
                  className={cn(
                    'py-1 px-1.5 rounded-lg border text-[11px] font-medium text-center transition-colors',
                    scope === opt.id
                      ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300',
                    opt.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column Scope */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Columns
            </label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'visible', label: 'Visible Only' },
                { id: 'all', label: 'All Columns' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColumnScope(c.id as any)}
                  className={cn(
                    'py-1 px-2 rounded-lg border text-[11px] font-medium text-center transition-colors',
                    columnScope === c.id
                      ? 'bg-[#FFF1EA] dark:bg-orange-950/40 border-[#F26B3A] text-[#F26B3A]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors font-medium text-gray-800 dark:text-gray-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#F26B3A]" />
              <span>Download CSV (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors font-medium text-gray-800 dark:text-gray-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors font-medium text-gray-800 dark:text-gray-200"
            >
              <Code2 className="w-4 h-4 text-blue-500" />
              <span>Download JSON (.json)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors font-medium text-gray-800 dark:text-gray-200"
            >
              <Printer className="w-4 h-4 text-purple-500" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      }
    />
  );
};
