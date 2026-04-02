import React from 'react';
import { X, Trash2, Copy, ArrowRight, CornerUpRight, CheckSquare } from 'lucide-react';

interface SelectionHeaderProps {
    count: number;
    onClear: () => void;
    onDelete: () => void;
    onCopy: () => void;
    onForward: () => void;
    onSelectAll?: () => void;
    isCopyDisabled?: boolean; // ✅ جديد: لتعطيل النسخ في حالات معينة
}

export function SelectionHeader({
    count,
    onClear,
    onDelete,
    onCopy,
    onForward,
    onSelectAll,
    isCopyDisabled = false // القيمة الافتراضية
}: SelectionHeaderProps) {
    if (count === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Left: Close & Count */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClear}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                        title="إغلاق الاختيار"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">
                            {count} {count === 1 ? 'رسالة مختارة' : 'رسائل مختارة'}
                        </span>
                        <button 
                            onClick={onSelectAll}
                            className="text-primary-600 dark:text-primary-400 text-xs font-semibold hover:underline flex items-center gap-1"
                        >
                            <CheckSquare size={12} />
                            تحديد الكل
                        </button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                        onClick={onCopy}
                        disabled={isCopyDisabled}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all group ${
                            isCopyDisabled 
                            ? 'opacity-30 grayscale cursor-not-allowed' 
                            : 'hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
                        title={isCopyDisabled ? "لا يمكن نسخ هذا العنصر" : "نسخ"}
                    >
                        <Copy size={20} className={`${isCopyDisabled ? 'text-slate-400' : 'text-green-600 dark:text-green-400'} group-active:scale-95`} />
                        <span className={`text-[10px] mt-1 font-medium hidden sm:block ${isCopyDisabled ? 'text-slate-400' : 'text-green-700 dark:text-green-300'}`}>نسخ</span>
                    </button>

                    <button 
                        onClick={onForward}
                        className="flex flex-col items-center p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all group"
                        title="تحويل"
                    >
                        <CornerUpRight size={20} className="text-blue-600 dark:text-blue-400 group-active:scale-95" />
                        <span className="text-[10px] mt-1 font-medium text-blue-700 dark:text-blue-300 hidden sm:block">تحويل</span>
                    </button>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1"></div>

                    <button 
                        onClick={onDelete}
                        className="flex flex-col items-center p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all group"
                        title="حذف"
                    >
                        <Trash2 size={20} className="text-rose-600 dark:text-rose-400 group-active:scale-95 animate-pulse-subtle" />
                        <span className="text-[10px] mt-1 font-medium text-rose-700 dark:text-rose-300 hidden sm:block">حذف</span>
                    </button>
                </div>
            </div>
            
            {/* Progress Bar under header */}
            <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800">
                <div 
                    className="h-full bg-primary-500 transition-all duration-300 ease-out" 
                    style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                ></div>
            </div>
        </div>
    );
}
