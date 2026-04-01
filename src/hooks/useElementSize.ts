import { useEffect, useState } from 'react';

export function useElementSize<T extends HTMLElement>(ref: React.RefObject<T>) {
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return size;
}
