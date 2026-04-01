import React from 'react';
import { X } from 'lucide-react';

interface Participant {
  user_id: string;
  name: string;
  emoji: string;
}

interface ReactionListDialogProps {
  participants: Participant[];
  currentUserId?: string;
  onRemove: (emoji: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const ReactionListDialog: React.FC<ReactionListDialogProps> = ({ 
  participants, 
  currentUserId, 
  onRemove, 
  onClose,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-[280px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">المتفاعلون</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto py-1">
          {participants.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">لا يوجد متفاعلون بعد</div>
          )}
          
          {participants.map((p) => {
            const isMe = p.user_id === currentUserId;
            return (
              <div 
                key={p.user_id} 
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="text-lg">{p.emoji}</div>
                  <span className={`text-sm ${isMe ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {isMe ? 'أنت' : p.name}
                  </span>
                </div>
                
                {isMe && (
                  <button 
                    onClick={() => onRemove(p.emoji)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-full transition-colors"
                    title="حذف تفاعلك"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
