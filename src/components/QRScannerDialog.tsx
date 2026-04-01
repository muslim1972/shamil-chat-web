import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Loader2, ImageIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { parseQRData, searchUserByQRData } from '@/utils/qrScannerUtils';
import toast from 'react-hot-toast';

interface QRScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUserFound: (userId: string) => void;
}

export const QRScannerDialog: React.FC<QRScannerDialogProps> = ({
    open,
    onOpenChange,
    onUserFound
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const isNative = Capacitor.isNativePlatform();

    // ============ معالجة صورة من المعرض ============
    const processImageFile = useCallback(async (file: File) => {
        setIsProcessing(true);

        try {
            const img = new Image();
            const url = URL.createObjectURL(file);

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('فشل تحميل الصورة'));
                img.src = url;
            });

            // تصغير الصورة إذا كانت كبيرة
            const maxSize = 1500;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('فشل إنشاء canvas');

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            URL.revokeObjectURL(url);

            // محاولات متعددة لقراءة QR
            let qrContent: string | null = null;

            // المحاولة 1: الصورة الأصلية
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) qrContent = code.data;

            // المحاولة 2: تحويل لـ grayscale مع زيادة التباين
            if (!qrContent) {
                ctx.drawImage(img, 0, 0, width, height);
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const contrast = 1.5;
                    const adjusted = ((gray - 128) * contrast) + 128;
                    const final = Math.max(0, Math.min(255, adjusted));
                    data[i] = data[i + 1] = data[i + 2] = final;
                }
                ctx.putImageData(imageData, 0, 0);
                code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) qrContent = code.data;
            }

            // المحاولة 3: عتبة ثنائية
            if (!qrContent) {
                ctx.drawImage(img, 0, 0, width, height);
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const threshold = 128;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const binary = gray > threshold ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = binary;
                }
                ctx.putImageData(imageData, 0, 0);
                code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) qrContent = code.data;
            }

            if (qrContent) {
                const qrData = parseQRData(qrContent);

                if (qrData && (qrData.username || qrData.email)) {
                    toast.loading('جاري البحث عن المستخدم...');
                    const result = await searchUserByQRData(qrData);
                    toast.dismiss();

                    if (result.found && result.userId) {
                        toast.success(`تم العثور على: ${result.username}`);
                        onOpenChange(false);
                        onUserFound(result.userId);
                    } else {
                        toast.error(result.error || 'لم يتم العثور على المستخدم');
                    }
                } else {
                    toast.error('رمز QR غير صالح أو غير معروف');
                }
            } else {
                toast.error('لم يتم العثور على رمز QR في الصورة');
            }
        } catch (error: any) {
            console.error('Error processing image:', error);
            toast.error('فشل معالجة الصورة');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [onOpenChange, onUserFound]);

    const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    }, [processImageFile]);

    // ============ Web Scanner (للمتصفح فقط) ============
    const startWebCamera = useCallback(async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsScanning(true);
            }
        } catch (error: any) {
            console.error('Camera error:', error);

            if (error.name === 'NotAllowedError') {
                setCameraError('تم رفض إذن الوصول للكاميرا.');
            } else if (error.name === 'NotFoundError') {
                setCameraError('لم يتم العثور على كاميرا.');
            } else {
                setCameraError('فشل فتح الكاميرا.');
            }
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setIsScanning(false);
    }, []);

    // مسح QR من الفيديو (للويب فقط)
    const scanFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !isScanning || isProcessing) {
            animationRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
            animationRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            setIsProcessing(true);

            const qrData = parseQRData(code.data);

            if (qrData && (qrData.username || qrData.email)) {
                toast.loading('جاري البحث عن المستخدم...');

                const result = await searchUserByQRData(qrData);
                toast.dismiss();

                if (result.found && result.userId) {
                    toast.success(`تم العثور على: ${result.username}`);
                    stopCamera();
                    onOpenChange(false);
                    onUserFound(result.userId);
                } else {
                    toast.error(result.error || 'لم يتم العثور على المستخدم');
                    setIsProcessing(false);
                }
            } else {
                toast.error('رمز QR غير صالح');
                setIsProcessing(false);
            }
        }

        animationRef.current = requestAnimationFrame(scanFrame);
    }, [isScanning, isProcessing, stopCamera, onOpenChange, onUserFound]);

    // ============ Effects ============
    useEffect(() => {
        if (open && !isNative) {
            startWebCamera();
        } else if (!open) {
            stopCamera();
        }

        return () => stopCamera();
    }, [open, isNative, startWebCamera, stopCamera]);

    useEffect(() => {
        if (isScanning && !isNative) {
            animationRef.current = requestAnimationFrame(scanFrame);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isScanning, scanFrame, isNative]);

    // ============ Render ============

    // Hidden file input
    const fileInput = (
        <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
        />
    );

    // على الموبايل: فقط اختيار من المعرض
    if (isNative) {
        return (
            <>
                {fileInput}
                <Dialog open={open} onOpenChange={onOpenChange}>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl p-0 overflow-hidden">
                        <DialogHeader className="p-4 pb-2">
                            <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                                <ImageIcon size={20} />
                                مسح رمز QR
                            </DialogTitle>
                            <DialogDescription className="text-center text-sm text-gray-500 dark:text-gray-400">
                                اختر صورة QR من المعرض
                            </DialogDescription>
                        </DialogHeader>

                        <div className="relative aspect-square bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center p-6 text-center">
                            {isProcessing ? (
                                <>
                                    <Loader2 size={48} className="text-white animate-spin mb-4" />
                                    <p className="text-white font-medium">جاري قراءة الرمز...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mb-6">
                                        <ImageIcon size={48} className="text-white" />
                                    </div>
                                    <p className="text-white/80 text-sm mb-6">
                                        اختر صورة تحتوي على رمز QR<br />
                                        من المعرض أو الملفات
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-3 text-lg font-medium shadow-lg"
                                    >
                                        <ImageIcon size={24} />
                                        اختر صورة
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                            💡 نصيحة: احفظ صورة QR في المعرض أولاً
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // على الويب: كاميرا مباشرة + خيار المعرض
    return (
        <>
            {fileInput}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-2">
                        <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                            <Camera size={20} />
                            مسح رمز QR
                        </DialogTitle>
                        <DialogDescription className="text-center text-sm text-gray-500 dark:text-gray-400">
                            وجّه الكاميرا نحو رمز QR أو اختر صورة
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative aspect-square bg-black">
                        {cameraError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                                    <X size={32} className="text-red-500" />
                                </div>
                                <p className="text-red-500 dark:text-red-400 font-medium mb-4">{cameraError}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={startWebCamera}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        إعادة المحاولة
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                    >
                                        اختر صورة
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    playsInline
                                    muted
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* إطار المسح */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 border-2 border-white rounded-2xl relative">
                                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                                    </div>
                                </div>

                                {/* زر اختيار صورة */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-full flex items-center gap-2 hover:bg-white/30"
                                >
                                    <ImageIcon size={18} />
                                    اختر من المعرض
                                </button>

                                {/* مؤشر التحميل */}
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={32} className="text-white animate-spin" />
                                            <span className="text-white text-sm">جاري البحث...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        ضع رمز QR داخل الإطار للمسح التلقائي
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default QRScannerDialog;
