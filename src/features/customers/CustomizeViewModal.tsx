import React, { useMemo } from 'react';
import { RotateCcw, Check, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { INITIAL_COLUMNS } from '../../data/mockData';

export const CustomizeViewModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.customizeView);
  const closeModal = useStore((s) => s.closeModal);
  const columns = useStore((s) => s.columns);
  const toggleColumn = useStore((s) => s.toggleColumn);
  const reorderColumns = useStore((s) => s.reorderColumns);
  const addToast = useStore((s) => s.addToast);

  const columnOptions: ComboboxOption[] = useMemo(() => {
    return columns
      .filter((c) => c.id !== 'select' && c.id !== 'action')
      .map((col) => ({
        value: col.id,
        label: col.label,
        description: `Identifier: ${col.id}`,
      }));
  }, [columns]);

  const visibleColumnIds = useMemo(() => {
    return columns
      .filter((c) => c.visible && c.id !== 'select' && c.id !== 'action')
      .map((c) => c.id);
  }, [columns]);

  const handleVisibleColumnsChange = (newSelected: string[]) => {
    const updated = columns.map((col) => {
      if (col.id === 'select' || col.id === 'action') return col;
      return {
        ...col,
        visible: newSelected.includes(col.id),
      };
    });
    reorderColumns(updated);
  };

  const handleReset = () => {
    reorderColumns(INITIAL_COLUMNS);
    addToast({
      type: 'info',
      title: 'Columns Reset',
      message: 'Restored default table view columns.',
    });
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('customizeView')}
      size="md"
      icon={<SlidersHorizontal className="w-5 h-5" />}
      iconColor="orange"
      title="Customize Table View"
      subtitle="Toggle visible columns and configure subscriber data density"
      footer={
        <ModalFooter
          leftSlot={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 px-3 text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </Button>
          }
          onSubmit={() => closeModal('customizeView')}
          submitText="Done"
        />
      }
    >
      <div className="space-y-4">
        {/* Multi-select Combobox for Column Visibility */}
        <Field label="Visible columns" helperText="Choose which subscriber attributes are displayed in the table">
          <Combobox
            options={columnOptions}
            value={visibleColumnIds}
            onChange={(val) => handleVisibleColumnsChange(val as string[])}
            multiple={true}
            placeholder="Choose columns..."
            size="md"
          />
        </Field>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin select-none">
          {columns
            .filter((c) => c.id !== 'select' && c.id !== 'action')
            .map((col) => (
              <div
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className="flex items-center justify-between p-3 rounded-[10px] border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-[#18181B] hover:border-[#F26B3A]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      col.visible
                        ? 'bg-[#F26B3A] border-[#F26B3A] text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {col.visible && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-medium text-xs text-gray-800 dark:text-gray-200">
                    {col.label}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">{col.id}</span>
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
};
