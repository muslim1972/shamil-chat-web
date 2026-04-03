import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProfileScreen } from '../ProfileScreen';

/**
 * UnifiedProfile (Chat Version)
 * شاشة الملف الشخصي لنسخة الدردشة فقط، تم تجريدها من ميزات التواصل الاجتماعي الأخرى.
 */
const UnifiedProfile: React.FC = () => {
    const { user } = useAuth();
    const { userId } = useParams<{ userId: string }>();

    const targetUserId = userId || user?.id; // Effective user ID

    return (
        <div className="h-full bg-gray-50 dark:bg-gray-900">
            {/* عرض شاشة الملف الشخصي الأساسية بدون تبويبات إضافية */}
            <ProfileScreen userIdOverride={targetUserId} backTo="/conversations">
                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                    <p className="text-sm italic">نهاية الملف الشخصي (نسخة الدردشة)</p>
                </div>
            </ProfileScreen>
        </div>
    );
};

export default UnifiedProfile;

