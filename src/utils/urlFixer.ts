import { supabaseUrl } from '../services/supabase';

/**
 * Fixes Supabase storage URLs that might have incorrect or old project IDs.
 * This is useful when the project ID changes but the database still contains old URLs.
 */
export const fixImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url || typeof url !== 'string') return undefined;

    // List of known old project IDs to replace
    const oldProjectIds = ['cblyqhyuljflchzgnhzb'];

    // Extract current project ID from the configured URL
    // Format: https://[project-id].supabase.co
    let currentProjectId = '';
    try {
        const urlObj = new URL(supabaseUrl);
        currentProjectId = urlObj.hostname.split('.')[0];
    } catch (e) {
        // Fallback if URL parsing fails (unlikely)
        currentProjectId = 'vrsuvebfqubzejpmoqqe';
    }

    let fixedUrl = url;

    oldProjectIds.forEach(oldId => {
        if (fixedUrl.includes(`${oldId}.supabase.co`)) {
            fixedUrl = fixedUrl.replace(`${oldId}.supabase.co`, `${currentProjectId}.supabase.co`);
        }
    });

    return fixedUrl;
};
