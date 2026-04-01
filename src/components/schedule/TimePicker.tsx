import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
    selectedTime: Date;
    onTimeChange: (date: Date) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ selectedTime, onTimeChange }) => {
    const currentHour12 = selectedTime.getHours() % 12 || 12;
    const currentMinute = selectedTime.getMinutes();
    const isPM = selectedTime.getHours() >= 12;

    const updateHour = (delta: number) => {
        const newDate = new Date(selectedTime);
        let h = newDate.getHours();

        // Convert to 12-hour, apply delta, convert back
        let h12 = h % 12 || 12;
        h12 = h12 + delta;

        // Wrap around 1-12
        if (h12 > 12) h12 = 1;
        if (h12 < 1) h12 = 12;

        // Convert back to 24-hour
        const wasPM = h >= 12;
        if (wasPM) {
            h = (h12 === 12) ? 12 : h12 + 12;
        } else {
            h = (h12 === 12) ? 0 : h12;
        }

        newDate.setHours(h);
        onTimeChange(newDate);
    };

    const updateMinute = (delta: number) => {
        const newDate = new Date(selectedTime);
        let m = newDate.getMinutes() + delta;

        // Wrap around 0-59
        if (m > 59) m = 0;
        if (m < 0) m = 59;

        newDate.setMinutes(m);
        onTimeChange(newDate);
    };

    const togglePeriod = () => {
        const newDate = new Date(selectedTime);
        const h = newDate.getHours();

        if (h >= 12) {
            newDate.setHours(h - 12);
        } else {
            newDate.setHours(h + 12);
        }

        onTimeChange(newDate);
    };

    const PickerColumn = ({ value, onUp, onDown, label }: { value: string; onUp: () => void; onDown: () => void; label?: string }) => (
        <div className="flex flex-col items-center gap-1">
            <button
                onClick={onUp}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors active:scale-90"
            >
                <ChevronUp className="w-4 h-4" />
            </button>

            <div className="h-10 w-14 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                <span className="text-white text-xl font-bold">{value}</span>
            </div>

            <button
                onClick={onDown}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors active:scale-90"
            >
                <ChevronDown className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-center gap-2">
                {/* Hours */}
                <PickerColumn
                    value={currentHour12.toString().padStart(2, '0')}
                    onUp={() => updateHour(1)}
                    onDown={() => updateHour(-1)}
                />

                <span className="text-white/30 text-xl font-bold pt-1">:</span>

                {/* Minutes */}
                <PickerColumn
                    value={currentMinute.toString().padStart(2, '0')}
                    onUp={() => updateMinute(1)}
                    onDown={() => updateMinute(-1)}
                />

                {/* Period Toggle */}
                <button
                    onClick={togglePeriod}
                    className="h-10 px-3 flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition-colors"
                >
                    <span className="text-white text-sm font-bold">{isPM ? 'PM' : 'AM'}</span>
                </button>
            </div>
        </div>
    );
};
