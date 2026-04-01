import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase'; // ✅ تم تصحيح المسار
import { Eye, EyeOff } from 'lucide-react';
import ForgotPasswordFlow from './auth/ForgotPasswordFlow'; // استيراد المكون الجديد

const AuthScreen: React.FC = () => {
  // الحالات الأساسية
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // حالة نسيت كلمة المرور

  // بيانات الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // حالات التحميل والأخطاء
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { signIn, signUp } = useAuth();

  // دالة لتحويل أخطاء Supabase إلى رسائل مفهومة بالعربية
  const getErrorMessage = (error: any): string => {
    const errorMessage = error?.message?.toLowerCase() || '';

    // أخطاء تسجيل الدخول
    if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }

    if (errorMessage.includes('email not confirmed')) {
      return 'يرجى تأكيد بريدك الإلكتروني أولاً';
    }

    if (errorMessage.includes('user not found')) {
      return 'لا يوجد حساب بهذا البريد الإلكتروني';
    }

    if (errorMessage.includes('user already registered') ||
      errorMessage.includes('email already exists')) {
      return 'البريد الإلكتروني مستخدم بالفعل';
    }

    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return 'كلمة المرور ضعيفة جداً';
    }

    if (errorMessage.includes('too many requests')) {
      return 'محاولات كثيرة جداً. يرجى المحاولة بعد قليل';
    }

    // أخطاء الشبكة
    if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cannot connect')) {
      return 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت';
    }

    if (errorMessage.includes('timeout')) {
      return 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى';
    }

    // رسالة افتراضية للأخطاء غير المعروفة
    return errorMessage || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // معالجة تسجيل الدخول / إنشاء الحساب
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات قبل الإرسال
    if (!validateEmail(email)) {
      setError('الرجاء إدخال بريد إلكتروني صالح');
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }

    if (!isLogin && name.trim().length < 3) {
      setError('يجب أن يتكون الاسم من 3 أحرف على الأقل');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      // On success, the AuthProvider will handle navigation
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = isLogin
    ? !validateEmail(email) || password.length < 6 || loading
    : !validateEmail(email) || password.length < 6 || name.trim().length < 3 || loading;


  // ✅ إذا كان في وضع "نسيت كلمة المرور"، نعرض المكون المنفصل
  if (isForgotPassword) {
    return (
      <ForgotPasswordFlow
        onBack={() => setIsForgotPassword(false)}
        onSuccess={(recoveredEmail) => {
          // عند النجاح، نعود لواجهة الدخول ونملأ البريد
          setIsForgotPassword(false);
          setEmail(recoveredEmail);
          setPassword('');
        }}
      />
    );
  }

  // واجهة تسجيل الدخول الأصلية
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        <form className="space-y-6" onSubmit={handleAuth}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                الاسم
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
            </div>

            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10 text-slate-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري...' : isLogin ? 'دخول' : 'إنشاء حساب'}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-indigo-600 hover:underline"
          >
            {isLogin ? 'أنشئ حسابًا' : 'سجل الدخول'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;

