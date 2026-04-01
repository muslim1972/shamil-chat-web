import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Sparkles } from 'lucide-react';
import { useTheme, type ColorScheme } from '../../context/ThemeContext';

const ThemeSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { mode, colorScheme, toggleMode, setColorScheme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll to top عند فتح الصفحة
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        window.scrollTo(0, 0);
    }, []);

    const colorSchemes: Array<{
        id: ColorScheme;
        name: string;
        description: string;
        colors: string[];
        gradient: string;
        isNew?: boolean;
    }> = [
            {
                id: 'shamil',
                name: 'شامل - Shamil',
                description: 'خلفية متحركة ✨ ألوان أرجوانية وزرقاء',
                colors: ['#8B5CF6', '#3B82F6', '#9333EA'],
                gradient: 'from-purple-600 to-blue-600',
                isNew: true
            },
            {
                id: 'default',
                name: 'الافتراضي',
                description: 'ألوان متوازنة - أزرق وبنفسجي',
                colors: ['#6366f1', '#8b5cf6', '#3b82f6'],
                gradient: 'from-indigo-500 to-purple-500'
            },
            {
                id: 'cold',
                name: 'بارد',
                description: 'ألوان باردة - أزرق وتركواز',
                colors: ['#0ea5e9', '#06b6d4', '#14b8a6'],
                gradient: 'from-sky-500 to-cyan-500'
            },
            {
                id: 'warm',
                name: 'دافئ',
                description: 'ألوان دافئة - برتقالي وأحمر',
                colors: ['#f97316', '#ef4444', '#f59e0b'],
                gradient: 'from-orange-500 to-red-500'
            },
            {
                id: 'youthful',
                name: 'حيوي',
                description: 'ألوان زاهية ومرحة',
                colors: ['#ec4899', '#10b981', '#a855f7'],
                gradient: 'from-pink-500 to-emerald-500'
            }
        ];

    return (
        <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-all duration-500">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
                            aria-label="العودة"
                        >
                            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                <Sparkles className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">المظهر والألوان</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">خصص تطبيقك كما تحب</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* المحتوى */}
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* Dark/Light Mode */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden relative">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            {mode === 'dark' ? <Moon className="text-indigo-500" size={28} /> : <Sun className="text-amber-500" size={28} />}
                            الوضع {mode === 'dark' ? 'المظلم' : 'الفاتح'}
                        </h2>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl ${mode === 'dark' ? 'bg-indigo-500/20' : 'bg-amber-500/20'} transition-all duration-500`}>
                                    {mode === 'dark' ? (
                                        <Moon size={40} className="text-indigo-400 animate-pulse" />
                                    ) : (
                                        <Sun size={40} className="text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                                        {mode === 'dark' ? 'الوضع المظلم مُفعّل' : 'الوضع الفاتح مُفعّل'}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {mode === 'dark' ? '🌙 مريح للعينين في الليل' : '☀️ واضح ومشرق'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={toggleMode}
                                className={`
                  px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 
                  transform hover:scale-105 active:scale-95 shadow-lg
                  ${mode === 'dark'
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                        : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
                                    }
                `}
                            >
                                تبديل الوضع
                            </button>
                        </div>
                    </div>
                </div>

                {/* Color Schemes */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Sparkles className="text-purple-500" size={28} />
                        مخطط الألوان
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {colorSchemes.map((scheme) => (
                            <button
                                key={scheme.id}
                                onClick={() => setColorScheme(scheme.id)}
                                className={`
                  group relative p-6 rounded-2xl border-3 transition-all duration-300
                  transform hover:scale-105 active:scale-95 text-right
                  ${colorScheme === scheme.id
                                        ? 'border-transparent bg-gradient-to-br ' + scheme.gradient + ' shadow-2xl'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                                    }
                `}
                            >
                                {colorScheme === scheme.id && (
                                    <div className="absolute inset-0 bg-white/10 dark:bg-black/20 rounded-2xl"></div>
                                )}

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`
                      w-7 h-7 rounded-full border-4 flex items-center justify-center transition-all duration-300
                      ${colorScheme === scheme.id
                                                ? 'border-white bg-white'
                                                : 'border-gray-300 dark:border-gray-600'
                                            }
                    `}>
                                            {colorScheme === scheme.id && (
                                                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500"></div>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <p className={`font-black text-xl ${colorScheme === scheme.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                    {scheme.name}
                                                </p>
                                                {scheme.isNew && (
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full animate-pulse">
                                                        جديد!
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm ${colorScheme === scheme.id ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {scheme.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        {scheme.colors.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-12 h-12 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                                                style={{
                                                    backgroundColor: color,
                                                    transitionDelay: `${idx * 50}ms`
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* معاينة حية */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">معاينة مباشرة</h2>

                    <div className="space-y-4">
                        <div className="flex gap-4 flex-wrap">
                            <button
                                className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all"
                                style={{ background: 'var(--primary)' }}
                            >
                                زر أساسي
                            </button>
                            <button
                                className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all"
                                style={{ background: 'var(--secondary)' }}
                            >
                                زر ثانوي
                            </button>
                            <button
                                className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all"
                                style={{ background: 'var(--accent)' }}
                            >
                                زر مميز
                            </button>
                        </div>

                        <div
                            className="p-6 rounded-xl border-2 text-white"
                            style={{
                                background: 'var(--gradient-primary)',
                                borderColor: 'var(--primary)'
                            }}
                        >
                            <p className="font-bold text-lg">✨ بطاقة مع Gradient</p>
                            <p className="text-white/90 text-sm mt-1">هذه البطاقة تستخدم ألوان الثيم الحالي</p>
                        </div>

                        <div
                            className="p-6 rounded-xl border-r-4 shadow-sm"
                            style={{
                                backgroundColor: 'var(--conversation-card-hover)',
                                borderRightColor: 'var(--primary)',
                                color: 'var(--shagram-text)'
                            }}
                        >
                            <div className="relative z-10">
                                <p className="font-bold text-lg" style={{ color: 'var(--primary)' }}>
                                    📢 رسالة نموذجية
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--shagram-text-muted)' }}>
                                    تظهر بألوان الثيم المختار في PWA.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* زر استعادة الإعدادات */}
                <div className="flex justify-center">
                    <button
                        onClick={() => {
                            setColorScheme('default');
                        }}
                        className="px-8 py-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                        🔄 استعادة الإعدادات الافتراضية
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeSettingsPage;
