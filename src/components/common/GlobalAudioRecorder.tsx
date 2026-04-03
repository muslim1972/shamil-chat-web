import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Check, Play, Pause, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlobalAudioRecorderProps {
    onRecordingComplete: (blob: Blob, duration: number) => void;
    onCancel?: () => void;
    maxDuration?: number; // ms
}

export const GlobalAudioRecorder: React.FC<GlobalAudioRecorderProps> = ({
    onRecordingComplete,
    onCancel,
    maxDuration = 60000 // 60s default
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Format duration mm:ss
    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Robust MIME Type Detection
            let mimeType = '';
            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/aac',
                'audio/ogg'
            ];

            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }
            console.log('🎙️ [GlobalAudioRecorder] Using MIME type:', mimeType || 'default');

            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                console.log('⏹️ [GlobalAudioRecorder] Stopped. Chunks:', audioChunksRef.current.length);
                const finalType = recorder.mimeType || mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, { type: finalType });
                setAudioBlob(blob);

                // Cleanup stream
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start(200);
            setIsRecording(true);
            setAudioBlob(null);
            startTimeRef.current = Date.now();

            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setDuration(elapsed);

                if (elapsed >= maxDuration) {
                    stopRecording();
                }
            }, 100);

        } catch (err) {
            console.error('Failed to start recording', err);
            toast.error('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        setDuration(0);
        if (onCancel) onCancel();
    };

    const togglePreview = () => {
        if (!audioBlob) return;

        if (isPlayingPreview) {
            audioPlayerRef.current?.pause();
            setIsPlayingPreview(false);
        } else {
            if (!audioPlayerRef.current) {
                audioPlayerRef.current = new Audio(URL.createObjectURL(audioBlob));
                audioPlayerRef.current.onended = () => setIsPlayingPreview(false);
            }
            audioPlayerRef.current.play();
            setIsPlayingPreview(true);
        }
    };

    const handleConfirm = () => {
        if (audioBlob) {
            onRecordingComplete(audioBlob, duration);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }
        };
    }, []);

    // Visualizer Bars (Simulated)
    const renderVisualizer = () => {
        return (
            <div className="flex items-center justify-center gap-1 h-8 mx-4">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1 bg-red-500 rounded-full animate-pulse"
                        style={{
                            height: isRecording ? `${Math.random() * 100}%` : '20%',
                            animationDuration: `${Math.random() * 0.5 + 0.2}s`
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="w-full bg-gray-900 rounded-xl p-4 border border-gray-800">
            {!isRecording && !audioBlob ? (
                // Initial State
                <div className="flex flex-col items-center gap-3">
                    <button
                        onClick={startRecording}
                        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-red-900/50"
                    >
                        <Mic className="text-white w-8 h-8" />
                    </button>
                    <span className="text-gray-400 text-sm">اضغط للتسجيل</span>
                </div>
            ) : isRecording ? (
                // Recording State
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
                    </div>

                    {renderVisualizer()}

                    <button
                        onClick={stopRecording}
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center border border-gray-600"
                    >
                        <Square className="text-white w-4 h-4 fill-current" />
                    </button>
                </div>
            ) : (
                // Preview State
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePreview}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200"
                        >
                            {isPlayingPreview ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">تسجيل صوتي</span>
                            <span className="text-gray-400 text-xs">{formatDuration(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAudioBlob(null)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="إعادة التسجيل"
                        >
                            <RefreshCcw size={20} />
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white shadow-lg shadow-green-900/50"
                        >
                            <Check size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
