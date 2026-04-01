import { useState, useCallback } from 'react';

export function useArticles() { 
    const [articles] = useState<any[]>([]);
    const [loading] = useState(false);
    const [error] = useState<any>(null);
    const [isError] = useState(false);

    const fetchLatestArticles = useCallback(async (userId: string) => {
        console.log('Mock fetch articles for user:', userId);
    }, []);

    return { 
        articles, 
        loading, 
        isLoading: loading, // for compatibility
        error, 
        isError,
        fetchLatestArticles 
    }; 
}
