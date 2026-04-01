import { useCallback, useEffect, useRef } from 'react';

interface MediaResolutionQueue {
  queueRef: React.MutableRefObject<Array<{ id: string; path: string }>>;
  runningRef: React.MutableRefObject<number>;
  enqueuedRef: React.MutableRefObject<Set<string>>;
  backfillTimerRef: React.MutableRefObject<number | null>;
  enqueueResolve: (id: string, path: string) => void;
  resolveMediaNow: (id: string, path: string) => Promise<any>;
}

export function useMediaResolutionQueue(
  resolveMediaNow: (id: string, path: string) => Promise<any>,
  cachedMessages: any[]
): MediaResolutionQueue {
  const queueRef = useRef<Array<{ id: string; path: string }>>([]);
  const runningRef = useRef<number>(0);
  const enqueuedRef = useRef<Set<string>>(new Set());
  const backfillTimerRef = useRef<number | null>(null);

  const pumpQueue = useCallback(() => {
    while (runningRef.current < 3 && queueRef.current.length > 0) {
      const job = queueRef.current.shift()!;
      runningRef.current += 1;
      resolveMediaNow(job.id, job.path).finally(() => {
        runningRef.current -= 1;
        pumpQueue();
      });
    }
  }, [resolveMediaNow]);

  const enqueueResolve = useCallback((id: string, path: string) => {
    if (!id || !path) return;
    const key = `${id}`;
    if (enqueuedRef.current.has(key)) return;
    enqueuedRef.current.add(key);
    queueRef.current.push({ id, path });
    pumpQueue();
  }, [pumpQueue]);

  // Auto-resolve media for backfill (Event Driven with Debounce)
  useEffect(() => {
    // Debounce to avoid hammering on rapid updates
    const timer = setTimeout(() => {
      if (runningRef.current >= 3) return;

      // Check for unresolved media
      const candidates = cachedMessages.filter((m: any) =>
        m && m.message_type && m.message_type !== 'text' && m.message_type !== 'forwarded_block' && !m.signedUrl
      );

      if (candidates.length === 0) return;

      // Process a small batch
      const batch = candidates.slice(0, 3);
      batch.forEach((m: any) => {
        const path = (m as any).text;
        if (path) enqueueResolve(m.id, path);
      });

    }, 2000); // Wait for 2 seconds of silence/stability before processing

    return () => clearTimeout(timer);
  }, [cachedMessages, enqueueResolve]);

  return {
    queueRef,
    runningRef,
    enqueuedRef,
    backfillTimerRef,
    enqueueResolve,
    resolveMediaNow,
  };
}