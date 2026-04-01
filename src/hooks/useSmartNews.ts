import { useState, useEffect } from 'react';
import { NewsService, type NewsItem } from '../services/newsService';
import { supabase } from '../services/supabase';

interface SmartNewsState {
    news: NewsItem[];
    smartSummary: string | null;
    loading: boolean;
    aiLoading: boolean;
    error: string | null;
}

export function useSmartNews() {
    const [state, setState] = useState<SmartNewsState>({
        news: [],
        smartSummary: null,
        loading: true,
        aiLoading: false,
        error: null
    });


    useEffect(() => {
        let mounted = true;

        const fetchAndProcess = async () => {
            try {
                setState(prev => ({ ...prev, loading: true }));

                // 1. Fetch Real News
                const newsItems = await NewsService.fetchAllNews();

                if (!mounted) return;

                setState(prev => ({
                    ...prev,
                    news: newsItems,
                    loading: false,
                    aiLoading: true
                }));

                // 2. Process with AI (Groq)
                if (newsItems.length > 0) {
                    // Take top 5 headlines for summary
                    const headlines = newsItems.slice(0, 5).map(n => `- ${n.title} (${n.source})`).join('\n');

                    const prompt = `
            إليك آخر عناوين الأخبار التقنية والعالمية:
            ${headlines}

            قم بتلخيص هذه الأخبار في "زبدة الخبر" (Briefing) بأسلوب شيق وجذاب وتفاعلي في 3-4 نقاط قصيرة جداً مع إيموجي.
            اجعلها تبدو كأنها "ملخص الساعة" للمستخدم.
            لا تذكر تفاصيل مملة، فقط العناوين المثيرة.
          `.trim();

                    const { data, error } = await supabase.functions.invoke('ai-groq', {
                        body: {
                            messages: [
                                { role: 'user', parts: [{ text: prompt }] }
                            ]
                        }
                    });

                    if (!mounted) return;

                    if (data && data.text) {
                        setState(prev => ({
                            ...prev,
                            smartSummary: data.text,
                            aiLoading: false
                        }));
                    } else {
                        console.error('AI Summary failed:', error);
                        setState(prev => ({ ...prev, aiLoading: false }));
                    }
                } else {
                    setState(prev => ({ ...prev, aiLoading: false }));
                }

            } catch (err) {
                console.error('News Error:', err);
                if (mounted) setState(prev => ({ ...prev, error: 'فشل جلب الأخبار', loading: false }));
            }
        };

        fetchAndProcess();

        return () => { mounted = false; };
    }, []);

    return state;
}
