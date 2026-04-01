import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SmartTypingIndicator from './SmartTypingIndicator';
import type { IndicatorType } from './SmartTypingIndicator';
import { X, Palette } from 'lucide-react';
import { useChatBackground, type ChatBackground } from '../../context/ChatBackgroundContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

const colors = [
    { name: 'Indigo', hex: '#4F46E5' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#10B981' },
    { name: 'Pink', hex: '#EC4899' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Purple', hex: '#8B5CF6' },
];

const TypingSettingsPage = () => {
    const { user } = useAuth();
    const [selectedStyle, setSelectedStyle] = useState<IndicatorType>('plane');
    const [selectedColor, setSelectedColor] = useState(colors[0].hex);
    const [textScale, setTextScale] = useState(1.0);
    const [iconScale, setIconScale] = useState(1.0);
    const [modalScale, setModalScale] = useState(1.0);
    const navigate = useNavigate();
    const { background, setBackground } = useChatBackground();

    // تعريفات الخلفيات
    const backgrounds: Array<{ id: ChatBackground; name: string; emoji: string; category: 'solid' | 'gradient' | 'pattern' }> = [
        { id: 'default', name: 'افتراضي', emoji: '⚪', category: 'solid' },
        { id: 'light-blue', name: 'أزرق هادئ', emoji: '💙', category: 'solid' },
        { id: 'warm-cream', name: 'كريمي دافئ', emoji: '🟡', category: 'solid' },
        { id: 'soft-green', name: 'أخضر ناعم', emoji: '💚', category: 'solid' },
        { id: 'lavender', name: 'لافندر', emoji: '💜', category: 'solid' },
        { id: 'gradient-sunset', name: 'غروب الشمس', emoji: '🌅', category: 'gradient' },
        { id: 'gradient-ocean', name: 'المحيط', emoji: '🌊', category: 'gradient' },
        { id: 'gradient-forest', name: 'الغابة', emoji: '🌲', category: 'gradient' },
        { id: 'pattern-dots', name: 'نقاط', emoji: '⚫', category: 'pattern' },
        { id: 'pattern-waves', name: 'أمواج', emoji: '〰️', category: 'pattern' },
        { id: 'pattern-geometric', name: 'هندسي', emoji: '◆', category: 'pattern' },
        { id: 'pattern-subtle', name: 'خفيف', emoji: '✨', category: 'pattern' },
    ];

    // ✅ دالة حفظ الإعدادات في قاعدة البيانات
    const saveSettingsToDB = useCallback(async (currentModalScale: number) => {
        if (!user?.id) return;
        try {
            // 1. جلب البيانات القديمة
            const { data: currentData } = await supabase
                .from('user_dashboard_settings')
                .select('layout_config')
                .eq('user_id', user.id)
                .maybeSingle();

            let finalConfig: any = {};

            // التعامل مع البيانات القديمة (سواء مصفوفة أو كائن)
            if (currentData?.layout_config) {
                if (Array.isArray(currentData.layout_config)) {
                    finalConfig = { dashboard_layout: currentData.layout_config };
                } else {
                    finalConfig = { ...currentData.layout_config };
                }
            }

            // 2. تحديث إعدادات المؤشر فقط
            finalConfig.typing_settings = {
                ...(finalConfig.typing_settings || {}),
                modalScale: currentModalScale
            };

            // 3. الحفظ
            const { error } = await supabase
                .from('user_dashboard_settings')
                .upsert({
                    user_id: user.id,
                    layout_config: finalConfig,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) console.error('Error saving typing settings:', error);
            else console.log('✅ Typing settings saved to DB:', currentModalScale);

        } catch (err) {
            console.error('Exception saving settings:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        // تحميل الإعدادات المحلية
        const savedStyle = localStorage.getItem('shamil_typing_style') as IndicatorType;
        if (savedStyle && ['pen', 'plane'].includes(savedStyle)) setSelectedStyle(savedStyle);

        const savedColor = localStorage.getItem('shamil_typing_color');
        if (savedColor) setSelectedColor(savedColor);

        const savedTextScale = localStorage.getItem('shamil_typing_text_scale');
        if (savedTextScale) setTextScale(parseFloat(savedTextScale));

        const savedIconScale = localStorage.getItem('shamil_typing_icon_scale');
        if (savedIconScale) setIconScale(parseFloat(savedIconScale));

        // ✅ تحميل حجم الواجهة من قاعدة البيانات
        const loadFromDB = async () => {
            if (!user?.id) return;
            const { data } = await supabase
                .from('user_dashboard_settings')
                .select('layout_config')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data?.layout_config && !Array.isArray(data.layout_config) && data.layout_config.typing_settings?.modalScale) {
                console.log('Using modalScale from DB:', data.layout_config.typing_settings.modalScale);
                setModalScale(data.layout_config.typing_settings.modalScale);
            } else {
                // Fallback to local
                const savedModalScale = localStorage.getItem('shamil_modal_scale');
                if (savedModalScale) setModalScale(parseFloat(savedModalScale));
            }
        };
        loadFromDB();
    }, [user?.id]);

    // ✅ حفظ تلقائي عند تغيير الحجم (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (modalScale) {
                localStorage.setItem('shamil_modal_scale', modalScale.toString());
                saveSettingsToDB(modalScale);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [modalScale, saveSettingsToDB]);

    const handleSaveSettings = () => {
        localStorage.setItem('shamil_typing_style', selectedStyle);
        localStorage.setItem('shamil_typing_color', selectedColor);
        localStorage.setItem('shamil_typing_text_scale', textScale.toString());
        localStorage.setItem('shamil_typing_icon_scale', iconScale.toString());
        // modalScale is already auto-saved, but ensures local sync
        localStorage.setItem('shamil_modal_scale', modalScale.toString());
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
            {/* Top Page Header - Fixed & Unscaled */}
            <div className="bg-white dark:bg-gray-900 px-6 py-4 shadow-sm border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-50 relative">
                <div className="w-8"></div> {/* Spacer for centering */}
                <h2 className="text-lg font-bold text-gray-800 dark:text-white text-center flex-1">
                    تخصيص مؤشر الكتابة ومظهر الدردشة
                </h2>
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                    aria-label="إغلاق"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Scalable Content Area */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden pb-20">
                <div
                    className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl rounded-xl border border-gray-200 dark:border-gray-800 transition-transform duration-300 flex flex-col max-h-[80vh] overflow-hidden"
                    style={{
                        transform: `scale(${modalScale})`,
                        transformOrigin: 'center center'
                    }}
                >
                    {/* Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                        <div className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center min-h-[150px]" style={{ borderColor: selectedColor, transition: 'border-color 0.3s' }}>
                            <p className="text-sm font-semibold mb-4" style={{ color: selectedColor, transition: 'color 0.3s' }}>
                                معاينة حية للمؤشر:
                            </p>
                            <SmartTypingIndicator
                                type={selectedStyle}
                                customColor={selectedColor}
                                textScale={textScale}
                                scaleFactor={iconScale}
                            />
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-800 my-6"></div>

                        <fieldset className="space-y-4">
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1">
                                اختر نمط الإشعار:
                            </legend>
                            <div
                                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${selectedStyle === 'pen' ? 'bg-blue-50 dark:bg-blue-900/20 ring-1' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                style={{ borderColor: selectedStyle === 'pen' ? '#3B82F6' : undefined }}
                                onClick={() => setSelectedStyle('pen')}
                            >
                                <div className="flex items-center h-5">
                                    <input id="style-pen" name="typing-style" type="radio" checked={selectedStyle === 'pen'} onChange={() => setSelectedStyle('pen')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                </div>
                                <div className="ml-3 text-sm mr-3">
                                    <label htmlFor="style-pen" className="font-medium text-gray-700 dark:text-gray-200 cursor-pointer">نمط القلم ✍️</label>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">يركز على عملية <span className="font-bold text-blue-600 dark:text-blue-400">الكتابة</span> والإبداع.</p>
                                </div>
                            </div>
                            <div
                                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${selectedStyle === 'plane' ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                style={{ borderColor: selectedStyle === 'plane' ? '#4F46E5' : undefined }}
                                onClick={() => setSelectedStyle('plane')}
                            >
                                <div className="flex items-center h-5">
                                    <input id="style-plane" name="typing-style" type="radio" checked={selectedStyle === 'plane'} onChange={() => setSelectedStyle('plane')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                </div>
                                <div className="ml-3 text-sm mr-3">
                                    <label htmlFor="style-plane" className="font-medium text-gray-700 dark:text-gray-200 cursor-pointer">نمط الطائرة 🚀</label>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">يركز على <span className="font-bold text-indigo-600 dark:text-indigo-400">السرعة</span> والوصول الوشيك.</p>
                                </div>
                            </div>
                        </fieldset>

                        <div className="border-t border-gray-200 dark:border-gray-800 my-8"></div>

                        <fieldset className="mb-8">
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1">
                                📝 تعديل حجم النص
                            </legend>
                            <input
                                type="range"
                                min="0.7"
                                max="1.3"
                                step="0.05"
                                value={textScale}
                                onChange={(e) => setTextScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                style={{ accentColor: selectedColor }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                <span>صغير (0.7x)</span>
                                <span className="font-semibold" style={{ color: selectedColor }}>
                                    الحالي: {textScale.toFixed(2)}x
                                </span>
                                <span>كبير (1.3x)</span>
                            </div>
                        </fieldset>

                        <fieldset className="mb-8">
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1">
                                🎨 تعديل حجم المؤشر الرسومي
                            </legend>
                            <input
                                type="range"
                                min="0.7"
                                max="1.5"
                                step="0.05"
                                value={iconScale}
                                onChange={(e) => setIconScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                style={{ accentColor: selectedColor }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                <span>صغير (0.7x)</span>
                                <span className="font-semibold" style={{ color: selectedColor }}>
                                    الحالي: {iconScale.toFixed(2)}x
                                </span>
                                <span>كبير (1.5x)</span>
                            </div>
                        </fieldset>

                        <fieldset className="mb-8">
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1">
                                🖼️ حجم واجهة الإعدادات
                            </legend>
                            <input
                                type="range"
                                min="0.85"
                                max="1.15"
                                step="0.05"
                                value={modalScale}
                                onChange={(e) => setModalScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                style={{ accentColor: selectedColor }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                <span>تصغير (0.85x)</span>
                                <span className="font-semibold" style={{ color: selectedColor }}>
                                    الحالي: {modalScale.toFixed(2)}x
                                </span>
                                <span>تكبير (1.15x)</span>
                            </div>
                        </fieldset>

                        <div className="border-t border-gray-200 dark:border-gray-800 my-8"></div>

                        <fieldset>
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1">
                                اختر لون المؤشر:
                            </legend>
                            <div className="flex flex-wrap gap-4 justify-center">
                                {colors.map((color) => (
                                    <div
                                        key={color.hex}
                                        onClick={() => setSelectedColor(color.hex)}
                                        className={`w-10 h-10 rounded-full cursor-pointer transition-all transform hover:scale-110 flex items-center justify-center ${selectedColor === color.hex ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : 'ring-1 ring-transparent'}`}
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        {selectedColor === color.hex && (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        <span className="sr-only">{color.name}</span>
                                    </div>
                                ))}
                            </div>
                        </fieldset>

                        <div className="border-t border-gray-200 dark:border-gray-800 my-8"></div>

                        {/* قسم خلفيات الدردشة */}
                        <fieldset className="mb-8">
                            <legend className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 px-1 flex items-center gap-2">
                                <Palette size={20} />
                                خلفية حاوية الرسائل
                            </legend>

                            {/* ألوان هادئة */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">ألوان هادئة:</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {backgrounds.filter(bg => bg.category === 'solid').map((bg) => (
                                        <div
                                            key={bg.id}
                                            onClick={() => setBackground(bg.id)}
                                            className={`
                                        relative h-24 rounded-lg cursor-pointer transition-all transform hover:scale-105
                                        ${background === bg.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}
                                        chat-bg-${bg.id}
                                    `}
                                            style={{ borderColor: background === bg.id ? selectedColor : undefined }}
                                        >
                                            {background === bg.id && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow">
                                                {bg.emoji} {bg.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Gradients */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">تدرجات لونية:</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {backgrounds.filter(bg => bg.category === 'gradient').map((bg) => (
                                        <div
                                            key={bg.id}
                                            onClick={() => setBackground(bg.id)}
                                            className={`
                                        relative h-24 rounded-lg cursor-pointer transition-all transform hover:scale-105
                                        ${background === bg.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}
                                        chat-bg-${bg.id}
                                    `}
                                            style={{ borderColor: background === bg.id ? selectedColor : undefined }}
                                        >
                                            {background === bg.id && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow">
                                                {bg.emoji} {bg.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Patterns */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">نقوش مميزة:</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {backgrounds.filter(bg => bg.category === 'pattern').map((bg) => (
                                        <div
                                            key={bg.id}
                                            onClick={() => setBackground(bg.id)}
                                            className={`
                                        relative h-28 rounded-lg cursor-pointer transition-all transform hover:scale-105
                                        ${background === bg.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}
                                        chat-bg-${bg.id}
                                    `}
                                            style={{ borderColor: background === bg.id ? selectedColor : undefined }}
                                        >
                                            {background === bg.id && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-700 dark:text-gray-300 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow">
                                                {bg.emoji} {bg.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>

            {/* Sticky Save Button - Outside Scalable Container */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 z-50">
                <button
                    onClick={handleSaveSettings}
                    className="w-full max-w-lg mx-auto block py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ background: `linear-gradient(to right, ${selectedColor}, ${colors.find(c => c.hex === selectedColor)?.hex || selectedColor})`, filter: 'saturate(1.2)' }}
                >
                    حفظ التفضيلات
                </button>
            </div>
        </div>
    );
};

export default TypingSettingsPage;
