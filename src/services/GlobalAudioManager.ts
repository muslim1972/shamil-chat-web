// مدير صوتي عام مع حماية شاملة من التكرار اللانهائي وتجاوز مشاكل التشغيل التلقائي
class GlobalAudioManager {
  private static instance: GlobalAudioManager;

  // Audio Elements
  private currentAudio: HTMLAudioElement | null = null;

  // Web Audio API (Fallback)
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  // State
  private isPlaying = false;
  private isStopping = false;
  private isAlertActive = false; // ✅ حالة جديدة لتتبع "نية" النظام في تشغيل التنبيه
  private listeners: Set<() => void> = new Set();
  private alertTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // منع إنشاء كائنات إضافية
  }

  // الحصول على المرجع الوحيد
  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  // بدء صوت التنبيه مع إجبار التشغيل
  async startAlert(): Promise<void> {
    try {
      // Global Audio Manager: Starting alert
      this.stopAllAudio();
      this.isAlertActive = true; // ✅ بدأنا التنبيه

      // محاولة تهيئة Audio Context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 1. محاولة تشغيل الملف الصوتي أولاً
      this.currentAudio = new Audio();
      this.currentAudio.src = '/sounds/ringing_old_phone.mp3';
      this.currentAudio.loop = true;
      this.currentAudio.volume = 0.8;

      // إضافة مستمعي الأحداث
      this.currentAudio.addEventListener('ended', () => {
        this.notifyListeners();
      });

      this.currentAudio.addEventListener('error', (error) => {
        // إذا توقف التنبيه، لا داعي للقلق بشأن فشل الملف
        if (!this.isAlertActive) return;

        console.warn('🔊 Audio file error (switching to fallback):', error);
        this.playFallbackTone();
      });

      // محاولة تشغيل الصوت
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
        this.isStopping = false;
        this.notifyListeners();

      } catch (playError) {
        console.error('🔊 Global Audio Manager: Play failed (Autoplay blocked?):', playError);
        this.isPlaying = false;
        this.notifyListeners();
        // لا نشغل Fallback هنا فوراً لأن المتصفح قد يكون منع الصوت كلياً، ننتظر التفاعل
        throw playError; // نرفع الخطأ ليتعامل معه الـ Context بالانتظار للتفاعل
      }

    } catch (error) {
      console.error('🔊 Global Audio Manager: Error in startAlert:', error);
      this.isPlaying = false;
      this.isAlertActive = false; // ❌ فشل البدء
      this.notifyListeners();
      throw error;
    }
  }

  // تشغيل نغمة بديلة برمجياً (Oscillator)
  private playFallbackTone() {
    if (!this.isAlertActive) return; // ✅ حماية إضافية

    try {
      if (!this.audioContext) return;

      // استئناف الـ Context إذا كان معلقاً
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.stopOscillator();

      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      this.oscillator.type = 'square'; // صوت مزعج للتنبيه
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // 800Hz

      // نمط الرنين (تغيير التردد)
      this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      this.oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
      this.oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.2);

      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.oscillator.start();

      // تكرار النغمة يدوياً
      const loopTone = () => {
        if (!this.isAlertActive || !this.isPlaying || this.isStopping) return; // ✅ التحقق من isAlertActive
        try {
          this.stopOscillator();
          if (this.isAlertActive) this.playFallbackTone();
        } catch (e) { }
      };

      // إعادة التشغيل كل ثانية لعمل تأثير رنين متقطع
      this.alertTimer = setTimeout(loopTone, 1000);

      this.isPlaying = true;
      this.isStopping = false;
      this.notifyListeners();

    } catch (e) {
      console.error('🔊 Fallback tone failed:', e);
    }
  }

  private stopOscillator() {
    if (this.oscillator) {
      try { this.oscillator.stop(); this.oscillator.disconnect(); } catch (e) { }
      this.oscillator = null;
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) { }
      this.gainNode = null;
    }
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  // محاولة استئناف الصوت
  async resume(): Promise<void> {
    if (!this.isAlertActive) return; // ✅ التغيير الجذري: لا تستأنف إذا لم يكن التنبيه نشطاً!

    // 1. استئناف الملف الصوتي
    if (this.currentAudio) {
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
        this.notifyListeners();
        return;
      } catch (error) {
        console.error('🔊 Global Audio Manager: Resume audio file failed:', error);
      }
    }

    // 2. أو استئناف النغمة البرمجية (إذا فشل الملف أو لم يوجد)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        // إذا لم يكن هناك صوت يعمل والملف فشل، نبدأ النغمة البرمجية
        // وفقط إذا كان التنبيه نشطاً
        if (this.isAlertActive && !this.isPlaying && !this.currentAudio) {
          this.playFallbackTone();
        } else if (this.isAlertActive && !this.isPlaying && this.currentAudio) {
          // محاولة أخيرة للملف
          this.currentAudio.play().catch(() => {
            if (this.isAlertActive) this.playFallbackTone();
          });
        }
        if (this.isAlertActive) {
          this.isPlaying = true;
          this.notifyListeners();
        }
      } catch (error) {
        console.error('🔊 Global Audio Manager: Resume AudioContext failed:', error);
      }
    }
  }

  // إيقاف جميع الأصوات مع حماية من التكرار اللانهائي
  stopAllAudio(): void {
    try {
      this.isAlertActive = false; // ✅ إيقاف نية التنبيه فوراً

      // حماية من التكرار اللانهائي
      if (this.isStopping) {
        return;
      }

      this.isStopping = true;
      // Global Audio Manager: Stopping all audio

      // إلغاء المؤقت
      if (this.alertTimer) {
        clearTimeout(this.alertTimer);
        this.alertTimer = null;
      }

      // إيقاف الصوت الحالي
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
        this.currentAudio.removeEventListener('ended', () => { });
        this.currentAudio.removeEventListener('error', () => { });
        this.currentAudio = null;
      }

      // إيقاف النغمة البرمجية
      this.stopOscillator();

      // تنظيف أي عناصر صوت أخرى في الصفحة
      document.querySelectorAll('audio').forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      });

      this.isPlaying = false;
      // All audio stopped

      // إشعار المستمعين مع تأخير منع التكرار اللانهائي
      setTimeout(() => {
        this.notifyListeners();
        this.isStopping = false;
      }, 50);

    } catch (error) {
      console.error('🔊 Global Audio Manager: Error in stop:', error);
      this.isStopping = false;
      this.notifyListeners();
    }
  }

  // إشعار جميع المستمعين
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error in audio listener:', error);
      }
    });
  }

  // إضافة مستمع للتغييرات
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  // إزالة مستمع
  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  // الحصول على حالة الصوت
  getStatus(): { isPlaying: boolean; hasAudio: boolean } {
    return {
      isPlaying: this.isPlaying,
      hasAudio: this.currentAudio !== null || this.oscillator !== null
    };
  }

  // إعادة تعيين كاملة (للحالات الطارئة)
  reset(): void {
    // Global Audio Manager: Full reset
    this.stopAllAudio();
    this.listeners.clear();
    this.isStopping = false;
    this.isPlaying = false;
    this.alertTimer = null;
    this.audioContext = null;
  }
}

// مدير الصوت العام
export const globalAudioManager = GlobalAudioManager.getInstance();

// Hook للاستخدام
export const useGlobalAudio = () => ({
  startAlert: globalAudioManager.startAlert.bind(globalAudioManager),
  stopAllAudio: globalAudioManager.stopAllAudio.bind(globalAudioManager),
  addListener: globalAudioManager.addListener.bind(globalAudioManager),
  removeListener: globalAudioManager.removeListener.bind(globalAudioManager),
  getStatus: globalAudioManager.getStatus.bind(globalAudioManager),
  reset: globalAudioManager.reset.bind(globalAudioManager),
  resume: globalAudioManager.resume.bind(globalAudioManager)
});

// دالة عالمية لإيقاف الصوت
(window as any).stopAllAudio = () => {
  globalAudioManager.stopAllAudio();
};