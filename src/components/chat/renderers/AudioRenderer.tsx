import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { InlineAudioPlayer } from '../../media/InlineAudioPlayer';
import type { Message } from '../../../types';

interface AudioRendererProps {
    message: Message;
    localUrl: string | null;
    isOwnMessage: boolean;
}

/**
 * مكون عرض الصوت في الدردشة
 * يعرض مشغل صوت تفاعلي مدمج
 */
export const AudioRenderer: React.FC<AudioRendererProps> = memo(({
    message,
    localUrl,
    isOwnMessage,
}) => {
    // حالة التحميل
    if (!localUrl) {
        return (
            <div className="w-full flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تجهيز الصوت...</span>
            </div>
        );
    }

    const caption = (message as any).media_metadata?.caption;

    return (
        <div className="w-full" style={{ maxWidth: '75%', minWidth: '280px' }}>
            {/* مشغل الصوت المدمج */}
            <InlineAudioPlayer
                audioUrl={localUrl}
                isOwnMessage={isOwnMessage}
                variant="chat"
            />

            {/* Caption */}
            {caption && (
                <div className={`mt-2 text-sm ${isOwnMessage ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                    {caption}
                </div>
            )}
        </div>
    );
});

AudioRenderer.displayName = 'AudioRenderer';

AudioRenderer.displayName = 'AudioRenderer';


