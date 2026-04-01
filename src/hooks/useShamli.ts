import { useState, useCallback } from 'react';
import { shamliService } from '../services/shamli';
import type { ShamliConnection } from '../types/shamli';
import { useAuth } from '../context/AuthContext';

export const useShamli = () => {
    const { user } = useAuth();
    const [connections, setConnections] = useState<ShamliConnection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePin = useCallback(async (connectionId: string, currentStatus: boolean) => {
        try {
            const updated = await shamliService.togglePin(connectionId, currentStatus);
            setConnections(prev => prev.map(c =>
                c.id === connectionId
                    ? { ...updated, connected_user: c.connected_user } // ✅ Preserve connected_user
                    : c
            ));
            return updated;
        } catch (err: any) {
            throw err;
        }
    }, []);

    const toggleKhillan = useCallback(async (connectionId: string, currentStatus: boolean) => {
        try {
            const updated = await shamliService.toggleKhillan(connectionId, currentStatus);
            setConnections(prev => prev.map(c =>
                c.id === connectionId
                    ? { ...updated, connected_user: c.connected_user } // ✅ Preserve connected_user
                    : c
            ));
            return updated;
        } catch (err: any) {
            throw err;
        }
    }, []);

    const [suggestions, setSuggestions] = useState<(ShamliConnection & { reason: string })[]>([]);

    const [currentUserProfile, setCurrentUserProfile] = useState<{
        avatar_url?: string;
        display_name?: string;
        username?: string;
    } | null>(null);

    const stats = {
        star_level: connections.length > 0
            ? Math.max(...connections.map(c => c.star_level))
            : 1,
        total_connections: connections.length,
        khillan_count: connections.filter(c => c.star_level >= 4).length
    };

    const runRadar = useCallback(async () => {
        setLoading(true);
        try {
            const results = await shamliService.getDailySuggestions();
            setSuggestions(results);
        } catch (err) {
            console.error('Radar error', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConnections = useCallback(async (options?: {
        pinnedOnly?: boolean,
        khillanOnly?: boolean,
        minStars?: number,
        limit?: number
    }) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [data, profile] = await Promise.all([
                shamliService.getConnections(options),
                shamliService.getCurrentUserProfile()
            ]);
            setConnections(data);
            if (profile) setCurrentUserProfile(profile);
        } catch (err: any) {
            console.error('Error fetching shamli connections:', err);
            setError(err.message || 'فشل في جلب الاتصالات');
        } finally {
            setLoading(false);
        }
    }, [user]);

    return {
        connections,
        loading,
        error,
        currentUserProfile,
        stats, // إرجاع الإحصائيات
        suggestions,
        runRadar,
        fetchConnections,
        togglePin,
        toggleKhillan
    };
};
