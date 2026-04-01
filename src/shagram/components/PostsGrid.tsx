import React from "react";

interface PostsGridProps {
    userIdFilter?: string;
}

const PostsGrid: React.FC<PostsGridProps> = ({ userIdFilter }) => {
    return (
        <div className="p-4 text-center text-gray-500 italic">
            هذا القسم (المنشورات) غير متوفر في نسخة الدردشة - المستخدم: {userIdFilter}
        </div>
    );
};

export default PostsGrid;
