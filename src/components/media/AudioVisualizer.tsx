import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Download, Share2, X, Check, FolderOpen, HardDrive, Database } from 'lucide-react';
import { downloadMediaFile, shareMediaFile, type StorageLocation } from '../../utils/downloadUtils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface AudioVisualizerProps {
    audioUrl: string;
    fileName?: string;
    onClose?: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioUrl, fileName, onClose }) => {
    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    // Download state
    const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
    const [downloadFileName, setDownloadFileName] = useState('');
    const [storageLocation, setStorageLocation] = useState<StorageLocation>('documents');
    const [isExternalStorageAvailable, setIsExternalStorageAvailable] = useState(true);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationIdRef = useRef<number>(0);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const corsWarningShownRef = useRef<boolean>(false);

    // Setup Web Audio API
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let didInitialize = false;

        const initializeAudioContext = () => {
            // Prevent double initialization
            if (didInitialize || sourceRef.current) return;

            try {
                console.log('🎵 Initializing AudioContext...');

                // Create audio context
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) {
                    console.warn('Web Audio API not supported, using fallback');
                    return;
                }

                const audioContext = new AudioContext();
                audioContextRef.current = audioContext;

                console.log('AudioContext state:', audioContext.state);

                // Resume context if suspended (browser policy)
                if (audioContext.state === 'suspended') {
                    audio.play().then(() => {
                        audioContext.resume().then(() => {
                            console.log('AudioContext resumed');
                        });
                    });
                }

                // Create analyser
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 512; // Increased for better visualization
                analyserRef.current = analyser;

                console.log('Analyser created, fftSize:', analyser.fftSize);

                // Create data array
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                dataArrayRef.current = dataArray as any;

                console.log('Data array created, length:', bufferLength);

                // Connect audio element to analyser
                const source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                sourceRef.current = source;

                didInitialize = true;
                console.log('✅ Audio routing: audio → analyser → destination');

                // Start drawing immediately
                draw();
            } catch (error) {
                console.error('❌ Failed to initialize audio context:', error);
                // Audio will still play through normal HTML audio element
            }
        };

        // Initialize on first play
        const handlePlay = () => {
            console.log('▶️ Play event');
            if (!audioContextRef.current && !didInitialize) {
                initializeAudioContext();
            } else if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().then(() => {
                    console.log('AudioContext resumed on play');
                });
            }
            setIsPlaying(true);
            // Start animation if not already started
            if (!animationIdRef.current) {
                draw();
            }
        };

        const handlePause = () => {
            console.log('⏸️ Pause event');
            setIsPlaying(false);
        };

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

        const handleLoadedMetadata = () => {
            console.log('📊 Metadata loaded, duration:', audio.duration);
            setDuration(audio.duration);
            // Try to initialize on metadata load (before play)
            if (!didInitialize && !sourceRef.current) {
                // Don't initialize yet, wait for play
            }
        };

        const handleEnded = () => {
            console.log('🏁 Audio ended');
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        // Try to auto-play immediately
        const tryAutoPlay = async () => {
            try {
                console.log('🎬 Attempting autoplay...');
                await audio.play();
                console.log('✅ Autoplay successful');
            } catch (err) {
                console.log('⚠️ Auto-play requires user interaction:', err);
            }
        };

        // Small delay to ensure audio element is ready
        setTimeout(tryAutoPlay, 100);

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
    }, [audioUrl]);

    // Draw waveform
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        if (!canvas) {
            console.warn('Canvas ref is null');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Canvas context is null');
            return;
        }

        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!analyser || !dataArray) {
            // Draw animated bars if no analyser (fallback)
            const barCount = 64;
            const barWidth = canvas.width / barCount;
            const time = Date.now() * 0.001; // Time for animation

            for (let i = 0; i < barCount; i++) {
                // Create wave-like movement
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
            // Get frequency data
            analyser.getByteFrequencyData(dataArray as any);

            // Check if we're getting real data or zeros (CORS issue)
            const hasData = dataArray.some(value => value > 0);

            if (!hasData && !corsWarningShownRef.current) {
                console.warn('⚠️ Analyser returning zeros - CORS issue detected, using fallback');
                corsWarningShownRef.current = true;
            }

            // Draw bars
            const barWidth = (canvas.width / dataArray.length) * 2.5;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                let barHeight;

                if (hasData) {
                    // Use real audio data
                    barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                } else {
                    // Fallback: animated bars
                    const time = Date.now() * 0.001;
                    const wave = Math.sin(time * 2 + i * 0.1) * 0.3 + 0.5;
                    const pulse = Math.sin(time * 3) * 0.2 + 0.8;
                    barHeight = wave * pulse * canvas.height * 0.6;
                }

                // Create gradient
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#a855f7'); // purple
                gradient.addColorStop(0.5, '#ec4899'); // pink
                gradient.addColorStop(1, '#3b82f6'); // blue

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

                x += barWidth;
            }
        }

        // Continue animation
        animationIdRef.current = requestAnimationFrame(draw);
    }, []);

    // Toggle play/pause
    const togglePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => console.error('Playback error:', err));
        }
    };

    // Handle seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // Change playback speed
    const changeSpeed = (rate: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Download handlers
    const checkExternalStorage = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const testPath = 'test-external-check.txt';
                await Filesystem.writeFile({
                    path: testPath,
                    data: 'test',
                    directory: Directory.External
                });
                await Filesystem.deleteFile({
                    path: testPath,
                    directory: Directory.External
                });
                setIsExternalStorageAvailable(true);
            } catch (error) {
                setIsExternalStorageAvailable(false);
            }
        } else {
            setIsExternalStorageAvailable(false);
        }
    };

    const handleDownloadClick = () => {
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '');
        setDownloadFileName(`${fileName || 'Audio'} - ${timestamp}`);
        setStorageLocation('documents');
        checkExternalStorage();
        setShowDownloadPrompt(true);
    };

    const confirmDownload = () => {
        if (audioUrl && downloadFileName.trim()) {
            downloadMediaFile(audioUrl, downloadFileName.trim(), storageLocation);
            setShowDownloadPrompt(false);
        }
    };

    const handleShareClick = async () => {
        if (audioUrl) {
            await shareMediaFile(audioUrl, fileName || 'ملف صوتي');
        }
    };

    // Resize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = 200;
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="w-full max-w-4xl p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white truncate">{fileName || 'ملف صوتي'}</h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Canvas Visualizer */}
                <div className="mb-8 rounded-xl overflow-hidden bg-black/30 border border-white/10">
                    <canvas
                        ref={canvasRef}
                        className="w-full"
                        style={{ height: '200px' }}
                    />
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                        style={{
                            background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                        }}
                    />
                    <div className="flex justify-between text-sm text-white/60 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {/* Play/Pause */}
                    <button
                        onClick={togglePlayback}
                        className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                    >
                        {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
                    </button>

                    {/* Speed */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                        >
                            ⚡ {playbackRate === 1 ? 'عادي' : `${playbackRate}x`}
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg shadow-xl border border-white/10 overflow-hidden min-w-[120px]">
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => changeSpeed(rate)}
                                        className={`w-full text-right px-4 py-2 text-sm transition-colors ${playbackRate === rate
                                            ? 'bg-blue-600 text-white'
                                            : 'text-white/80 hover:bg-white/10'
                                            }`}
                                    >
                                        {rate === 1 ? 'عادي' : `${rate}x`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Download */}
                    <button
                        onClick={handleDownloadClick}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Download size={20} />
                        <span>تحميل</span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={handleShareClick}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Share2 size={20} />
                        <span>مشاركة</span>
                    </button>
                </div>

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    crossOrigin="anonymous"
                />

                {/* Download Modal */}
                {showDownloadPrompt && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl border border-white/10">
                            <h3 className="text-white text-xl font-bold mb-4 text-center">تحميل الملف الصوتي</h3>

                            <input
                                type="text"
                                value={downloadFileName}
                                onChange={(e) => setDownloadFileName(e.target.value)}
                                placeholder="اسم الملف..."
                                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 text-right placeholder-gray-400"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmDownload();
                                    if (e.key === 'Escape') setShowDownloadPrompt(false);
                                }}
                            />

                            <div className="mb-6">
                                <label className="block text-white text-sm font-medium mb-3 text-right">موقع الحفظ:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setStorageLocation('documents')}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${storageLocation === 'documents'
                                            ? 'bg-blue-600/30 border-blue-500 text-white'
                                            : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                    >
                                        <FolderOpen size={20} />
                                        <span className="text-xs font-medium leading-tight">المستندات</span>
                                    </button>

                                    <button
                                        onClick={() => setStorageLocation('cache')}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${storageLocation === 'cache'
                                            ? 'bg-purple-600/30 border-purple-500 text-white'
                                            : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                    >
                                        <HardDrive size={20} />
                                        <span className="text-xs font-medium leading-tight text-center">ذاكرة<br />التطبيق</span>
                                    </button>

                                    <button
                                        onClick={() => isExternalStorageAvailable && setStorageLocation('external')}
                                        disabled={!isExternalStorageAvailable}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${!isExternalStorageAvailable
                                            ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                            : storageLocation === 'external'
                                                ? 'bg-green-600/30 border-green-500 text-white'
                                                : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                        title={!isExternalStorageAvailable ? 'الذاكرة الخارجية غير متوفرة' : ''}
                                    >
                                        <Database size={20} />
                                        <span className="text-xs font-medium leading-tight text-center">ذاكرة<br />خارجية</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDownloadPrompt(false)}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={confirmDownload}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    تحميل
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
