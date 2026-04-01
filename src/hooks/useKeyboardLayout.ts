/**
 * Hook للتعامل مع لوحة المفاتيح على الموبايل
 * 
 * يستخدم @capacitor/keyboard API لضمان الموثوقية على جميع الأجهزة.
 * 
 * المشكلة: على Android 12 وما قبلها، عند ظهور لوحة المفاتيح
 * لا يتم تحديث viewport بشكل صحيح مما يسبب اختفاء حقل الإدخال.
 * 
 * الحل: استخدام إضافة الكيبورد الرسمية التي توفر أحداثاً دقيقة
 * لظهور/إخفاء الكيبورد مع ارتفاعه الدقيق.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface KeyboardLayoutState {
    isKeyboardOpen: boolean;
    keyboardHeight: number;
}

interface UseKeyboardLayoutOptions {
    /** تفعيل/تعطيل التمرير التلقائي */
    autoScroll?: boolean;
}

/**
 * تحديث CSS variable لارتفاع الكيبورد
 */
function updateKeyboardCSSVariable(height: number): void {
    document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
}

export function useKeyboardLayout(
    inputRef?: React.RefObject<any>,
    options: UseKeyboardLayoutOptions = {}
) {
    const { autoScroll = true } = options;

    const [state, setState] = useState<KeyboardLayoutState>({
        isKeyboardOpen: false,
        keyboardHeight: 0,
    });

    /**
     * تمرير العنصر للظهور فوق الكيبورد
     */
    const scrollToInput = useCallback(() => {
        if (!inputRef?.current || !autoScroll) return;

        const element = inputRef.current;

        // التمرير الفوري هو الأكثر موثوقية
        if (typeof element.scrollIntoView === 'function') {
            element.scrollIntoView({
                behavior: 'instant',
                block: 'end',
                inline: 'nearest'
            });
        }
    }, [inputRef, autoScroll]);

    /**
     * تهيئة المستمعين
     */
    useEffect(() => {
        if (typeof window === 'undefined' || !Capacitor.isPluginAvailable('Keyboard')) {
            return;
        }

        // تهيئة CSS variable
        updateKeyboardCSSVariable(0);

        let showListener: any;
        let hideListener: any;

        const setup = async () => {
            showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
                const newKeyboardHeight = info.keyboardHeight;
                updateKeyboardCSSVariable(newKeyboardHeight);
                setState({
                    isKeyboardOpen: true,
                    keyboardHeight: newKeyboardHeight,
                });

                setTimeout(() => {
                    scrollToInput();
                }, 50);
            });

            hideListener = await Keyboard.addListener('keyboardWillHide', () => {
                updateKeyboardCSSVariable(0);
                setState({
                    isKeyboardOpen: false,
                    keyboardHeight: 0,
                });
            });
        };

        setup();

        return () => {
            if (showListener) showListener.remove();
            if (hideListener) hideListener.remove();
        };
    }, [scrollToInput]);

    // هذه الدوال لم تعد ضرورية للمعالجة الداخلية لكن نبقيها للتوافقية
    // في حال كانت تستخدم في مكان ما خارجياً
    const handleInputFocus = useCallback(() => {
        // يمكن إضافة منطق هنا إذا احتجنا
    }, []);

    const handleInputBlur = useCallback(() => {
        // يمكن إضافة منطق هنا إذا احتجنا
    }, []);

    return {
        isKeyboardOpen: state.isKeyboardOpen,
        keyboardHeight: state.keyboardHeight,
        scrollToInput,
        handleInputFocus,
        handleInputBlur,
        debug: {
            // معلومات التصحيح يمكن تبسيطها أو إزالتها
            useFallback: false,
            hasVisualViewport: false,
            initialHeight: 0,
            deviceInfo: {}
        }
    };
}
