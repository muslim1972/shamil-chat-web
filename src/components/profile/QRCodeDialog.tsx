import React, { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { RefreshCw, Copy, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { generateQRData, copyQRToClipboard, canvasToDataUrl } from '@/utils/qrUtils';
import toast from 'react-hot-toast';

interface QRCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    username: string;
    email: string;
    existingQR: string | null;
    onQRGenerated: (qrDataUrl: string) => Promise<void>;
}

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({
    open,
    onOpenChange,
    username,
    email,
    existingQR,
    onQRGenerated
}) => {
    const qrRef = useRef<HTMLDivElement>(null);
    const [currentQR, setCurrentQR] = useState<string | null>(existingQR);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    // تحديث QR عند تغيير existingQR
    useEffect(() => {
        setCurrentQR(existingQR);
    }, [existingQR]);

    // البيانات للـ QR
    const qrData = generateQRData(username, email);

    // دالة إعادة تكوين QR
    const handleRegenerate = async () => {
        setIsGenerating(true);
        try {
            // انتظار رسم الـ Canvas
            await new Promise(resolve => requestAnimationFrame(resolve));

            const canvas = qrRef.current?.querySelector('canvas');
            if (canvas) {
                const dataUrl = canvasToDataUrl(canvas);
                setCurrentQR(dataUrl);
                await onQRGenerated(dataUrl);
                toast.success('تم تكوين رمز QR بنجاح ✅');
            }
        } catch (error) {
            console.error('Error regenerating QR:', error);
            toast.error('فشل تكوين رمز QR');
        } finally {
            setIsGenerating(false);
        }
    };

    // دالة النسخ
    const handleCopy = async () => {
        if (!currentQR) {
            toast.error('لا يوجد رمز QR للنسخ');
            return;
        }
        setIsCopying(true);
        try {
            await copyQRToClipboard(currentQR);
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-lg font-bold text-gray-900 dark:text-white">
                        رمز QR الخاص بك
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        عرض وإدارة رمز QR الخاص بملفك الشخصي
                    </DialogDescription>
                </DialogHeader>

                {/* منطقة عرض QR */}
                <div className="flex flex-col items-center justify-center py-6">
                    {currentQR ? (
                        // عرض QR المحفوظ
                        <div className="p-4 bg-white rounded-xl shadow-inner">
                            <img
                                src={currentQR}
                                alt="QR Code"
                                className="w-48 h-48 object-contain"
                            />
                        </div>
                    ) : (
                        // رسالة عدم وجود QR
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-700 rounded-xl">
                            <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                                لا يوجد رمز QR محفوظ
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                                انقر على "إعادة تكوين" لإنشاء رمز جديد
                            </p>
                        </div>
                    )}

                    {/* Canvas مخفي لتوليد QR */}
                    <div ref={qrRef} className="hidden">
                        <QRCodeCanvas
                            value={qrData}
                            size={256}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </div>
                </div>

                {/* معلومات المستخدم */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <p className="font-medium text-gray-700 dark:text-gray-300">{username}</p>
                    <p>{email}</p>
                </div>

                {/* الأزرار */}
                <div className="flex gap-3 justify-center">
                    {/* زر إعادة التكوين */}
                    <button
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors"
                    >
                        {isGenerating ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <RefreshCw size={18} />
                        )}
                        <span>إعادة تكوين</span>
                    </button>

                    {/* زر النسخ */}
                    <button
                        onClick={handleCopy}
                        disabled={!currentQR || isCopying}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors"
                    >
                        {isCopying ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Copy size={18} />
                        )}
                        <span>نسخ</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QRCodeDialog;
