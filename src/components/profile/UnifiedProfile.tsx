import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProfileScreen } from '../ProfileScreen';
import PostsGrid from '../../shagram/components/PostsGrid';
import { ArticlesCompactGrid } from '../../features/articles/components/ArticlesCompactGrid';
import { VideosGrid } from '../../shamatube/components/VideosGrid';
import { LayoutGrid, BookOpen, Film } from 'lucide-react';
import { useArticles } from '../../shagram/features/articles/hooks/useArticles'; // Assuming this hook exists and can filter by user

type TabType = 'posts' | 'articles' | 'videos';

const UnifiedProfile: React.FC = () => {
    const { user } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();

    const targetUserId = userId || user?.id; // Effective user ID

    // Default tab logic
    const initialTab = (searchParams.get('tab') as TabType) || 'posts';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Update URL when tab changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', activeTab);
        setSearchParams(params, { replace: true });
    }, [activeTab, setSearchParams]);

    // Update active tab if URL changes (e.g. back button)
    useEffect(() => {
        const tab = searchParams.get('tab') as TabType;
        if (tab && ['posts', 'articles', 'videos'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Fetch articles only when Articles tab is active (Optimization)
    // We can use the existing ArticlesGrid, but it usually takes 'articles' list as prop.
    // Let's check how ArticlesProfile did it. It used `useArticles`.
    // We will implement a wrapper for ArticlesGrid here or inside `ArticlesGrid` to fetch by user.
    // Actually, `ArticlesProfile.tsx` fetches logic: 
    /*
        const { articles, loading, fetchLatestArticles } = useArticles();
        useEffect(() => { if (effectiveUserId) fetchLatestArticles(effectiveUserId); }, [effectiveUserId]);
    */
    // We should replicate this for the articles tab.

    return (
        <div className="h-full bg-gray-50 dark:bg-gray-900">
            <ProfileScreen userIdOverride={targetUserId} backTo="/shagram">
                <div className="mt-4 border-t border-gray-200 dark:border-gray-800">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'posts'
                                ? 'text-indigo-600 dark:text-cyan-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <LayoutGrid size={18} />
                            <span>منشورات</span>
                            {activeTab === 'posts' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-cyan-400 rounded-t-full" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('videos')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'videos'
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Film size={18} />
                            <span>فيديوهات</span>
                            {activeTab === 'videos' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('articles')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'articles'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <BookOpen size={18} />
                            <span>مقالات</span>
                            {activeTab === 'articles' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-t-full" />
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'posts' && (
                            <div className="animate-fade-in px-1">
                                <PostsGrid userIdFilter={targetUserId} />
                            </div>
                        )}

                        {activeTab === 'videos' && (
                            <div className="animate-fade-in px-1">
                                <VideosGrid userIdFilter={targetUserId} />
                            </div>
                        )}

                        {activeTab === 'articles' && (
                            <div className="animate-fade-in p-2">
                                <ArticlesTabContent userId={targetUserId} />
                            </div>
                        )}
                    </div>
                </div>
            </ProfileScreen>
        </div>
    );
};

// Helper component to handle fetching articles logic isolation
const ArticlesTabContent: React.FC<{ userId?: string }> = ({ userId }) => {
    const { articles, loading, fetchLatestArticles } = useArticles();

    useEffect(() => {
        if (userId) {
            fetchLatestArticles(userId);
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                لا توجد مقالات لهذا المستخدم
            </div>
        );
    }

    // inside ArticlesTabContent
    return <ArticlesCompactGrid articles={articles} />;
}

export default UnifiedProfile;
