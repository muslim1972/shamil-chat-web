import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ShamilTheme } from '../styles/shamilTheme';
import { shamilTheme } from '../styles/shamilTheme';

export type ColorScheme = 'shamil' | 'default' | 'cold' | 'warm' | 'youthful';
export type ThemeMode = 'light' | 'dark';
export type PerformanceMode = 'auto' | 'high' | 'low';

interface ThemeContextType {
    mode: ThemeMode;
    colorScheme: ColorScheme;
    toggleMode: () => void;
    setColorScheme: (scheme: ColorScheme) => void;
    shamilTheme: ShamilTheme;
    animatedBg: boolean;
    toggleAnimatedBg: () => void;
    performanceMode: PerformanceMode;
    setPerformanceMode: (mode: PerformanceMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
    const [colorScheme, setColorScheme] = useState<ColorScheme>('shamil'); // الافتراضي الجديد
    const [animatedBg, setAnimatedBg] = useState<boolean>(true); // افتراضياً مفعّل
    const [performanceMode, setPerformanceModeState] = useState<PerformanceMode>('auto');

    // تحميل الثيم من localStorage عند البدء
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme-settings');
        if (savedTheme) {
            try {
                const parsed = JSON.parse(savedTheme);
                setMode(parsed.mode || 'light');
                setColorScheme(parsed.colorScheme || 'shamil');
                setAnimatedBg(parsed.animatedBg !== undefined ? parsed.animatedBg : true);
                setPerformanceModeState(parsed.performanceMode || 'auto');
            } catch (error) {
                console.error('Failed to parse theme settings:', error);
            }
        } else {
            // التحقق من dark mode في HTML
            const isDark = document.documentElement.classList.contains('dark');
            setMode(isDark ? 'dark' : 'light');
        }
    }, []);

    // تطبيق الثيم عند التغيير
    useEffect(() => {
        // حفظ في localStorage
        localStorage.setItem('theme-settings', JSON.stringify({
            mode,
            colorScheme,
            animatedBg,
            performanceMode
        }));

        // تطبيق Dark/Light mode
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // تطبيق Color Scheme عبر CSS variables
        const root = document.documentElement;

        // إزالة جميع classes السابقة
        root.classList.remove('theme-default', 'theme-cold', 'theme-warm', 'theme-youthful', 'theme-shamil');

        // إضافة class الجديد
        root.classList.add(`theme-${colorScheme}`);
    }, [mode, colorScheme]);

    const toggleMode = () => {
        setMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    const toggleAnimatedBg = () => {
        setAnimatedBg(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{
            mode,
            colorScheme,
            toggleMode,
            setColorScheme,
            shamilTheme,
            animatedBg,
            toggleAnimatedBg,
            performanceMode,
            setPerformanceMode: setPerformanceModeState
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
