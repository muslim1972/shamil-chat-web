/**
 * نظام الألوان والأيقونات الموحد لـ Shamli Ecosystem
 * يُستخدم في جميع التطبيقات لضمان اتساق التجربة البصرية
 * 
 * الفئات الأربعة:
 * 1. الثابتون (pinned) - ذهبي 🌟
 * 2. الخلّان (khillan) - بنفسجي 💜  
 * 3. دائرة الضوء (spotlight) - فضي ✨
 * 4. البعيدون (distant) - رمادي 🌫️
 */

import type { ShamliCategory } from '../types/shamli';

export const SHAMLI_COLORS = {
    pinned: {
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        solid: '#FFD700',
        shadow: 'rgba(255, 215, 0, 0.5)',
        border: '#FFA500',
        text: '#FFF',
        glow: 'rgba(255, 215, 0, 0.8)',
    },
    khillan: {
        gradient: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)',
        solid: '#9333EA',
        shadow: 'rgba(147, 51, 234, 0.5)',
        border: '#7C3AED',
        text: '#FFF',
        glow: 'rgba(147, 51, 234, 0.7)',
    },
    spotlight: {
        gradient: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)',
        solid: '#CBD5E1',
        shadow: 'rgba(203, 213, 225, 0.5)',
        border: '#94A3B8',
        text: '#1F2937',
        glow: 'rgba(203, 213, 225, 0.6)',
    },
    distant: {
        gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
        solid: '#6B7280',
        shadow: 'rgba(107, 114, 128, 0.4)',
        border: '#4B5563',
        text: '#D1D5DB',
        glow: 'rgba(107, 114, 128, 0.5)',
    },
} as const;

export const SHAMLI_ICONS = {
    pinned: '🌟',
    khillan: '💜',
    spotlight: '✨',
    distant: '🌫️',
} as const;

export const SHAMLI_LABELS = {
    pinned: 'ثابت',
    khillan: 'خليل',
    spotlight: 'في دائرة الضوء',
    distant: 'بعيد',
} as const;

/**
 * Helper function للحصول على نظام ألوان الفئة
 */
export const getShamliColor = (category: ShamliCategory) => {
    return SHAMLI_COLORS[category];
};

/**
 * Helper function للحصول على أيقونة الفئة
 */
export const getShamliIcon = (category: ShamliCategory) => {
    return SHAMLI_ICONS[category];
};

/**
 * Helper function للحصول على تسمية الفئة
 */
export const getShamliLabel = (category: ShamliCategory) => {
    return SHAMLI_LABELS[category];
};
