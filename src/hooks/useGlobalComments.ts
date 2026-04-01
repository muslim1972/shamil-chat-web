import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface UserLite {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
}

export interface Comment {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    user?: UserLite | null;
}

import { SupabaseClient } from '@supabase/supabase-js';

interface UseGlobalCommentsProps {
    tableName: string;
    idColumn: string;
    itemId: string | number | null;
    currentUser: UserLite | null;
    client: SupabaseClient;
    subscribe?: boolean; // New prop to control realtime subscription
}

export const useGlobalComments = ({
    tableName,
    idColumn,
    itemId,
    currentUser,
    client,
    subscribe = true // Default to true
}: UseGlobalCommentsProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);

    // ✅ إنشاء instanceId فريد لكل استدعاء للـ hook لتجنب تضارب الـ channels
    const instanceIdRef = useRef(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    // Use Ref for currentUser to avoid restarting subscription on user updates
    const currentUserRef = React.useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    // Removed debug logging

    const fetchComments = React.useCallback(async () => {
        if (!itemId || !client) return;
        setLoading(true);
        try {
            // Fetch comments
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .eq(idColumn, itemId);
            // .order('created_at', { ascending: true }); // Order not strictly needed for count, but good for list

            if (error) throw error;

            const rawComments = data || [];
            setCommentsCount(rawComments.length); // Update count

            // Only process full comments if we are going to display them (subscribed or explicitly asked)
            // But for now, we keep logic simple.

            // ... (rest of user fetching logic) ... 
            // Optimization: If not subscribing (just count preview), maybe we don't need full user details yet?
            // For safety/speed, we'll keeping fetching but skip REALTME if subscribe=false.

            // ... (keep existing user fetch logic) ...
            const userIds = Array.from(new Set(rawComments.map((r: any) => r.user_id).filter(Boolean)));
            let usersMap = new Map<string, UserLite>();

            if (userIds.length > 0) {
                const { data: usersRows } = await supabase
                    .from('users')
                    .select('id, username, display_name, avatar_url')
                    .in('id', userIds);

                if (usersRows) {
                    usersMap = new Map((usersRows as UserLite[]).map(u => [String(u.id), u]));
                }
            }

            const formattedComments = rawComments.map((r: any) => ({
                ...r,
                user: usersMap.get(String(r.user_id)) || null
            })).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            setComments(formattedComments);
        } catch (err) {
            console.error('[useGlobalComments] Error fetching comments:', err);
        } finally {
            setLoading(false);
        }
    }, [itemId, tableName, idColumn, client]);

    // Initial fetch
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // Realtime updates
    useEffect(() => {
        if (!itemId || !client || !subscribe) { // Block if subscribe is false
            return;
        }

        // ✅ إضافة instanceId لضمان أن كل channel مستقل
        const channelName = `global-comments:${tableName}:${itemId}:${instanceIdRef.current}`;

        const channel = client
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName
                    // NO FILTER - receive all events, filter manually (REPLICA IDENTITY issue)
                },
                async (payload: any) => {
                    const eventType = payload.eventType;
                    const newRecord = payload.new as any;
                    const oldRecord = payload.old as any;

                    // Manual filter: check if event is for our itemId
                    const eventItemId = newRecord?.[idColumn] || oldRecord?.[idColumn];
                    if (!eventItemId || String(eventItemId) !== String(itemId)) {
                        return; // Skip events for other items
                    }

                    console.log('[useGlobalComments] Realtime event:', payload);

                    if (eventType === 'INSERT') {
                        // Fetch user for new comment
                        let user: UserLite | null = null;
                        if (newRecord.user_id) {
                            // Use Ref here
                            if (currentUserRef.current && newRecord.user_id === currentUserRef.current.id) {
                                user = currentUserRef.current;
                            } else {
                                try {
                                    const { data, error } = await supabase
                                        .from('users')
                                        .select('id, username, display_name, avatar_url')
                                        .eq('id', newRecord.user_id)
                                        .single();

                                    if (error) {
                                        console.error('[useGlobalComments] Error fetching user:', error);
                                    }

                                    if (data) user = data;
                                } catch (err) {
                                    console.error('[useGlobalComments] Exception fetching user:', err);
                                }
                            }
                        }

                        setComments(prev => {
                            // Find the temp comment that matches this new comment
                            const tempComment = prev.find(c => {
                                const isOptimistic = typeof c.id === 'string' && c.id.startsWith('temp-');
                                return isOptimistic && c.user_id === newRecord.user_id && c.content === newRecord.content;
                            });

                            // Prefer temp comment's user data since it's guaranteed to be complete from the same session
                            // Fall back to fetched user data or currentUserRef
                            const finalUser = tempComment?.user || user || null;

                            const newComment: Comment = {
                                id: newRecord.id,
                                content: newRecord.content,
                                user_id: newRecord.user_id,
                                created_at: newRecord.created_at,
                                user: finalUser
                            };

                            // Remove all temp comments with matching user_id and content
                            const filtered = prev.filter(c => {
                                const isOptimistic = typeof c.id === 'string' && c.id.startsWith('temp-');
                                if (isOptimistic) {
                                    // Remove temp comment if it has same user and content
                                    return !(c.user_id === newComment.user_id && c.content === newComment.content);
                                }
                                // Remove if it's a duplicate of the new comment
                                return c.id !== newComment.id;
                            });

                            // Check if we already have this comment
                            if (filtered.some(c => c.id === newComment.id)) {
                                return filtered;
                            }

                            return [...filtered, newComment];
                        });
                        setCommentsCount(prev => prev + 1);

                    } else if (eventType === 'DELETE') {
                        // Try getting ID from oldRecord first, then newRecord as fallback
                        const deletedId = oldRecord?.id || newRecord?.id;

                        if (deletedId) {
                            setComments(prev => prev.filter(c => c.id !== deletedId));
                            setCommentsCount(prev => Math.max(0, prev - 1));
                        }
                    } else if (eventType === 'UPDATE') {
                        setComments(prev => prev.map(c => c.id === newRecord.id ? { ...c, content: newRecord.content } : c));
                    }
                }
            )
            .subscribe();

        return () => {
            client.removeChannel(channel);
        };
    }, [itemId, tableName, idColumn, client, subscribe]); // Removed currentUser from dependency

    const addComment = async (text: string) => {
        if (!currentUser || !text.trim() || !itemId) return;

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempComment: Comment = {
            id: tempId,
            content: text.trim(),
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            user: currentUser
        };

        setComments(prev => [...prev, tempComment]);
        setCommentsCount(prev => prev + 1);

        try {
            const { error } = await client
                .from(tableName)
                .insert({
                    [idColumn]: itemId,
                    user_id: currentUser.id,
                    content: text.trim()
                });

            if (error) throw error;
        } catch (err) {
            console.error('[useGlobalComments] Error sending comment:', err);
            // Revert
            setComments(prev => prev.filter(c => c.id !== tempId));
            setCommentsCount(prev => Math.max(0, prev - 1));
            throw err;
        }
    };

    const deleteComment = async (commentId: string) => {
        if (!currentUser) return;

        // Optimistic update
        const previousComments = [...comments];
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentsCount(prev => Math.max(0, prev - 1));

        try {
            const { error } = await client
                .from(tableName)
                .delete()
                .eq('id', commentId)
                .eq('user_id', currentUser.id);
            if (error) throw error;

            // 🎯 Emit custom event for usePostComments to update count
            // This is needed because Supabase DELETE events don't include itemId due to REPLICA IDENTITY
            window.dispatchEvent(new CustomEvent('comment-deleted', {
                detail: {
                    tableName,
                    idColumn,
                    itemId,
                    commentId,
                    userId: currentUser.id
                }
            }));

            // 🌐 Broadcast to other users via Supabase Realtime
            // Must use same channel name and config that receivers are using
            const broadcastChannel = client.channel('comment-broadcasts', {
                config: { broadcast: { ack: true } }
            });

            // Check if channel is already subscribed
            const state = broadcastChannel.state;

            if (state === 'joined') {
                // Already subscribed, send directly
                await broadcastChannel.send({
                    type: 'broadcast',
                    event: 'comment-deleted',
                    payload: { tableName, itemId, commentId }
                });
            } else {
                // Need to subscribe first
                await new Promise<void>((resolve) => {
                    broadcastChannel.subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            broadcastChannel.send({
                                type: 'broadcast',
                                event: 'comment-deleted',
                                payload: { tableName, itemId, commentId }
                            }).then(() => resolve());
                        }
                    });
                });
            }
        } catch (err) {
            console.error('[useGlobalComments] Error deleting comment:', err);
            // Revert
            setComments(previousComments);
            setCommentsCount(previousComments.length);
            throw err;
        }
    };

    const editComment = async (commentId: string, newContent: string) => {
        if (!currentUser) return;

        // Optimistic update
        const previousComments = [...comments];
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent } : c));

        try {
            const { error } = await client
                .from(tableName)
                .update({ content: newContent })
                .eq('id', commentId)
                .eq('user_id', currentUser.id);
            if (error) throw error;
        } catch (err) {
            console.error('[useGlobalComments] Error editing comment:', err);
            // Revert
            setComments(previousComments);
            throw err;
        }
    };

    return {
        comments,
        loading,
        commentsCount,
        addComment,
        deleteComment,
        editComment
    };
};
