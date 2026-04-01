
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, Minimize, Download, Check, Share2, FolderOpen, HardDrive, Database, ExternalLink, ImageIcon, Volume2, VolumeX } from 'lucide-react';
import { useMediaViewer } from '../../context/MediaViewerContext';
import { downloadMediaFile, shareMediaFile, type StorageLocation } from '../../utils/downloadUtils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AudioVisualizer } from './AudioVisualizer';

/**
 * عارض وسائط عالمي - يعمل مع الصور والفيديو والصوت
 * تم تطويره ليدعم التكبير (Zoom) واللمس والتحميل
 */
export const GlobalMediaViewer: React.FC = () => {
    const { state, closeMedia } = useMediaViewer();

    // Zoom State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Download State
    const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
    const [fileName, setFileName] = useState('');
    const [storageLocation, setStorageLocation] = useState<StorageLocation>('gallery'); // الافتراضي: المعرض
    const [isExternalStorageAvailable, setIsExternalStorageAvailable] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

    // Reset state on open
    useEffect(() => {
        if (state.isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setShowDownloadPrompt(false);
            setStorageLocation('gallery'); // الافتراضي: المعرض
            // Use fileName from state or generate default
            if (state.fileName) {
                setFileName(state.fileName);
            } else {
                const timestamp = new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '');
                setFileName(`Shamil_Media_${timestamp}`);
            }

            // Check external storage availability (mobile only)
            checkExternalStorage();
        }
    }, [state.isOpen, state.mediaUrl, state.fileName]);

    // ✅ دعم زر الرجوع للموبايل
    useEffect(() => {
        if (!state.isOpen) return;

        const handleBackButton = (e: PopStateEvent) => {
            e.preventDefault();
            if (showDownloadPrompt) {
                setShowDownloadPrompt(false);
            } else {
                closeMedia();
            }
        };

        window.history.pushState({ mediaViewer: true }, '');
        window.addEventListener('popstate', handleBackButton);

        return () => {
            window.removeEventListener('popstate', handleBackButton);
        };
    }, [state.isOpen, closeMedia, showDownloadPrompt]);

    // ✅ إغلاق عند الضغط على Escape
    useEffect(() => {
        if (!state.isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showDownloadPrompt) setShowDownloadPrompt(false);
                else closeMedia();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [state.isOpen, closeMedia, showDownloadPrompt]);

    // Background Audio Logic (React-controlled)
    useEffect(() => {
        if (state.isOpen && state.mediaType === 'image' && state.metadata?.background_audio?.url) {
            // Unmute by default if it's a fresh open
            if (audioRef.current) {
                audioRef.current.volume = 1.0;
                // Note: Actual play happens via autoPlay prop or ref call below
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError') {
                            console.warn('Audio autoplay failed (likely needs interaction):', e);
                        }
                    });
                }
            }
        }
    }, [state.isOpen, state.mediaUrl, state.metadata]);

    // Zoom Handlers
    const handleWheel = useCallback((e: WheelEvent) => {
        if (!state.isOpen || state.mediaType !== 'image') return;

        // Ctrl + Scroll behavior standard in browsers
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY * -0.01;
            const newScale = Math.min(Math.max(MIN_SCALE, scale + delta), MAX_SCALE);
            setScale(newScale);
        }
    }, [scale, state.isOpen, state.mediaType]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [handleWheel]);

    const lastTouchEnd = useRef<number>(0);
    const lastDist = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (state.mediaType !== 'image') return;

        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastDist.current = dist;
        } else if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            });

            const now = Date.now();
            if (now - lastTouchEnd.current < 300) {
                handleDoubleTap();
            }
            lastTouchEnd.current = now;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (state.mediaType !== 'image') return;

        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            if (lastDist.current > 0) {
                const delta = dist - lastDist.current;
                const newScale = Math.min(Math.max(MIN_SCALE, scale + delta * 0.01), MAX_SCALE);
                setScale(newScale);
            }
            lastDist.current = dist;
        } else if (e.touches.length === 1 && scale > 1 && isDragging) {
            const x = e.touches[0].clientX - dragStart.x;
            const y = e.touches[0].clientY - dragStart.y;
            setPosition({ x, y });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastDist.current = 0;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            const x = e.clientX - dragStart.x;
            const y = e.clientY - dragStart.y;
            setPosition({ x, y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleDoubleTap = () => {
        if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setScale(2.5);
        }
    };

    const confirmDownload = () => {
        if (state.mediaUrl && fileName.trim()) {
            downloadMediaFile(state.mediaUrl, fileName.trim(), storageLocation);
            setShowDownloadPrompt(false);
        }
    };

    const handleShare = async () => {
        if (state.mediaUrl) {
            await shareMediaFile(state.mediaUrl, fileName || 'وسائط من تطبيق شامل');
        }
    };

    const checkExternalStorage = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                // Try to check if external storage is available
                const testPath = 'test-external-check.txt';
                await Filesystem.writeFile({
                    path: testPath,
                    data: 'test',
                    directory: Directory.External
                });
                // If successful, delete the test file
                await Filesystem.deleteFile({
                    path: testPath,
                    directory: Directory.External
                });
                setIsExternalStorageAvailable(true);
            } catch (error) {
                console.log('External storage not available:', error);
                setIsExternalStorageAvailable(false);
            }
        } else {
            // On web, external storage is not applicable
            setIsExternalStorageAvailable(false);
        }
    };

    const [iframeLoading, setIframeLoading] = useState(true);

    // Reset iframe loading when url changes + Fallback timeout
    useEffect(() => {
        if (state.mediaType === 'web') {
            setIframeLoading(true);

            // Fallback: إخفاء التحميل بعد 8 ثوانٍ في كل الأحوال لضمان عدم تعليق الواجهة
            const timer = setTimeout(() => {
                setIframeLoading(false);
            }, 8000);

            return () => clearTimeout(timer);
        }
    }, [state.mediaUrl, state.mediaType]);

    if (!state.isOpen || !state.mediaUrl) return null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden touch-none"
            onClick={(e) => {
                // Close if clicking background and not zoomed in, AND not clicking the modal
                if (scale === 1 && e.target === containerRef.current && !showDownloadPrompt) closeMedia();
            }}
            onMouseDown={state.mediaType === 'image' && !showDownloadPrompt ? handleMouseDown : undefined}
            onMouseMove={state.mediaType === 'image' && !showDownloadPrompt ? handleMouseMove : undefined}
            onMouseUp={state.mediaType === 'image' && !showDownloadPrompt ? handleMouseUp : undefined}
            onMouseLeave={state.mediaType === 'image' && !showDownloadPrompt ? handleMouseUp : undefined}
            onTouchStart={state.mediaType === 'image' && !showDownloadPrompt ? handleTouchStart : undefined}
            onTouchMove={state.mediaType === 'image' && !showDownloadPrompt ? handleTouchMove : undefined}
            onTouchEnd={state.mediaType === 'image' && !showDownloadPrompt ? handleTouchEnd : undefined}
        >
            {/* Native Audio Element for Background Music */}
            {state.mediaType === 'image' && state.metadata?.background_audio?.url && (
                <audio
                    ref={audioRef}
                    src={state.metadata.background_audio.url}
                    loop
                    autoPlay
                    muted={isMuted}
                    playsInline
                    className="hidden"
                    onPlay={() => { }}
                    onError={() => { }}
                />
            )}

            {/* Image Viewer */}
            {state.mediaType === 'image' && (
                <div
                    className="w-full h-full flex items-center justify-center p-0 transition-transform duration-100 ease-out"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                >
                    <img
                        src={state.mediaUrl}
                        alt="عرض كامل"
                        className="max-w-full max-h-full object-contain select-none pointer-events-none"
                        draggable={false}
                    />
                </div>
            )}

            {/* Video Viewer */}
            {state.mediaType === 'video' && (
                <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                    <video
                        src={state.mediaUrl}
                        controls
                        autoPlay
                        className="w-full max-h-[90vh]"
                    />
                </div>
            )}

            {/* Audio Viewer - مع الموجة الصوتية التفاعلية */}
            {state.mediaType === 'audio' && (
                <AudioVisualizer
                    audioUrl={state.mediaUrl}
                    fileName={fileName}
                    onClose={closeMedia}
                />
            )}

            {/* Helper Hint */}
            {state.mediaType === 'image' && scale === 1 && (
                <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-60 animate-pulse z-40 flex flex-col items-center gap-2">
                    {state.metadata?.background_audio?.url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMuted(!isMuted);
                            }}
                            className="bg-black/40 text-cyan-400 px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1.5 border border-cyan-500/30 hover:bg-black/60 transition-colors pointer-events-auto"
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            <span className={`w-2 h-2 bg-cyan-500 rounded-full ${!isMuted ? 'animate-pulse' : ''}`}></span>
                            {isMuted ? 'تم كتم الصوت' : 'صوت في الخلفية'}
                        </button>
                    )}
                    <span className="bg-black/40 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                        انقر مرتين للتكبير
                    </span>
                </div>
            )}

            {/* Controls Overlay - Moved to bottom for Z-Index Safety */}
            <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[110] pointer-events-none ${showDownloadPrompt ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                <button
                    onClick={closeMedia}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all pointer-events-auto"
                >
                    <X size={24} />
                </button>

                <div className="flex gap-2 pointer-events-auto bg-black/50 rounded-lg p-1">
                    {/* Share Button (All types) */}
                    <button
                        onClick={handleShare}
                        className="p-2 text-white hover:text-blue-400 transition-colors"
                        title="مشاركة"
                    >
                        <Share2 size={20} />
                    </button>

                    {/* Open External (Web only) */}
                    {state.mediaType === 'web' && (
                        <button
                            onClick={() => window.open(state.mediaUrl!, '_system')}
                            className="p-2 text-white hover:text-blue-400 border-l border-white/20 ml-1 pl-3"
                            title="فتح في المتصفح"
                        >
                            <ExternalLink size={20} />
                        </button>
                    )}

                    {/* Download Button (Not for Web) */}
                    {state.mediaType !== 'web' && (
                        <button
                            onClick={() => setShowDownloadPrompt(true)}
                            className="p-2 text-white hover:text-green-400 border-l border-white/20 ml-1 pl-3"
                            title="تحميل"
                        >
                            <Download size={20} />
                        </button>
                    )}

                    {state.mediaType === 'image' && (
                        <>
                            <button onClick={() => setScale(s => Math.min(s + 0.5, MAX_SCALE))} className="p-2 text-white hover:text-cyan-400">
                                <ZoomIn size={20} />
                            </button>
                            <button onClick={() => setScale(s => Math.max(s - 0.5, MIN_SCALE))} className="p-2 text-white hover:text-cyan-400">
                                <ZoomOut size={20} />
                            </button>
                            <button onClick={handleDoubleTap} className="p-2 text-white hover:text-cyan-400">
                                {scale > 1 ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Download Filename Prompt Modal */}
            {showDownloadPrompt && (
                <div className="absolute inset-0 flex items-center justify-center z-[120] bg-black/60 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl border border-white/10">
                        <h3 className="text-white text-xl font-bold mb-4 text-center">تحميل الملف</h3>

                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="اسم الملف..."
                            className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 text-right placeholder-gray-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmDownload();
                                if (e.key === 'Escape') setShowDownloadPrompt(false);
                            }}
                        />

                        {/* موقع الحفظ */}
                        <div className="mb-6">
                            <label className="block text-white text-sm font-medium mb-3 text-right">موقع الحفظ:</label>
                            <div className="grid grid-cols-4 gap-2">
                                {/* المعرض - الخيار الأول والافتراضي */}
                                <button
                                    onClick={() => isExternalStorageAvailable && setStorageLocation('gallery')}
                                    disabled={!isExternalStorageAvailable}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${!isExternalStorageAvailable
                                        ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                        : storageLocation === 'gallery'
                                            ? 'bg-green-600/30 border-green-500 text-white'
                                            : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                        }`}
                                    title={!isExternalStorageAvailable ? 'المعرض غير متوفر' : 'حفظ في المعرض'}
                                >
                                    <ImageIcon size={18} />
                                    <span className="text-xs font-medium">المعرض</span>
                                </button>

                                <button
                                    onClick={() => setStorageLocation('documents')}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${storageLocation === 'documents'
                                        ? 'bg-blue-600/30 border-blue-500 text-white'
                                        : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                        }`}
                                >
                                    <FolderOpen size={18} />
                                    <span className="text-xs font-medium">مستندات</span>
                                </button>

                                <button
                                    onClick={() => setStorageLocation('cache')}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${storageLocation === 'cache'
                                        ? 'bg-purple-600/30 border-purple-500 text-white'
                                        : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                        }`}
                                >
                                    <HardDrive size={18} />
                                    <span className="text-xs font-medium">التطبيق</span>
                                </button>

                                <button
                                    onClick={() => isExternalStorageAvailable && setStorageLocation('external')}
                                    disabled={!isExternalStorageAvailable}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${!isExternalStorageAvailable
                                        ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                        : storageLocation === 'external'
                                            ? 'bg-orange-600/30 border-orange-500 text-white'
                                            : 'bg-gray-700/30 border-gray-600 text-gray-300 hover:border-gray-500'
                                        }`}
                                    title={!isExternalStorageAvailable ? 'الذاكرة الخارجية غير متوفرة' : ''}
                                >
                                    <Database size={18} />
                                    <span className="text-xs font-medium">خارجية</span>
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

            {state.mediaType === 'web' && (
                <div className="w-full h-full flex flex-col bg-white overflow-hidden relative">
                    {iframeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-gray-500 font-medium">جاري تحميل الخبر...</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        src={state.mediaUrl}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        title="News Viewer"
                        onLoad={() => setIframeLoading(false)}
                    />
                </div>
            )}
        </div>
    );
};
