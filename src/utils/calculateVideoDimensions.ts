/**
 * حساب أبعاد الفيديو ديناميكياً بناءً على aspect ratio
 * 
 * @param width - العرض الأصلي من metadata
 * @param height - الارتفاع الأصلي من metadata
 * @returns أبعاد محسوبة للعرض الأمثل
 */
export function calculateVideoDimensions(width: number, height: number) {
    // التحقق من صحة القيم
    const w = width > 0 ? width : 640;
    const h = height > 0 ? height : 360;

    // حساب نسبة العرض للارتفاع
    const aspectRatio = w / h;

    // تحديد orientation
    const isPortrait = h > w; // عمودي (9:16)
    const isLandscape = w > h; // أفقي (16:9)
    const isSquare = Math.abs(w - h) < 10; // مربع تقريباً

    // حساب الأبعاد المثالية للعرض
    let displayWidth: number;
    let displayHeight: number;
    let maxWidth: string;
    let maxHeight: string;

    if (isPortrait) {
        // فيديو عمودي (مثل stories)
        // نريد: عرض محدود، ارتفاع أكبر
        const MAX_WIDTH = 220;
        const MAX_HEIGHT = 400;

        if (h > MAX_HEIGHT) {
            displayHeight = MAX_HEIGHT;
            displayWidth = MAX_HEIGHT * aspectRatio;
        } else {
            displayHeight = h;
            displayWidth = w;
        }

        maxWidth = `${MAX_WIDTH}px`;
        maxHeight = `${MAX_HEIGHT}px`;

    } else if (isSquare) {
        // فيديو مربع
        const SIZE = 280;
        displayWidth = SIZE;
        displayHeight = SIZE;
        maxWidth = `${SIZE}px`;
        maxHeight = `${SIZE}px`;

    } else {
        // فيديو أفقي (عادي)
        // نريد: عرض كامل، ارتفاع محدود
        const MAX_HEIGHT = 280;
        const MAX_WIDTH_VW = 85; // % من viewport

        if (h > MAX_HEIGHT) {
            displayHeight = MAX_HEIGHT;
            displayWidth = MAX_HEIGHT * aspectRatio;
        } else {
            displayHeight = h;
            displayWidth = w;
        }

        maxWidth = `min(${MAX_WIDTH_VW}vw, ${Math.min(displayWidth, 500)}px)`;
        maxHeight = `${MAX_HEIGHT}px`;
    }

    return {
        // للاستخدام في aspect-ratio
        aspectWidth: w,
        aspectHeight: h,
        aspectRatio: `${w}/${h}`,

        // للاستخدام في style
        maxWidth,
        maxHeight,
        minWidth: isPortrait ? '180px' : '200px',

        // معلومات إضافية
        orientation: isPortrait ? 'portrait' : isSquare ? 'square' : 'landscape',
        isPortrait,
        isLandscape,
        isSquare,
    };
}
