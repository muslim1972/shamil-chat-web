import React from 'react';
import { Mail, ArrowLeft, Lock } from 'lucide-react';
import { useForgotPassword } from '../../hooks/useForgotPassword';

interface ForgotPasswordFlowProps {
    onBack: () => void;
    onSuccess: (email: string) => void;
}

const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({ onBack, onSuccess }) => {
    const {
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
    } = useForgotPassword();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 'email') {
            await sendResetEmail(email);
        } else if (step === 'code') {
            await verifyCode();
        } else if (step === 'password') {
            const success = await resetPassword();
            if (success) {
                setTimeout(() => {
                    onSuccess(email);
                }, 2000);
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100" dir="rtl">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md transition-all duration-300 ease-in-out">
                <div className="flex items-center gap-2 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        type="button"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">استعادة كلمة المرور</h2>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>

                    {/* Step 1: Email */}
                    {step === 'email' && (
                        <div>
                            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                                    placeholder="example@domain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Code */}
                    {step === 'code' && (
                        <div>
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-600">أدخل الرمز الذي تم إرساله إلى {email}</p>
                            </div>
                            <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-1">
                                رمز التحقق (6 أرقام)
                            </label>
                            <div className="relative">
                                <input
                                    id="reset-code"
                                    type="text"
                                    maxLength={6}
                                    className="block w-full px-3 py-2 text-center tracking-widest text-2xl border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="000000"
                                    value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: New Password */}
                    {step === 'password' && (
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                                كلمة المرور الجديدة
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="new-password"
                                    type="password"
                                    className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="********"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">{error}</div>}
                    {successMessage && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100">{successMessage}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${step === 'password' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                    >
                        {loading && <span className="ml-2">⏳</span>}
                        {step === 'email' && (loading ? 'جاري الإرسال...' : 'إرسال الرمز')}
                        {step === 'code' && (loading ? 'جاري التحقق...' : 'تحقق من الرمز')}
                        {step === 'password' && (loading ? 'جاري التحديث...' : 'تغيير كلمة المرور وتسجيل الدخول')}
                    </button>

                    {step === 'code' && (
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="w-full text-sm text-indigo-600 hover:text-indigo-500 mt-2"
                        >
                            تغيير البريد الإلكتروني أو إعادة الإرسال
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordFlow;
