import React from 'react';
import { X, Copy, Trash2, Forward } from 'lucide-react';

interface SelectionHeaderProps {
  selectedCount: number;
  canCopy: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onForward: () => void;
}

export const SelectionHeader: React.FC<SelectionHeaderProps> = ({
  selectedCount,
  canCopy,
  onCancel,
  onDelete,
  onCopy,
  onForward
}) => {
  return (
    <div className="bg-indigo-600 text-white p-3 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-indigo-700 transition-colors mr-2"
        >
          <X size={20} />
        </button>
        <span className="font-medium">{selectedCount} محدد</span>
      </div>

      <div className="flex space-x-2">
        {canCopy && (
          <button 
            onClick={onCopy}
            className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
            title="نسخ"
          >
            <Copy size={18} />
          </button>
        )}

        <button 
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
          title="حذف"
        >
          <Trash2 size={18} />
        </button>

        <button 
          onClick={onForward}
          className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
          title="إعادة توجيه"
        >
          <Forward size={18} />
        </button>
      </div>
    </div>
  );
};

SelectionHeader.displayName = 'SelectionHeader';
