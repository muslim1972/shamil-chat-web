import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    className?: string; // لدعم تخصيص الستايل
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
    selectedDate,
    onDateSelect,
    className
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

        // تعديل بداية الأسبوع ليكون السبت (أو الأحد حسب المنطقة، هنا نفترض الأحد 0)
        // لنبدأ من السبت (6) أو الأحد (0). لنجعلها الأحد كبداية قياسية

        const daysArray = Array(days).fill(null).map((_, i) => new Date(year, month, i + 1));
        const padding = Array(firstDay).fill(null);

        return [...padding, ...daysArray];
    };

    const days = getDaysInMonth(currentMonth);

    const previousMonth = () => {
        if (currentMonth.getMonth() === minDate.getMonth() && currentMonth.getFullYear() === minDate.getFullYear()) return;
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (date: Date | null) => {
        if (!date) return false;
        return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isDisabled = (date: Date | null) => {
        if (!date) return true;
        return date < minDate;
    };

    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

    return (
        <div className={`bg-black/20 rounded-2xl p-3 border border-white/5 ${className}`}>
            {/* Header: Month & Navigation */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={previousMonth}
                    disabled={currentMonth <= minDate && currentMonth.getMonth() === minDate.getMonth()}
                    className="p-1 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                    <ChevronRight className="w-4 h-4 text-white" />
                </button>

                <h3 className="text-white font-bold text-sm">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    onClick={nextMonth}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                    <div key={day} className="text-center text-white/40 text-[10px] font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} />;

                    const disabled = isDisabled(date);
                    const today = isToday(date);
                    const selected = isSelected(date);

                    return (
                        <motion.button
                            key={index}
                            whileTap={!disabled ? { scale: 0.9 } : {}}
                            onClick={() => {
                                if (!disabled) {
                                    const newDate = new Date(date);
                                    newDate.setHours(selectedDate.getHours());
                                    newDate.setMinutes(selectedDate.getMinutes());
                                    onDateSelect(newDate);
                                }
                            }}
                            disabled={disabled}
                            className={`
                                relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium
                                transition-all duration-200 z-10
                                ${disabled ? 'text-white/20 cursor-not-allowed' : 'text-white cursor-pointer'}
                                ${today && !selected ? 'text-purple-400 font-bold' : ''}
                                ${selected ? 'text-white shadow-lg' : ''}
                                ${!selected && !disabled ? 'hover:bg-white/5' : ''}
                            `}
                        >
                            {/* Selected Background (Separate Layer) */}
                            {selected && (
                                <motion.div
                                    layoutId="selectedDay"
                                    className="absolute inset-0 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg -z-10"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}

                            {/* Today Indicator (Dot) */}
                            {today && !selected && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-500" />
                            )}

                            <span className="relative z-20">{date.getDate()}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};
