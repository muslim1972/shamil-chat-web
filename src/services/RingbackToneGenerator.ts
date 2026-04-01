/**
 * RingbackToneGenerator
 * يُولّد نغمة "طوووط... طوووط" (Ringback Tone) باستخدام Web Audio API
 * هذه النغمة هي النغمة القياسية التي يسمعها المتصل أثناء انتظار الرد
 * 
 * @example
 * const ringback = new RingbackToneGenerator();
 * ringback.start();
 * // ... بعد الرد أو الإلغاء
 * ringback.stop();
 */
export class RingbackToneGenerator {
    private audioCtx: AudioContext | null = null;
    private isPlaying = false;
    private intervalId: number | null = null;
    private currentOscillator: OscillatorNode | null = null;
    private currentGain: GainNode | null = null;

    // ✅ إعدادات النغمة القياسية (ITU-T E.180)
    private readonly FREQUENCY = 425; // Hz - التردد القياسي العالمي
    private readonly TONE_DURATION = 400; // ms - مدة كل "طوط"
    private readonly SILENCE_DURATION = 200; // ms - الصمت بين النغمتين
    private readonly CYCLE_PAUSE = 2000; // ms - الصمت بين الدورات
    private readonly VOLUME = 0.15; // مستوى صوت هادئ ومريح

    /**
     * بدء تشغيل نغمة الانتظار
     */
    start(): void {
        if (this.isPlaying) {
            console.log('🔔 Ringback tone already playing');
            return;
        }

        try {
            // إنشاء Audio Context جديد
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.isPlaying = true;

            console.log('📞 Starting ringback tone...');

            // بدء الدورة الأولى
            this.playCycle();

        } catch (error) {
            console.error('❌ Failed to start ringback tone:', error);
            this.cleanup();
        }
    }

    /**
     * تشغيل دورة واحدة: طوط - صمت - طوط - صمت طويل
     */
    private playCycle(): void {
        if (!this.isPlaying || !this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // ✅ النغمة الأولى
        this.playTone(now);

        // ✅ النغمة الثانية (بعد النغمة الأولى + صمت قصير)
        const secondToneStart = (this.TONE_DURATION + this.SILENCE_DURATION) / 1000;
        this.playTone(now + secondToneStart);

        // ✅ جدولة الدورة التالية
        const cycleDuration = (this.TONE_DURATION * 2 + this.SILENCE_DURATION + this.CYCLE_PAUSE);

        this.intervalId = window.setTimeout(() => {
            if (this.isPlaying) {
                this.playCycle();
            }
        }, cycleDuration);
    }

    /**
     * تشغيل نغمة واحدة مع fade-in و fade-out
     */
    private playTone(startTime: number): void {
        if (!this.audioCtx) return;

        const ctx = this.audioCtx;
        const duration = this.TONE_DURATION / 1000;

        // إنشاء المذبذب (Oscillator)
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(this.FREQUENCY, startTime);

        // إنشاء Gain للتحكم في الصوت مع fade
        const gainNode = ctx.createGain();

        // ✅ Fade-in سلس (تجنب الـ "click")
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(this.VOLUME, startTime + 0.02);

        // ✅ Fade-out سلس
        gainNode.gain.setValueAtTime(this.VOLUME, startTime + duration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        // توصيل السلسلة
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // تشغيل وإيقاف
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        // حفظ المراجع للتنظيف
        this.currentOscillator = oscillator;
        this.currentGain = gainNode;
    }

    /**
     * إيقاف نغمة الانتظار
     */
    stop(): void {
        if (!this.isPlaying) return;

        console.log('📞 Stopping ringback tone...');
        this.cleanup();
    }

    /**
     * تنظيف شامل للموارد
     */
    private cleanup(): void {
        this.isPlaying = false;

        // إيقاف المؤقت
        if (this.intervalId !== null) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }

        // إيقاف المذبذب الحالي
        try {
            if (this.currentOscillator) {
                this.currentOscillator.stop();
                this.currentOscillator.disconnect();
                this.currentOscillator = null;
            }
        } catch (e) {
            // تجاهل - قد يكون توقف بالفعل
        }

        // فصل Gain
        try {
            if (this.currentGain) {
                this.currentGain.disconnect();
                this.currentGain = null;
            }
        } catch (e) {
            // تجاهل
        }

        // إغلاق Audio Context
        if (this.audioCtx) {
            this.audioCtx.close().catch(() => { });
            this.audioCtx = null;
        }
    }

    /**
     * التحقق من حالة التشغيل
     */
    get playing(): boolean {
        return this.isPlaying;
    }
}

// ✅ Singleton للاستخدام العام
let ringbackInstance: RingbackToneGenerator | null = null;

export const getRingbackTone = (): RingbackToneGenerator => {
    if (!ringbackInstance) {
        ringbackInstance = new RingbackToneGenerator();
    }
    return ringbackInstance;
};

// ✅ دوال مختصرة للاستخدام السريع
export const startRingback = (): void => getRingbackTone().start();
export const stopRingback = (): void => getRingbackTone().stop();
