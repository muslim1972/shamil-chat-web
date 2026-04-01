import { useCallback, useRef } from 'react';

// The target can be any EventTarget, but we'll often work with HTMLElements
type Target = EventTarget | null;

interface LongPressOptions { delay?: number; moveThreshold?: number }

const useLongPress = (
  onLongPress: (target: Target) => void,
  onClick: (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void,
  onDoubleClick?: (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void, // ✅ جديد
  options?: LongPressOptions
) => {
  const { delay = 650, moveThreshold = 20 } = options || {};
  const timeout = useRef<any>(null);
  const targetRef = useRef<Target>(null);
  const longPressTriggered = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  // ✅ حفظ آخر event لاستخدامه في end
  const lastEventRef = useRef<React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement> | null>(null);

  // ✅ جديد: تتبع النقرات للكشف عن النقر المزدوج
  const lastClickTime = useRef<number>(0);
  const clickTimeoutRef = useRef<any>(null);
  const doubleClickDelay = 300; // ms
  const interactionStartTime = useRef<number>(0); // ✅ جديد: وقت بداية التفاعل

  // ✅ دالة مشتركة لمعالجة النقرات (تُستخدم من end و handleClick)
  const processClick = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    // إذا لم يكن هناك onDoubleClick، نفذ onClick فوراً
    if (!onDoubleClick) {
      onClick(e);
      return;
    }

    // منطق النقر المزدوج (فقط إذا كان onDoubleClick موجود)
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    // ✅ حماية: النقر المزدوج يجب أن يكون خلال نافذة زمنية معقولة من بداية التفاعل
    if (timeSinceLastClick < doubleClickDelay && timeSinceLastClick > 0) {
      // نقرة مزدوجة!
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = undefined;
      }
      onDoubleClick(e);
      lastClickTime.current = 0; // reset
      interactionStartTime.current = 0; // ✅ reset
      return;
    }

    lastClickTime.current = now;

    // نقرة عادية (بعد delay صغير للتأكد أنها ليست بداية نقرة مزدوجة)
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      onClick(e);
      lastClickTime.current = 0; // ✅ reset بعد تنفيذ onClick
      interactionStartTime.current = 0; // ✅ reset
      clickTimeoutRef.current = undefined;
    }, doubleClickDelay);
  }, [onClick, onDoubleClick, doubleClickDelay]);

  const start = useCallback(
    (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      targetRef.current = event.currentTarget;
      lastEventRef.current = event;
      // ✅ الحل الصحيح: reset عند بدء تفاعل جديد
      longPressTriggered.current = false;
      // سجل نقطة البداية للمس
      if ('touches' in event && event.touches && event.touches[0]) {
        startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      } else if ('clientX' in event) {
        startPos.current = { x: (event as React.MouseEvent).clientX, y: (event as React.MouseEvent).clientY };
      }
      timeout.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress(targetRef.current);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
  }, []);

  const end = useCallback((e?: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    clear();
    // ✅ إزالة processClick من هنا لتجنب التكرار مع onClick
    // نعتمد على حدث onClick الأصلي الذي سيطلقه المتصفح بعد touchend
    startPos.current = null;
    lastEventRef.current = null;
  }, [clear]);

  const move = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!startPos.current) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - startPos.current.x);
    const dy = Math.abs(t.clientY - startPos.current.y);
    // إذا تجاوزت الحركة العتبة نلغي الضغط المطوّل (اعتبرها تمرير/سحب)
    if (dx > moveThreshold || dy > moveThreshold) {
      clear();
      startPos.current = null;
      lastClickTime.current = 0; // ✅ إلغاء أي نقرة سابقة عند التمرير
      interactionStartTime.current = 0;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = undefined;
      }
    }
  }, [moveThreshold, clear]);

  const handleClick = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    // ✅ لم نعد بحاجة لـ clickHandledRef لأننا لا نستدعي processClick في end
    if (longPressTriggered.current) {
      return;
    }

    // ✅ استخدام processClick (للديسكتوب والموبايل الآن)
    processClick(e);
  };

  // We must prevent the default context menu from showing on long press
  const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
  };

  const moveMouse = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      clear();
      startPos.current = null;
      lastClickTime.current = 0; // ✅ إلغاء أي نقرة سابقة عند التمرير
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = undefined;
      }
    }
  }, [moveThreshold, clear]);

  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
  };

  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => start(e),
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => start(e),
    onMouseUp: end,
    onTouchEnd: end,
    onTouchMove: move,
    onMouseMove: moveMouse,
    onMouseLeave: end, // Cancel if mouse leaves element
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
  };
};

export default useLongPress;