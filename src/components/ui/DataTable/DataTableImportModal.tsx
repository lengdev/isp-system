import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Modal } from '../Modal';
import { Combobox, ComboboxOption } from '../Combobox';
import { Button } from '../Button';
import { DataTableColumnDef } from './types';
import { cn } from '../../../lib/utils';

interface DataTableImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  columns: DataTableColumnDef<T>[];
  onImport: (rows: Partial<T>[]) => void | Promise<void>;
  onToast: (toast: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export const DataTableImportModal = <T extends Record<string, any>>({
  isOpen,
  onClose,
  columns,
  onImport,
  onToast,
}: DataTableImportModalProps<T>) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target columns that can be mapped
  const targetColumnOptions: ComboboxOption[] = columns
    .filter((c) => c.accessorKey || c.id)
    .map((c) => ({
      value: (c.accessorKey as string) || c.id,
      label: typeof c.header === 'string' ? c.header : c.id,
    }));

  const handleFileUpload = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1, 11).map((line) =>
        line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      );

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-guess mapping based on header similarity
      const initialMap: Record<string, string> = {};
      headers.forEach((h) => {
        const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = targetColumnOptions.find((opt) => {
          const lowerOpt = opt.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          const lowerVal = opt.value.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            lowerH.includes(lowerOpt) ||
            lowerOpt.includes(lowerH) ||
            lowerH.includes(lowerVal)
          );
        });
        if (match) {
          initialMap[h] = match.value;
        }
      });
      setMapping(initialMap);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    setIsSubmitting(true);
    try {
      const mappedRows: Partial<T>[] = csvRows.map((row) => {
        const item: any = {};
        csvHeaders.forEach((header, idx) => {
          const targetKey = mapping[header];
          if (targetKey && row[idx] !== undefined) {
            item[targetKey] = row[idx];
          }
        });
        return item;
      });

      await onImport(mappedRows);
      onToast({
        type: 'success',
        title: 'Import Successful',
        message: `Imported ${mappedRows.length} valid records.`,
      });
      onClose();
    } catch (err: any) {
      onToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message || 'An error occurred during CSV parsing.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Import CSV Records"
      subtitle="Upload a comma-separated file and map its columns to subscriber fields"
      icon={<Upload className="w-5 h-5 text-[#F26B3A]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-500">
            {csvRows.length > 0 ? `${csvRows.length} preview rows detected` : 'No file loaded'}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={csvRows.length === 0 || isSubmitting}
              isLoading={isSubmitting}
              onClick={handleExecuteImport}
            >
              Import {csvRows.length} Valid Rows
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Drop zone */}
        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#F26B3A] rounded-2xl p-8 text-center transition-colors bg-gray-50/50 dark:bg-gray-800/20"
          >
            <FileSpreadsheet className="w-10 h-10 text-[#F26B3A] mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Drag & Drop your CSV file here
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Supports standard RFC 4180 CSV files up to 10MB
            </p>
            <label className="cursor-pointer">
              <span className="h-8 px-4 inline-flex items-center justify-center rounded-lg bg-[#F26B3A] text-white text-xs font-semibold hover:bg-[#E05220] transition-colors">
                Browse File
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-[#F26B3A]/20">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-[#F26B3A]" />
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                  {file.name}
                </span>
                <span className="text-[11px] text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB • {csvHeaders.length} columns found
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setCsvHeaders([]);
                setCsvRows([]);
                setMapping({});
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Column Mapping Section */}
        {csvHeaders.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
              Field Mapping
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="p-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                    {header}
                  </span>
                  <div className="w-36">
                    <Combobox
                      options={targetColumnOptions}
                      value={mapping[header] || ''}
                      onChange={(val) =>
                        setMapping((prev) => ({ ...prev, [header]: val as string }))
                      }
                      placeholder="Ignore field"
                      size="sm"
                      searchable={true}
                      clearable={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview of first rows */}
        {csvRows.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
              Preview (First {csvRows.length} Rows)
            </h5>
            <div className="overflow-x-auto max-h-36 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0">
                  <tr>
                    {csvHeaders.map((h) => (
                      <th key={h} className="px-2.5 py-1.5 font-semibold text-gray-500 whitespace-nowrap">
                        {h} {mapping[h] && <span className="text-[#F26B3A] font-bold">→ {mapping[h]}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {csvRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1 text-gray-600 dark:text-gray-300 truncate max-w-[140px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
