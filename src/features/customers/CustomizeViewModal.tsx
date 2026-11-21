import React from 'react';
import { Eye, EyeOff, RotateCcw, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { INITIAL_COLUMNS } from '../../data/mockData';

export const CustomizeViewModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.customizeView);
  const closeModal = useStore((s) => s.closeModal);
  const columns = useStore((s) => s.columns);
  const toggleColumn = useStore((s) => s.toggleColumn);
  const reorderColumns = useStore((s) => s.reorderColumns);
  const addToast = useStore((s) => s.addToast);

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
      title="Customize Table View"
      subtitle="Toggle visible columns and customize subscriber data density"
      size="md"
    >
      <div className="space-y-4 text-xs select-none">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <span className="font-semibold text-gray-500">Available Columns</span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-semibold text-[#F26B3A] hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {columns
            .filter((c) => c.id !== 'select' && c.id !== 'action')
            .map((col) => (
              <div
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1E1E22] hover:border-[#F26B3A]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      col.visible
                        ? 'bg-[#F26B3A] border-[#F26B3A] text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {col.visible && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{col.label}</span>
                </div>

                <div className="text-gray-400">
                  {col.visible ? <Eye className="w-4 h-4 text-[#F26B3A]" /> : <EyeOff className="w-4 h-4" />}
                </div>
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="primary"
            onClick={() => closeModal('customizeView')}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
