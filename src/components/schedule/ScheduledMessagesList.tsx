import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Edit2, Trash2, Calendar } from 'lucide-react';
import type { ScheduledMessage } from '../../types/scheduledMessages.types';

interface ScheduledMessagesListProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ScheduledMessage[];
    onEdit: (message: ScheduledMessage) => void;
    onDelete: (messageId: string) => void;
    isLoading?: boolean;
}

export const ScheduledMessagesList: React.FC<ScheduledMessagesListProps> = ({
    isOpen,
    onClose,
    messages,
    onEdit,
    onDelete,
    isLoading = false,
}) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'from-yellow-500 to-orange-500';
            case 'sent':
                return 'from-green-500 to-emerald-500';
            case 'failed':
                return 'from-red-500 to-rose-500';
            case 'cancelled':
                return 'from-gray-500 to-slate-500';
            default:
                return 'from-purple-500 to-blue-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'قيد الانتظار';
            case 'sent':
                return 'تم الإرسال';
            case 'failed':
                return 'فشل';
            case 'cancelled':
                return 'ملغاة';
            default:
                return status;
        }
    };

    // فلترة الرسائل المعلقة فقط
    const pendingMessages = messages.filter(m => m.status === 'pending');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#1a0b2e] border border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">الرسائل المجدولة</h2>
                                    <p className="text-white/50 text-xs">
                                        {pendingMessages.length} رسالة في الانتظار
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6 text-white/70" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4 space-y-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : pendingMessages.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calendar className="w-16 h-16 mx-auto text-white/20 mb-4" />
                                    <p className="text-white/50 text-lg">لا توجد رسائل مجدولة</p>
                                    <p className="text-white/30 text-sm mt-2">
                                        اضغط على أيقونة الساعة بجانب زر الإرسال لجدولة رسالة
                                    </p>
                                </div>
                            ) : (
                                pendingMessages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        {/* Status Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getStatusColor(message.status)} text-white`}>
                                                {getStatusText(message.status)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onEdit(message)}
                                                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-blue-400 hover:text-blue-300"
                                                    title="تعديل"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(message.id)}
                                                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Message Content */}
                                        <div className="bg-black/20 rounded-lg p-3 mb-3">
                                            <p className="text-white text-sm line-clamp-3">
                                                {message.content || (message.media_url ? '📎 وسائط' : 'رسالة فارغة')}
                                            </p>
                                            {message.media_url && (
                                                <div className="mt-2 flex items-center gap-2 text-white/50 text-xs">
                                                    <span>📎</span>
                                                    <span>يحتوي على وسائط</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Schedule Time */}
                                        <div className="flex items-center gap-3 text-white/70 text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(message.scheduled_for)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>{formatTime(message.scheduled_for)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
