import { useCallback } from 'react';

interface LoadMessagesProps {
  loadOlder?: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useLoadMessages({ loadOlder, containerRef }: LoadMessagesProps) {
  const handleLoadOlder = useCallback(() => {
    const el = containerRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    loadOlder && loadOlder();
    requestAnimationFrame(() => {
      const newHeight = el ? el.scrollHeight : 0;
      if (el) {
        el.scrollTop = el.scrollTop + (newHeight - prevHeight);
      }
    });
  }, [loadOlder]);

  return { handleLoadOlder };
}