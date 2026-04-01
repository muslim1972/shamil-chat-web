import React from 'react';
import { useShamliRelationship } from '../../hooks/useShamliRelationship';
import { ShamliBadge } from './ShamliBadge';
import { Star } from 'lucide-react';

interface ShamliRelationshipIndicatorProps {
    userId: string;
    compact?: boolean;
    showStars?: boolean;
    showLabel?: boolean;
    className?: string;
}

/**
 * مؤشر العلاقة في Shamli
 * يعرض الفئة والنجوم بشكل ديناميكي
 */
export const ShamliRelationshipIndicator: React.FC<ShamliRelationshipIndicatorProps> = ({
    userId,
    compact = false,
    showStars = true,
    showLabel = false,
    className = '',
}) => {
    const { relationship, category, loading } = useShamliRelationship(userId);

    if (loading) {
        return (
            <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-16 ${className}`} />
        );
    }

    // لا نعرض شيء للبعيدين
    if (category === 'distant' || !relationship) {
        return null;
    }

    if (compact) {
        return (
            <ShamliBadge
                category={category}
                size="xs"
                showIcon={true}
                showLabel={false}
                className={className}
            />
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <ShamliBadge
                category={category}
                size="sm"
                showIcon={true}
                showLabel={showLabel}
            />

            {showStars && relationship && relationship.star_level > 0 && (
                <div className="flex items-center gap-0.5">
                    {Array.from({ length: relationship.star_level }).map((_, i) => (
                        <Star
                            key={i}
                            size={12}
                            className="fill-yellow-400 text-yellow-400"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
