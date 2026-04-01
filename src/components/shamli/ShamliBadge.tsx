import React from 'react';
import { getShamliColor, getShamliIcon, getShamliLabel } from '../../constants/shamliColors';
import type { ShamliCategory } from '../../types/shamli';

interface ShamliBadgeProps {
    category: ShamliCategory;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showLabel?: boolean;
    className?: string;
}

const SIZE_CLASSES = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
};

/**
 * Badge موحد لعرض فئة Shamli
 * يدعم جميع الفئات الأربعة مع ألوان وأيقونات مميزة
 */
export const ShamliBadge: React.FC<ShamliBadgeProps> = ({
    category,
    size = 'sm',
    showIcon = true,
    showLabel = false,
    className = '',
}) => {
    const colors = getShamliColor(category);
    const icon = getShamliIcon(category);
    const label = getShamliLabel(category);

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${SIZE_CLASSES[size]} ${className}`}
            style={{
                background: colors.gradient,
                color: colors.text,
                boxShadow: `0 2px 8px ${colors.shadow}`,
            }}
        >
            {showIcon && <span>{icon}</span>}
            {showLabel && <span>{label}</span>}
        </div>
    );
};
