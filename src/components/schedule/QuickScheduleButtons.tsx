import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Sun, Moon, Calendar } from 'lucide-react';
import type { QuickScheduleOption } from '../../types/scheduledMessages.types';

interface QuickScheduleButtonsProps {
    onSelect: (date: Date) => void;
    className?: string;
}

export const QuickScheduleButtons: React.FC<QuickScheduleButtonsProps> = ({
    onSelect,
    className = '',
}) => {
    const quickOptions: QuickScheduleOption[] = [
        {
            id: 'in-1-hour',
            label: 'بعد ساعة',
            icon: '⏰',
            getDateTime: () => {
                const date = new Date();
                date.setHours(date.getHours() + 1);
                date.setMinutes(0);
                date.setSeconds(0);
                return date;
            },
        },
        {
            id: 'tonight-9pm',
            label: 'الليلة 9 PM',
            icon: '🌙',
            getDateTime: () => {
                const date = new Date();
                date.setHours(21, 0, 0, 0);
                // إذا كان الوقت بعد 9 مساءً، نجدول لليوم التالي
                if (new Date() > date) {
                    date.setDate(date.getDate() + 1);
                }
                return date;
            },
        },
        {
            id: 'tomorrow-morning',
            label: 'غداً صباحاً',
            icon: '☀️',
            getDateTime: () => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                date.setHours(8, 0, 0, 0);
                return date;
            },
        },
        {
            id: 'weekend',
            label: 'نهاية الأسبوع',
            icon: '📅',
            getDateTime: () => {
                const date = new Date();
                const day = date.getDay();
                // الجمعة = 5، السبت = 6
                const daysUntilFriday = (5 - day + 7) % 7 || 7;
                date.setDate(date.getDate() + daysUntilFriday);
                date.setHours(9, 0, 0, 0);
                return date;
            },
        },
    ];

    return (
        <div className={className}>
            <h4 className="text-white/70 text-sm font-medium mb-3">⚡ اختصارات سريعة</h4>

            <div className="grid grid-cols-2 gap-2">
                {quickOptions.map((option) => (
                    <motion.button
                        key={option.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(option.getDateTime())}
                        className="
              flex items-center gap-2 p-3 rounded-xl
              bg-gradient-to-br from-white/5 to-white/0
              border border-white/10
              hover:from-purple-600/20 hover:to-blue-600/20
              hover:border-purple-500/50
              transition-all duration-200
              group
            "
                    >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                            {option.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
