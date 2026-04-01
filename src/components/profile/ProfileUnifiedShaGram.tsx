import React from 'react';
import { useParams } from 'react-router-dom';
import { ProfileScreen } from '../ProfileScreen';
import PostsGrid from '../../shagram/components/PostsGrid';
import { useAuth } from '../../context/AuthContext';

// هذا المغلّف يعيد استخدام ProfileScreen كما هو
// ويضيف شبكة منشورات ShaGram أسفلها فقط عند استخدامه في مسار /shagram/profile
const ProfileUnifiedShaGram: React.FC = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <ProfileScreen userIdOverride={userId || user?.id} backTo="/shagram">
        <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-4 px-1">
          <PostsGrid userIdFilter={userId || user?.id} />
        </div>
      </ProfileScreen>
    </div>
  );
};

export default ProfileUnifiedShaGram;
