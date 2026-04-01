import React from 'react';
import { Copy, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ReactionToolbarProps {
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onClose: () => void;
  isVisible: boolean;
  position: 'top' | 'bottom';
}

const EMOJIS = ['❤️', '👍', '😂', '😢', '🔥', '🌹', '🙏'];

export const ReactionToolbar: React.FC<ReactionToolbarProps> = ({ 
  onReact, 
  onCopy, 
  onClose, 
  isVisible,
  position 
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className={`absolute z-[100] flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-full shadow-2xl animate-in fade-in zoom-in duration-200
        ${position === 'top' ? '-top-12' : '-bottom-12'} left-1/2 -translate-x-1/2`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
      >
        <X size={16} />
      </button>

      <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

      <button
        onClick={(e) => { e.stopPropagation(); onCopy(); }}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
        title="نسخ"
      >
        <Copy size={16} />
      </button>

      <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

      <div className="flex items-center gap-0.5 px-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
            className="text-lg hover:scale-125 transition-transform p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
