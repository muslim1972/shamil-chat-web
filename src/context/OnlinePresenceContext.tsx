import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface OnlinePresenceContextType {
    onlineUsers: Set<string>;
}

const OnlinePresenceContext = createContext<OnlinePresenceContextType>({ onlineUsers: new Set() });

export const OnlinePresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('global_presence')
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const userIds = new Set<string>();
                for (const id in newState) {
                    const presences = newState[id] as any[];
                    presences.forEach(p => {
                        if (p.user_id) userIds.add(p.user_id);
                    });
                }
                setOnlineUsers(userIds);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    newPresences.forEach((p: any) => {
                        if (p.user_id) next.add(p.user_id);
                    });
                    return next;
                });
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    leftPresences.forEach((p: any) => {
                        if (p.user_id) next.delete(p.user_id);
                    });
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]); // Depend on user ID to avoid re-subscribing unnecessarily if user object changes reference

    return (
        <OnlinePresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </OnlinePresenceContext.Provider>
    );
};

export const useOnlinePresence = () => useContext(OnlinePresenceContext);
