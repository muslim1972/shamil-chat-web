import React, { memo } from 'react';
import { MiniMessageBubble } from './MiniMessageBubble';
import type { Message } from '../../types';
import type { User } from '@supabase/supabase-js';

interface ForwardedRendererProps {
    message: Message;
    user: User | null;
    isOwnMessage: boolean;
}

/**
 * مكون عرض الرسائل المحولة
 * يعرض الرسائل الأصلية داخل حاوية
 */
export const ForwardedRenderer: React.FC<ForwardedRendererProps> = memo(({
    message,
    user,
    isOwnMessage,
}) => {
    try {
        const raw = (message as any).text || (message as any).content || '';
        const forwardedMessages: Message[] = JSON.parse(raw);
        const sortedMessages = [...forwardedMessages].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return (
            <div
                className="border-2 border-gray-300 bg-gray-50 rounded-lg p-3"
                style={{ width: '100%', maxWidth: '100%' }}
            >
                <p className="font-bold text-xs text-gray-600 mb-2">رسائل محولة</p>
                <div className="flex flex-col space-y-2">
                    {sortedMessages.map((msg) => {
                        const preservedIsOwn = (msg as any).isOwn;
                        const innerSender = (msg as any).senderId || (msg as any).sender_id || null;
                        const isOwnInner =
                            typeof preservedIsOwn === 'boolean'
                                ? preservedIsOwn
                                : innerSender && user && innerSender === user.id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex w-full ${isOwnInner ? 'justify-end' : 'justify-start'}`}
                            >
                                <MiniMessageBubble
                                    message={{ ...msg, senderId: innerSender }}
                                    isOwnMessage={isOwnInner}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    } catch (error) {
        console.error('Failed to parse forwarded messages:', error);
        return <p className="text-red-500">خطأ في عرض الرسائل المحولة.</p>;
    }
});

ForwardedRenderer.displayName = 'ForwardedRenderer';
