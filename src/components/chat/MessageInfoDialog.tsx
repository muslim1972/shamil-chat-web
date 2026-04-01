import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '@/services/supabase';
import type { Message } from '@/types';

interface MessageInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  conversationId: string;
}

interface ReadStatus {
  user_id: string;
  username: string;
  avatar_url?: string;
  read_at?: string;
  is_read: boolean;
}

export const MessageInfoDialog: React.FC<MessageInfoDialogProps> = ({
  isOpen,
  onClose,
  message,
  conversationId
}) => {
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroup, setIsGroup] = useState(false);

useEffect(() => {
    if (!isOpen) return;

    const fetchInfo = async () => {
      setLoading(true);

      // التحقق من نوع المحادثة
      const { data: convData } = await supabase
        .from('conversations')
        .select('is_group')
        .eq('id', conversationId)
        .single();

      setIsGroup(convData?.is_group || false);

      // جلب حالات القراءة مع تأخير بسيط للتأكد من تحديث البيانات
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data, error } = await supabase.rpc('get_message_read_status', {
        p_message_id: message.id,
        p_conversation_id: conversationId
      });

      if (!error && data) {
        setReadStatuses(data);
      }

      setLoading(false);
    };

    fetchInfo();
  }, [isOpen, message.id, conversationId]);
  if (!isOpen) return null;

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            معلومات الرسالة
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* معلومات الرسالة */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  تفاصيل الرسالة
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">المرسل: </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {(message as any).sender?.username || 'غير معروف'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">تاريخ الإرسال: </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDateTime(message.timestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">النوع: </span>
                    <span className="text-gray-900 dark:text-white">
                      {message.message_type === 'text' ? 'نصية' : 
                       message.message_type === 'image' ? 'صورة' :
                       message.message_type === 'video' ? 'فيديو' :
                       message.message_type === 'audio' ? 'صوتية' : 'ملف'}
                    </span>
                  </div>
                </div>
              </div>

              {/* حالة القراءة */}
              {isGroup ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    حالة القراءة ({readStatuses.filter(s => s.is_read).length} من {readStatuses.length})
                  </h4>
                  <div className="space-y-2">
                    {readStatuses.map((status) => (
                      <div
                        key={status.user_id}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          {status.avatar_url ? (
                            <img
                              src={status.avatar_url}
                              alt={status.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                              {status.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {status.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.is_read ? (
                            <>
                              <span className="text-xs text-orange-500">
                                {status.read_at ? formatDateTime(status.read_at) : 'مقروءة'}
                              </span>
                              <Check size={16} className="text-orange-500" />
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">غير مقروءة</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    الحالة
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    {readStatuses.length > 0 && readStatuses[0].is_read ? (
                      <div className="flex items-center gap-2 text-orange-500">
                        <Check size={16} />
                        <span className="text-sm">
                          مقروءة في {formatDateTime(readStatuses[0].read_at!)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        تم التسليم - لم تُقرأ بعد
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};