import React from 'react';
import { getShamliColor } from '../../constants/shamliColors';
import type { ShamliCategory } from '../../types/shamli';

interface ShamliAvatarProps {
    avatarUrl: string | null | undefined;
    username: string;
    category?: ShamliCategory;
    size?: number;
    showRing?: boolean;
    className?: string;
    onClick?: () => void;
}

/**
 * Avatar مع حلقة ملونة حسب فئة Shamli
 * يدعم جميع الفئات مع تأثيرات بصرية مميزة
 */
export const ShamliAvatar: React.FC<ShamliAvatarProps> = ({
    avatarUrl,
    username,
    category,
    size = 48,
    showRing = true,
    className = '',
    onClick,
}) => {
    const colors = category && showRing ? getShamliColor(category) : null;
    const ringSize = 3; // سمك الحلقة

    return (
        <div
            className={`relative flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{ width: size, height: size }}
            onClick={onClick}
        >
            {/* Ring خارجي متوهج */}
            {colors && showRing && (
                <div
                    className="absolute inset-0 rounded-full animate-pulse-slow"
                    style={{
                        background: colors.gradient,
                        padding: `${ringSize}px`,
                    }}
                >
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900" />
                </div>
            )}

            {/* الصورة الشخصية */}
            <div
                className="relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                style={{
                    width: colors && showRing ? size - (ringSize * 2) : size,
                    height: colors && showRing ? size - (ringSize * 2) : size,
                }}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback to initials on error
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : null}

                {/* Fallback: أول حرف من الاسم */}
                {!avatarUrl && (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold"
                        style={{ fontSize: size * 0.4 }}>
                        {username?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>
        </div>
    );
};
