import React from "react";

interface ArticlesCompactGridProps {
    articles?: any[];
}

export function ArticlesCompactGrid({ articles }: ArticlesCompactGridProps) { 
    return (
        <div className="p-4 text-center text-gray-500 italic">
            تم تحميل {articles?.length || 0} مقالة (هذا المكون مقلد حالياً)
        </div>
    ); 
}
