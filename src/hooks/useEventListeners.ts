import { useEffect } from 'react';

interface EventListenersProps {
  startForwarding: (messages: any[], mode: 'block' | 'direct' | null) => void;
  navigate: (path: string) => void;
  clearSelection: () => void;
  resolveMediaNow: (id: string, path: string) => Promise<any>;
}

export function useEventListeners({ startForwarding, navigate, clearSelection, resolveMediaNow }: EventListenersProps) {
  // Listen for forward-messages event from hook and navigate
  useEffect(() => {
    const onForward = (e: Event) => {
      const detail = (e as CustomEvent).detail as { messages: any[]; mode: 'block' | 'direct' } | undefined;
      if (!detail) return;
      
      // تمرير القيمة بشكل صحيح
      const mode = detail.mode || 'block';
      startForwarding(detail.messages, mode);
      navigate('/conversations');
      setTimeout(() => {
        document.querySelectorAll('[data-id]').forEach(el => {
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        });
      }, 100);
    };
    window.addEventListener('forward-messages', onForward as EventListener);
    return () => window.removeEventListener('forward-messages', onForward as EventListener);
  }, [startForwarding, navigate]);

  // Listen for resolve-media event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; path: string } | undefined;
      if (!detail) return;
      if (detail.path) resolveMediaNow(detail.id, detail.path);
    };
    window.addEventListener('resolve-media', handler as EventListener);
    return () => window.removeEventListener('resolve-media', handler as EventListener);
  }, [resolveMediaNow]);
}