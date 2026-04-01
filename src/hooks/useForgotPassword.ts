import { useState } from 'react';
import { supabase } from '../services/supabase';

export type ForgotPasswordStep = 'email' | 'code' | 'password';

export const useForgotPassword = () => {
    const [step, setStep] = useState<ForgotPasswordStep>('email');
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const getErrorMessage = (error: any): string => {
        const msg = error?.message?.toLowerCase() || '';
        if (msg.includes('user not found')) return 'لا يوجد حساب بهذا البريد الإلكتروني';
        if (msg.includes('too many requests')) return 'محاولات كثيرة جداً. يرجى المحاولة بعد قليل';
        if (msg.includes('token has expired') || msg.includes('invalid token')) return 'الرمز غير صحيح أو منتهي الصلاحية';
        if (msg.includes('password') && msg.includes('weak')) return 'كلمة المرور ضعيفة جداً';
        return msg || 'حدث خطأ غير متوقع';
    };

    // 1. Send Reset Email
    const sendResetEmail = async (emailInput: string) => {
        setError(null);
        setSuccessMessage(null);

        if (!emailInput) {
            setError('يرجى إدخال البريد الإلكتروني');
            return false;
        }

        if (!validateEmail(emailInput)) {
            setError('يرجى إدخال بريد إلكتروني صالح');
            return false;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(emailInput);
            if (error) throw error;

            setSuccessMessage(`تم إرسال رمز التحقق إلى ${emailInput}`);
            setEmail(emailInput);
            setStep('code');
            return true;
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(getErrorMessage(err));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 2. Verify Code
    const verifyCode = async () => {
        setError(null);
        setSuccessMessage(null);

        if (resetCode.length < 6) {
            setError('الرمز يجب أن يتكون من 6 أرقام');
            return false;
        }

        setLoading(true);
        try {
            // تعيين علامة لإخبار التطبيق بأننا في وضع استعادة كلمة المرور
            // هذا سيمنع التوجيه التلقائي إلى الصفحة الرئيسية بعد تسجيل الدخول
            sessionStorage.setItem('shamil_recovery_mode', 'true');

            const { error } = await supabase.auth.verifyOtp({
                email,
                token: resetCode,
                type: 'recovery'
            });

            if (error) throw error;

            setStep('password');
            setSuccessMessage('تم التحقق من الرمز بنجاح. يرجى تعيين كلمة مرور جديدة.');
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 3. Reset Password
    const resetPassword = async () => {
        setError(null);
        setSuccessMessage(null);

        if (newPassword.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return false;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccessMessage('تم تغيير كلمة المرور بنجاح! سيتم تحويلك لتسجيل الدخول.');
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetState = () => {
        setStep('email');
        setEmail('');
        setResetCode('');
        setNewPassword('');
        setError(null);
        setSuccessMessage(null);
    };

    return {
        step,
        setStep,
        email,
        setEmail,
        resetCode,
        setResetCode,
        newPassword,
        setNewPassword,
        loading,
        error,
        successMessage,
        sendResetEmail,
        verifyCode,
        resetPassword,
        resetState
    };
};
