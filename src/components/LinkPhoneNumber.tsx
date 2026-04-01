import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { Phone, Check, RefreshCw } from 'lucide-react';

// معرف فريد لكل instance لتجنب التعارض
let recaptchaInstanceId = 0;

const LinkPhoneNumber: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [currentPhone, setCurrentPhone] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'verify' | 'linked'>('input');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaReady, setRecaptchaReady] = useState(false);

    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const instanceIdRef = useRef<number>(0);

    const { user, checkPhoneNumberExists, linkPhoneNumber } = useAuth();

    // تحميل رقم الهاتف الحالي
    useEffect(() => {
        if (user) {
            loadCurrentPhone();
        }
    }, [user]);

    const loadCurrentPhone = async () => {
        if (!user) return;
        try {
            const result = await checkPhoneNumberExists(user.id);
            if (result.exists && result.phoneNumber) {
                setCurrentPhone(result.phoneNumber);
                setStep('linked');
            }
        } catch (err) {
            console.error('Error loading phone:', err);
        }
    };

    // تنظيف RecaptchaVerifier بشكل آمن
    const cleanupRecaptcha = useCallback(() => {
        if (recaptchaVerifierRef.current) {
            try {
                recaptchaVerifierRef.current.clear();
            } catch (e) {
                console.warn('Cleanup warning:', e);
            }
            recaptchaVerifierRef.current = null;
        }
        setRecaptchaReady(false);
    }, []);

    // إنشاء RecaptchaVerifier جديد
    const initRecaptcha = useCallback(() => {
        // تنظيف أي نسخة سابقة أولاً
        cleanupRecaptcha();

        // إنشاء معرف فريد لهذه النسخة
        instanceIdRef.current = ++recaptchaInstanceId;
        const currentInstanceId = instanceIdRef.current;

        // تأخير بسيط للتأكد من أن DOM جاهز
        requestAnimationFrame(() => {
            // التحقق من أن هذه لا تزال النسخة الحالية
            if (currentInstanceId !== instanceIdRef.current) return;

            const container = recaptchaContainerRef.current;
            if (!container) {
                console.warn('Recaptcha container not found');
                return;
            }

            // تنظيف محتوى الـ container
            container.innerHTML = '';

            // إنشاء عنصر جديد داخل الـ container
            const recaptchaElement = document.createElement('div');
            recaptchaElement.id = `recaptcha-widget-${currentInstanceId}`;
            container.appendChild(recaptchaElement);

            try {
                const verifier = new RecaptchaVerifier(auth, recaptchaElement, {
                    size: 'invisible',
                    callback: () => {
                        console.log('✅ Recaptcha verified successfully');
                    },
                    'expired-callback': () => {
                        console.warn('⚠️ Recaptcha expired');
                        setError('انتهت صلاحية التحقق، اضغط "إعادة المحاولة"');
                        cleanupRecaptcha();
                    }
                });

                recaptchaVerifierRef.current = verifier;
                setRecaptchaReady(true);
                console.log('✅ RecaptchaVerifier initialized');
            } catch (err) {
                console.error('❌ RecaptchaVerifier init error:', err);
                setError('فشل تهيئة التحقق الأمني. جرب إعادة المحاولة.');
            }
        });
    }, [cleanupRecaptcha]);

    // تهيئة Recaptcha عند عرض مرحلة الإدخال
    useEffect(() => {
        if (step === 'input') {
            // تأخير بسيط لضمان render
            const timer = setTimeout(() => {
                initRecaptcha();
            }, 100);
            return () => clearTimeout(timer);
        }
        return () => {
            // لا نقوم بالتنظيف عند تغيير الـ step لأننا قد نحتاج الـ token
        };
    }, [step, initRecaptcha]);

    // تنظيف عند unmount
    useEffect(() => {
        return () => {
            cleanupRecaptcha();
        };
    }, [cleanupRecaptcha]);

    const handleSendOTP = async () => {
        if (!phoneNumber.startsWith('+')) {
            setError('رقم الهاتف يجب أن يبدأ بـ + ورمز البلد (مثال: +964xxxxxxxxx)');
            return;
        }

        if (!recaptchaVerifierRef.current) {
            setError('التحقق الأمني غير جاهز. اضغط "إعادة المحاولة".');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('📞 Sending OTP to:', phoneNumber);
            const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current);
            setConfirmationResult(result);
            setStep('verify');
            console.log('✅ OTP sent successfully');
        } catch (err: any) {
            console.error('❌ Send OTP Error:', err);

            // رسائل خطأ مفهومة
            let errorMessage = 'فشل إرسال رمز التحقق';
            if (err.code === 'auth/invalid-app-credential') {
                errorMessage = 'خطأ في إعدادات التطبيق. تحقق من SHA-1/SHA-256 في Firebase Console.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'طلبات كثيرة جداً. انتظر دقيقة وحاول مرة أخرى.';
            } else if (err.code === 'auth/invalid-phone-number') {
                errorMessage = 'رقم الهاتف غير صالح. تأكد من الصيغة الدولية.';
            } else if (err.code === 'auth/quota-exceeded') {
                errorMessage = 'تم تجاوز حد الرسائل اليومي. حاول غداً.';
            } else if (err.message) {
                errorMessage = `فشل: ${err.code || err.message}`;
            }

            setError(errorMessage);

            // تنظيف وإعادة تهيئة الـ Recaptcha للمحاولة القادمة
            cleanupRecaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        initRecaptcha();
    };

    const handleVerifyOTP = async () => {
        if (!confirmationResult || otp.length !== 6) {
            setError('يجب إدخال رمز مكون من 6 أرقام');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await confirmationResult.confirm(otp);
            console.log('✅ OTP verified');

            if (user) {
                await linkPhoneNumber(phoneNumber, user.id);
                setCurrentPhone(phoneNumber);
                setStep('linked');
                setPhoneNumber('');
                setOtp('');
                cleanupRecaptcha();
            }
        } catch (err: any) {
            console.error('❌ Verify OTP Error:', err);
            if (err.code === 'auth/invalid-verification-code') {
                setError('رمز التحقق غير صحيح');
            } else if (err.code === 'auth/code-expired') {
                setError('انتهت صلاحية الرمز. أعد إرسال الرمز.');
            } else {
                setError('فشل التحقق. حاول مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setStep('input');
        setPhoneNumber(currentPhone || '');
        setOtp('');
        setError(null);
        setConfirmationResult(null);
    };

    const handleCancel = () => {
        if (currentPhone) {
            setStep('linked');
        }
        setPhoneNumber('');
        setOtp('');
        setError(null);
        cleanupRecaptcha();
    };

    const handleBackToInput = () => {
        setStep('input');
        setOtp('');
        setError(null);
        setConfirmationResult(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                    <Phone className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">رقم الهاتف</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">للأمان الإضافي (2FA) واستعادة الحساب</p>
                </div>
            </div>

            {/* Recaptcha Container - دائماً موجود في DOM */}
            <div
                ref={recaptchaContainerRef}
                className="recaptcha-container"
                style={{ position: 'absolute', left: '-9999px' }}
            />

            {step === 'linked' && currentPhone && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2">
                            <Check className="text-green-600 dark:text-green-400" size={18} />
                            <span className="text-sm font-mono text-green-700 dark:text-green-300" dir="ltr">{currentPhone}</span>
                        </div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">مُربوط</span>
                    </div>
                    <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                    >
                        تغيير رقم الهاتف
                    </button>
                </div>
            )}

            {step === 'input' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رقم الهاتف بالصيغة الدولية
                        </label>
                        <input
                            id="phone-input"
                            type="tel"
                            dir="ltr"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+964xxxxxxxxx"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">مثال: +9647XXXXXXXX</p>
                    </div>

                    {/* مؤشر حالة Recaptcha */}
                    {!recaptchaReady && !error && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin" />
                            جاري تهيئة التحقق الأمني...
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                            <button
                                onClick={handleRetry}
                                className="block mt-2 text-xs underline hover:no-underline"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {currentPhone && (
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                إلغاء
                            </button>
                        )}
                        <button
                            onClick={handleSendOTP}
                            disabled={loading || !phoneNumber || !recaptchaReady}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'verify' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">تم إرسال رمز التحقق إلى:</p>
                        <p className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100 mt-1" dir="ltr">{phoneNumber}</p>
                    </div>

                    <div>
                        <label htmlFor="otp-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رمز التحقق (OTP)
                        </label>
                        <input
                            id="otp-input"
                            type="text"
                            maxLength={6}
                            dir="ltr"
                            autoFocus
                            className="w-full px-4 py-3 border-2 border-green-500 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-center text-2xl font-mono tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleBackToInput}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                            إعادة إرسال
                        </button>
                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'جاري التحقق...' : 'تأكيد'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LinkPhoneNumber;
