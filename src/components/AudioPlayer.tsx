import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import type { Message } from '../types';
import { createSignedAudioUrl } from '../services/audioHelpers';

interface AudioPlayerProps {
  message: Message;
  isOwnMessage: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ message, isOwnMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 1;
  const errorTimerRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  // const progressBarRef = useRef<HTMLDivElement>(null); // Not used currently
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const resetState = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(false);
      setRetryCount(0);
      if (errorTimerRef.current) cancelAnimationFrame(errorTimerRef.current);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration); // Set to full duration at end
      cancelAnimationFrame(animationRef.current);
    };

    // Reset state when src changes
    resetState();

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    // Set duration if it's already available (e.g., from cache)
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      cancelAnimationFrame(animationRef.current);
    };
  }, [(message as any).signedUrl]);

  // دالة لإنشاء رابط بديل للملف الصوتي
  const generateAlternativeUrl = async () => {
    if (!message) return;

    setIsLoading(true);
    try {
      // استخدم النص كمسار التخزين (متسق مع بقية النظام)
      const rawPath = ((message as any).text || (message as any).content || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/public\/public\//g, 'public/')
        .replace(/\/+/g, '/');
      if (!rawPath) throw new Error('missing path');
      const filePath = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;

      // إنشاء رابط مؤقت جديد باستخدام الدالة المساعدة
      const newSignedUrl = await createSignedAudioUrl(filePath);

      if (!newSignedUrl) {
        console.error("Failed to create alternative signed URL");
        return;
      }

      // تحديث الرابط في عنصر الصوت فقط، دون تشغيل تلقائي
      if (audioRef.current) {
        audioRef.current.src = newSignedUrl;
        // إعادة الضبط دون إعلان فشل
        setAudioError(false);
        // إجبار المتصفح على إعادة قراءة المصدر
        audioRef.current.load();
      }
    } catch (err) {
      console.error("Exception creating alternative URL:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        requestAnimationFrame(animateProgress);
      }).catch((error: any) => {
        if (error?.name === 'AbortError') {
          // تجاهل AbortError الناتج عن إيقاف سريع بعد التشغيل
          return;
        }
        console.warn('Playback warning:', error);
        setAudioError(true);
      });
    }
  };

  const animateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    animationRef.current = requestAnimationFrame(animateProgress);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
      <div className={`p-3 rounded-lg ${isOwnMessage ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayback}
            className="p-1 rounded-full hover:bg-indigo-400 transition-colors"
            disabled={audioError}
          >
            {isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              disabled={audioError}
            />
            <div className="flex justify-between text-xs mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {audioError && (
            <button
              onClick={generateAlternativeUrl}
              className="p-1 rounded-full hover:bg-indigo-400 transition-colors"
              disabled={isLoading}
              title="إعادة تحميل الملف الصوتي"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          )}
        </div>

        {audioError && (
          <div className="mt-2 text-xs text-red-500">
            فشل تحميل الملف الصوتي. اضغط على زر إعادة التحميل للمحاولة مرة أخرى.
          </div>
        )}

        {(message as any).caption && (
          <div className="mt-2 text-xs opacity-80">
            {(message as any).caption}
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={(message as any).signedUrl || ''}
        preload={typeof (message as any).signedUrl === 'string' && (message as any).signedUrl.startsWith('blob:') ? 'auto' as any : 'metadata' as any}
        controls={false}
        crossOrigin="anonymous"
        onError={async (e) => {
          console.warn('Audio error:', e);
          // محاولة واحدة هادئة لإعادة التوقيع قبل إعلان الفشل
          if (retryCount < maxRetries && !isLoading) {
            setRetryCount(retryCount + 1);
            setAudioError(false);
            await generateAlternativeUrl();
            return;
          }
          // إعلان فشل مستقر بعد المحاولة
          setAudioError(true);
        }}
      />
    </div>
  );
};
