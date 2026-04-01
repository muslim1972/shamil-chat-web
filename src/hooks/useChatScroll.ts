import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import type { Message } from '../types';

interface UseChatScrollArgs {
  conversationId: string;
  displayedMessages: Message[];
}

interface UseChatScrollResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (smooth?: boolean) => void;
  // unread badge
  unreadCount: number;
  showUnread: boolean;
  clearUnread: () => void;
  // helpers around sending/media
  onBeforeSendLikelyMedia: (durationMs?: number) => void;
  requestScrollAfterSend: () => void;
  // bottom detection utilities
  isAtBottomStrict: () => boolean;
  isNearBottomAuto: () => boolean;
  shouldReserveBottom: () => boolean;
}

export function useChatScroll({ conversationId, displayedMessages }: UseChatScrollArgs): UseChatScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnread, setShowUnread] = useState(false);
  const [requestScrollToBottom, setRequestScrollToBottom] = useState(false);
  const stickToBottomRef = useRef<boolean>(false);

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const isAtBottomStrict = useCallback(() => {
    const el = containerRef.current; if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
  }, []);

  const isNearBottomAuto = useCallback(() => {
    const el = containerRef.current; if (!el) return true;
    const threshold = 180; // more generous auto-scroll window
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    setShowUnread(false);
  }, []);

  const onBeforeSendLikelyMedia = useCallback((durationMs: number = 1500) => {
    stickToBottomRef.current = true;
    window.setTimeout(() => { stickToBottomRef.current = false; }, durationMs);
  }, []);

  const requestScrollAfterSend = useCallback(() => {
    setRequestScrollToBottom(true);
  }, []);

  // initial scroll on first render with messages
  const didInitialScrollRef = useRef<string | null>(null);
  const prevDisplayedCountRef = useRef<number>(0);
  useLayoutEffect(() => {
    const safeDisplayedMessages = displayedMessages || [];
    
    if (safeDisplayedMessages.length > 0) {
      scrollToBottom(false);
      requestAnimationFrame(() => scrollToBottom(false));
      setTimeout(() => scrollToBottom(false), 100);
      setTimeout(() => scrollToBottom(false), 300);
      setTimeout(() => scrollToBottom(false), 600);
      didInitialScrollRef.current = conversationId;
    }
    prevDisplayedCountRef.current = safeDisplayedMessages.length;
  }, [conversationId, displayedMessages.length, scrollToBottom]);

  // new message tracking
  const stableOf = useCallback((m: any) => (m?.media_metadata?.client_id || m?.client_id || m?.id || ''), []);
  const prevLastKeyRef = useRef<string>("");
  const prevCountRef = useRef<number>(0);
  
  useEffect(() => {
    const safeDisplayedMessages = displayedMessages || [];
    
    if (safeDisplayedMessages.length > prevCountRef.current) {
      // رسالة جديدة
      if (isNearBottomAuto()) {
        // تمرير فوري لآخر رسالة
        requestAnimationFrame(() => scrollToBottom(true));
        clearUnread();
        stickToBottomRef.current = true;
        window.setTimeout(() => { stickToBottomRef.current = false; }, 1000);
      } else {
        setUnreadCount(prev => prev + 1);
        setShowUnread(true);
      }
    }
    prevCountRef.current = displayedMessages.length;
    
    const last = displayedMessages[displayedMessages.length - 1];
    const lastKey = last ? stableOf(last as any) : '';
    prevLastKeyRef.current = lastKey;
  }, [displayedMessages, isNearBottomAuto, scrollToBottom, clearUnread, stableOf]);

  // clear unread when at exact bottom
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onScroll = () => {
      if (isAtBottomStrict()) clearUnread();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isAtBottomStrict, clearUnread]);

  // perform deferred scroll after send
  useEffect(() => {
    if (requestScrollToBottom) {
      requestAnimationFrame(() => {
        scrollToBottom(true);
        requestAnimationFrame(() => scrollToBottom(true));
        setTimeout(() => {
          scrollToBottom(false);
          const el = containerRef.current; if (el) el.scrollTop = el.scrollHeight;
        }, 80);
      });
      setRequestScrollToBottom(false);
    }
  }, [requestScrollToBottom, scrollToBottom]);

  // ensure reveal when media finishes loading if near bottom or stick flag is on
  useEffect(() => {
    const onMediaLoaded = () => {
      if (!(isNearBottomAuto() || stickToBottomRef.current)) return;
      requestAnimationFrame(() => {
        scrollToBottom(false);
        const el = containerRef.current; if (el) el.scrollTop = el.scrollHeight;
      });
      setTimeout(() => {
        scrollToBottom(false);
        const el = containerRef.current; if (el) el.scrollTop = el.scrollHeight;
      }, 200);
    };
    window.addEventListener('media-loaded', onMediaLoaded as EventListener);

    const el = containerRef.current;
    if (el) {
      const onImg = () => onMediaLoaded();
      const onVid = () => onMediaLoaded();
      el.addEventListener('load', onImg, true);
      el.addEventListener('loadedmetadata', onVid, true);
      el.addEventListener('loadeddata', onVid, true);
      return () => {
        window.removeEventListener('media-loaded', onMediaLoaded as EventListener);
        el.removeEventListener('load', onImg, true);
        el.removeEventListener('loadedmetadata', onVid, true);
        el.removeEventListener('loadeddata', onVid, true);
      };
    }
    return () => window.removeEventListener('media-loaded', onMediaLoaded as EventListener);
  }, [isNearBottomAuto, scrollToBottom]);

  return {
    containerRef,
    messagesEndRef,
    scrollToBottom,
    unreadCount,
    showUnread,
    clearUnread,
    onBeforeSendLikelyMedia,
    requestScrollAfterSend,
    isAtBottomStrict,
    isNearBottomAuto,
    shouldReserveBottom: () => false, // إزالة المساحة الإضافية لتثبيت الرسائل في القاع
  };
}
