import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Play, Pause } from 'lucide-react';

interface InlineAudioPlayerProps {
    audioUrl: string;
    isOwnMessage?: boolean;
    variant?: 'chat' | 'post';
}

/**
 * مشغل صوت مدمج مع تحليل صوتي حقيقي
 * ينقل كود AudioVisualizer بالضبط لتحليل الترددات
 */
export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = memo(({
    audioUrl,
    isOwnMessage = false,
    variant = 'chat'
}) => {
    // الحالة
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    // المراجع - نفس AudioVisualizer بالضبط
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const animationIdRef = useRef<number>(0);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const corsWarningShownRef = useRef<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // أبعاد Canvas
    const canvasHeight = variant === 'post' ? 70 : 50;

    // دالة الرسم - منقولة من AudioVisualizer بالضبط
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // مسح Canvas مع تأثير التلاشي
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!analyser || !dataArray) {
            // Fallback: رسم أشرطة متحركة إذا لم يكن هناك analyser
            const barCount = variant === 'post' ? 48 : 32;
            const barWidth = canvas.width / barCount;
            const time = Date.now() * 0.001;

            for (let i = 0; i < barCount; i++) {
                const wave = Math.sin(time * 2 + i * 0.2) * 0.3 + 0.5;
                const pulse = Math.sin(time * 3) * 0.2 + 0.8;
                const barHeight = wave * pulse * canvas.height * 0.6;

                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#a855f7');
                gradient.addColorStop(0.5, '#ec4899');
                gradient.addColorStop(1, '#3b82f6');
                ctx.fillStyle = gradient;
                ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
            }
        } else {
            // الحصول على بيانات الترددات الفعلية
            analyser.getByteFrequencyData(dataArray);

            // التحقق من وجود بيانات حقيقية
            const hasData = dataArray.some(value => value > 0);

            if (!hasData && !corsWarningShownRef.current) {
                console.warn('⚠️ Analyser returning zeros - CORS issue, using fallback');
                corsWarningShownRef.current = true;
            }

            // رسم الأشرطة
            const barWidth = (canvas.width / dataArray.length) * 2.5;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                let barHeight;

                if (hasData) {
                    // استخدام بيانات الصوت الحقيقية
                    barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                } else {
                    // Fallback: أشرطة متحركة
                    const time = Date.now() * 0.001;
                    const wave = Math.sin(time * 2 + i * 0.1) * 0.3 + 0.5;
                    const pulse = Math.sin(time * 3) * 0.2 + 0.8;
                    barHeight = wave * pulse * canvas.height * 0.6;
                }

                // إنشاء التدرج اللوني
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#a855f7'); // بنفسجي
                gradient.addColorStop(0.5, '#ec4899'); // وردي
                gradient.addColorStop(1, '#3b82f6'); // أزرق

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

                x += barWidth;
            }
        }

        // متابعة الرسم
        animationIdRef.current = requestAnimationFrame(draw);
    }, [variant]);

    // إعداد Web Audio API - منقول من AudioVisualizer
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let didInitialize = false;

        const initializeAudioContext = () => {
            if (didInitialize || sourceRef.current) return;

            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) {
                    console.warn('Web Audio API not supported');
                    return;
                }

                const audioContext = new AudioContext();
                audioContextRef.current = audioContext;

                if (audioContext.state === 'suspended') {
                    audio.play().then(() => {
                        audioContext.resume();
                    }).catch(() => { });
                }

                // إنشاء Analyser
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256; // حجم أصغر للمكون المدمج
                analyserRef.current = analyser;

                // إنشاء مصفوفة البيانات
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                dataArrayRef.current = dataArray;

                // ربط الصوت بالـ Analyser
                const source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                sourceRef.current = source;

                didInitialize = true;
                draw();
            } catch (error) {
                console.error('Failed to initialize audio context:', error);
            }
        };

        const handlePlay = () => {
            if (!audioContextRef.current && !didInitialize) {
                initializeAudioContext();
            } else if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            setIsPlaying(true);
            if (!animationIdRef.current) {
                draw();
            }
        };

        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [audioUrl, draw]);

    // تهيئة حجم Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resizeCanvas = () => {
            canvas.width = container.clientWidth;
            canvas.height = canvasHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [canvasHeight]);

    // تشغيل/إيقاف
    const togglePlayback = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (isPlaying) {
                audio.pause();
            } else {
                await audio.play();
            }
        } catch (err) {
            console.error('خطأ في التشغيل:', err);
        }
    };

    // التنقل في الصوت
    const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        const audio = audioRef.current;
        const canvas = canvasRef.current;
        if (!audio || !canvas || !duration) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * duration;

        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // تغيير السرعة
    const changeSpeed = (rate: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = rate;
        setPlaybackRate(rate);
    };

    // تنسيق الوقت
    const formatTime = (seconds: number) => {
        if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // الأنماط حسب النوع
    const containerClass = variant === 'post'
        ? 'p-4 rounded-2xl bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-purple-500/30'
        : isOwnMessage
            ? 'p-3 rounded-xl bg-indigo-600/40 border border-indigo-400/30'
            : 'p-3 rounded-xl bg-gray-700/60 dark:bg-gray-800/60 border border-gray-600/30';

    const playBtnSize = variant === 'post' ? 'w-14 h-14' : 'w-11 h-11';
    const playIconSize = variant === 'post' ? 24 : 18;

    return (
        <div className="space-y-2">
            {/* الفقاعة الرئيسية */}
            <div className={`${containerClass} transition-all`}>
                <div className="flex items-center gap-3">
                    {/* زر التشغيل */}
                    <button
                        onClick={togglePlayback}
                        className={`${playBtnSize} rounded-full flex items-center justify-center 
                            bg-gradient-to-br from-purple-500 to-pink-500 
                            hover:from-purple-400 hover:to-pink-400 
                            transition-all shadow-lg shadow-purple-500/30 flex-shrink-0
                            active:scale-95`}
                    >
                        {isPlaying ? (
                            <Pause size={playIconSize} fill="white" className="text-white" />
                        ) : (
                            <Play size={playIconSize} fill="white" className="text-white ml-1" />
                        )}
                    </button>

                    {/* منطقة الموجات */}
                    <div className="flex-1 min-w-0" ref={containerRef}>
                        {/* Canvas الموجات التفاعلية */}
                        <div className="rounded-lg overflow-hidden bg-black/30 border border-white/10 mb-2">
                            <canvas
                                ref={canvasRef}
                                onClick={handleSeek}
                                className="w-full cursor-pointer"
                                style={{ height: `${canvasHeight}px` }}
                            />
                        </div>

                        {/* الوقت فقط */}
                        <div className={`text-xs font-medium ${variant === 'post' ? 'text-purple-200' : isOwnMessage ? 'text-white/80' : 'text-gray-300'}`}>
                            <span>{formatTime(currentTime)}</span>
                            <span className="mx-1 opacity-50">/</span>
                            <span className="opacity-70">{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* سلايدر السرعة - أسفل الفقاعة */}
            <div className="flex items-center gap-2 px-7">
                {/* السلايدر */}
                <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.25"
                    value={playbackRate}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 h-1 appearance-none cursor-pointer rounded-full
                        bg-gray-300 dark:bg-gray-500
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3.5
                        [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:border
                        [&::-webkit-slider-thumb]:border-gray-400
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:w-3.5
                        [&::-moz-range-thumb]:h-3.5
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:border
                        [&::-moz-range-thumb]:border-gray-400
                        [&::-moz-range-thumb]:cursor-pointer"
                />
                {/* عرض القيمة */}
                <span className={`font-bold min-w-[24px] text-center text-white mix-blend-difference opacity-90 ${variant === 'post' ? 'text-sm' : 'text-xs'}`}>
                    {playbackRate}x
                </span>
            </div>

            {/* عنصر الصوت المخفي */}
            <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                crossOrigin="anonymous"
            />
        </div>
    );
});

InlineAudioPlayer.displayName = 'InlineAudioPlayer';
