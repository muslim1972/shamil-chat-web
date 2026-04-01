
import { supabase } from './supabase';

/**
 * NewsService
 * خدمة لجلب الأخبار من مصادر RSS مختلفة
 */

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    guid: string;
    description?: string;
    thumbnail?: string;
}

const RSS_FEEDS = [
    { name: 'BBC Arabic', url: 'https://feeds.bbci.co.uk/arabic/rss.xml', category: 'world' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f77d/73d0e1b4-532f-45ef-b135-bf70c53d4ce3', category: 'world' },
    { name: 'Sky News', url: 'https://www.skynewsarabia.com/web/rss', category: 'world' },
    { name: 'CNN Arabic', url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', category: 'world' }
];

export const NewsService = {
    /**
     * جلب الأخبار من جميع المصادر
     */
    async fetchAllNews(): Promise<NewsItem[]> {
        console.log('🚀 NewsService.fetchAllNews CALLED with feeds:', RSS_FEEDS);
        if (!RSS_FEEDS || RSS_FEEDS.length === 0) {
            console.error('❌ RSS_FEEDS is empty!');
            return [];
        }
        const promises = RSS_FEEDS.map(feed => this.fetchFeed(feed));
        const results = await Promise.allSettled(promises);

        let allNews: NewsItem[] = [];

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                allNews = [...allNews, ...result.value];
            }
        });

        // ترتيب حسب التاريخ (الأحدث أولاً)
        return allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    },

    /**
     * جلب مصدر واحد باستخدام Supabase Edge Function (Proxy)
     */
    async fetchFeed(feed: { name: string, url: string }): Promise<NewsItem[]> {
        try {
            // استخدام Edge Function المخصصة لجلب XML
            const { data, error } = await supabase.functions.invoke('fetch-rss', {
                body: { url: feed.url }
            });

            if (error) throw error;

            // التحقق من وجود خطأ تم إرجاعه من الدالة (Status 200)
            if (data && data.error) {
                console.warn(`Proxy Warning for ${feed.name}:`, data.error);
                throw new Error(`Proxy Error: ${data.error}`);
            }

            if (!data || !data.xml) throw new Error('No XML returned');

            // تحليل XML في المتصفح
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.xml, "text/xml");

            const items = Array.from(xmlDoc.querySelectorAll("item"));

            return items.map(item => ({
                title: item.querySelector("title")?.textContent || '',
                link: item.querySelector("link")?.textContent || '',
                pubDate: item.querySelector("pubDate")?.textContent || '',
                source: feed.name,
                guid: item.querySelector("guid")?.textContent || item.querySelector("link")?.textContent || '',
                description: item.querySelector("description")?.textContent || '',
                thumbnail: this.extractThumbnail(item)
            }));

        } catch (error: any) {
            // تفاصيل الخطأ من الـ Edge Function تأتي عادة في error.context أو جسم الاستجابة
            console.error(`❌ Error fetching feed ${feed.name}:`, error);
            if (error.message) console.error('Error Message:', error.message);
            return [];
        }
    },

    extractThumbnail(item: Element): string | undefined {
        // 1. محاولة استخراج الصورة من media:content
        const mediaContent = item.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "content")[0];
        if (mediaContent && mediaContent.getAttribute("url")) {
            return mediaContent.getAttribute("url")!;
        }

        // 2. محاولة استخراج من enclosure
        const enclosure = item.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("type")?.startsWith("image")) {
            return enclosure.getAttribute("url")!;
        }

        // 3. تحليل الوصف للبحث عن صور (مع تجاهل بيكسلات التتبع)
        const description = item.querySelector("description")?.textContent || "";

        // البحث عن جميع وسوم الصور
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;

        while ((match = imgRegex.exec(description)) !== null) {
            const url = match[1];
            // تصفية روابط التتبع والإعلانات المعروفة
            if (this.isValidImageUrl(url)) {
                return url;
            }
        }

        return undefined;
    },

    isValidImageUrl(url: string): boolean {
        const lowerUrl = url.toLowerCase();
        // قائمة الكلمات المحظورة (بيكسلات تتبع، سكربتات، إعلانات)
        const blockedTerms = [
            'pixel', 'tracker', 'analytics', 'sync.sparteo', 'doubleclick',
            'adserver', 'imp', 'beacon', '1x1', 'shim', 'fk-images'
        ];

        if (blockedTerms.some(term => lowerUrl.includes(term))) {
            return false;
        }

        return true;
    }
};
