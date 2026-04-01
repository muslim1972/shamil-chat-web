import React from "react";

interface VideosGridProps {
    userIdFilter?: string;
}

export function VideosGrid({ userIdFilter }: VideosGridProps) { 
    return (
        <div className="p-4 text-center text-gray-500 italic">
            هذا القسم (الفيديوهات) غير متوفر في نسخة الدردشة - المستخدم: {userIdFilter}
        </div>
    ); 
}
