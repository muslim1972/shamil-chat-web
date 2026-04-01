import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Send, Clock, RotateCcw } from 'lucide-react';
import { ScheduleCalendar } from './ScheduleCalendar';
import { TimePicker } from './TimePicker';
import type { CreateScheduledMessageParams, ScheduledMessage } from '../../types/scheduledMessages.types';

interface ScheduleMessageSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (params: CreateScheduledMessageParams) => Promise<void>;
    messageContent: string;
    messageType: CreateScheduledMessageParams['message_type'];
    mediaUrl?: string | null;
    mediaThumbnail?: string | null;
    conversationId: string;
    recipientId: string;
    editingMessage?: ScheduledMessage | null;
    onUpdate?: (messageId: string, updates: Partial<CreateScheduledMessageParams>) => Promise<void>;
}

const getDefaultDate = () => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
};

export const ScheduleMessageSheet: React.FC<ScheduleMessageSheetProps> = ({
    isOpen,
    onClose,
    onSchedule,
    messageContent,
    messageType,
    mediaUrl,
    mediaThumbnail,
    conversationId,
    recipientId,
    editingMessage,
    onUpdate,
}) => {
    const [selectedDate, setSelectedDate] = useState(getDefaultDate);
    const [isScheduling, setIsScheduling] = useState(false);

    const isEditMode = !!editingMessage;

    useEffect(() => {
        if (isOpen) {
            if (editingMessage) {
                setSelectedDate(new Date(editingMessage.scheduled_for));
            } else {
                setSelectedDate(getDefaultDate());
            }
            setIsScheduling(false);
        }
    }, [isOpen, editingMessage]);

    const handleSchedule = async () => {
        if (selectedDate <= new Date()) {
            // تنبيه بسيط
            return;
        }

        setIsScheduling(true);
        try {
            if (isEditMode && onUpdate && editingMessage) {
                await onUpdate(editingMessage.id, {
                    scheduled_for: selectedDate,
                    media_url: mediaUrl || null,
                    media_thumbnail: mediaThumbnail || null,
                });
            } else {
                await onSchedule({
                    conversation_id: conversationId,
                    recipient_id: recipientId,
                    content: messageContent,
                    message_type: messageType,
                    scheduled_for: selectedDate,
                    media_url: mediaUrl || null,
                    media_thumbnail: mediaThumbnail || null,
                });
            }
            onClose();
        } catch (error) {
            console.error('Error scheduling message:', error);
            setIsScheduling(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pointer-events-none">
                {/* Backdrop with blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                />

                {/* Floating Card Design - Compact */}
                <motion.div
                    initial={{ y: 200, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 200, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="
                        relative w-full max-w-[20rem] mb-4 mx-4 
                        bg-[#1A1A2E]/95 backdrop-blur-xl 
                        rounded-[1.5rem] border border-white/10 shadow-2xl overflow-hidden
                        pointer-events-auto
                    "
                >
                    {/* Header Bar - Smaller */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                        <span className="text-white font-bold text-xs flex items-center gap-2">
                            {isEditMode ? <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> : <Calendar className="w-3.5 h-3.5 text-purple-400" />}
                            {isEditMode ? 'تعديل الموعد' : 'جدولة الرسالة'}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* Compact Calendar & Time Picker Layout */}
                        <div className="space-y-2">
                            {/* 1. Calendar (Compact) */}
                            <ScheduleCalendar
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                            />

                            {/* 2. Time Picker (Horizontal) */}
                            <TimePicker
                                selectedTime={selectedDate}
                                onTimeChange={setSelectedDate}
                            />
                        </div>

                        {/* Confirmation Button */}
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSchedule}
                            disabled={isScheduling}
                            className={`
                                w-full py-3.5 rounded-xl flex items-center justify-center gap-2
                                font-bold text-white shadow-lg shadow-purple-900/20
                                transition-all
                                ${isEditMode
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-orange-900/30'
                                    : 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-purple-900/30'}
                                ${isScheduling ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {isScheduling ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isEditMode ? 'حفظ التغييرات' : 'جدولة الإرسال'}
                                    <Send className={`w-4 h-4 ${isScheduling ? 'hidden' : ''} rtl:rotate-180`} />
                                </>
                            )}
                        </motion.button>

                        {/* Summary Text (Minimal) */}
                        <div className="text-center">
                            <p className="text-[10px] text-white/40">
                                سيتم الإرسال في: <span className="text-purple-400 font-medium">{selectedDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
