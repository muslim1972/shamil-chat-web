// نظام الثيمات الرسمي لتطبيق Shamil
// يحتوي على جميع الألوان والتدرجات والأنماط

export interface ShamilTheme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: {
            start: string;
            middle: string;
            end: string;
        };
        glow: {
            purple: string;
            blue: string;
            violet: string;
        };
        particles: string[];
        text: {
            primary: string;
            secondary: string;
            muted: string;
        };
    };
    gradients: {
        background: string;
        card: string;
        button: string;
        glow: string;
        wave: string;
    };
    effects: {
        blur: {
            small: string;
            medium: string;
            large: string;
        };
        shadow: {
            small: string;
            medium: string;
            large: string;
            glow: string;
        };
        border: string;
    };
}

// الثيم الافتراضي - Shamil Theme
export const shamilTheme: ShamilTheme = {
    name: 'Shamil Theme',
    colors: {
        primary: '#8B5CF6',      // أرجواني
        secondary: '#3B82F6',    // أزرق
        accent: '#9333EA',       // أرجواني داكن
        background: {
            start: '#2d1b4e',      // أرجواني داكن عميق
            middle: '#1a2332',     // أزرق رمادي داكن
            end: '#0f1f3d',        // أزرق داكن جداً
        },
        glow: {
            purple: 'rgba(139, 92, 246, 0.3)',
            blue: 'rgba(59, 130, 246, 0.3)',
            violet: 'rgba(147, 51, 234, 0.25)',
        },
        particles: [
            'rgba(139, 92, 246, 0.6)',   // أرجواني
            'rgba(59, 130, 246, 0.6)',   // أزرق
            'rgba(147, 51, 234, 0.6)',   // أرجواني داكن
            'rgba(96, 165, 250, 0.6)',   // أزرق فاتح
            'rgba(167, 139, 250, 0.6)',  // أرجواني فاتح
        ],
        text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.8)',
            muted: 'rgba(255, 255, 255, 0.5)',
        },
    },
    gradients: {
        background: 'linear-gradient(135deg, #2d1b4e 0%, #1a2332 50%, #0f1f3d 100%)',
        card: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
        button: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
        glow: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
        wave: 'linear-gradient(to bottom, rgba(139, 92, 246, 0) 0%, rgba(59, 130, 246, 0.3) 50%, rgba(139, 92, 246, 0) 100%)',
    },
    effects: {
        blur: {
            small: 'blur(10px)',
            medium: 'blur(20px)',
            large: 'blur(100px)',
        },
        shadow: {
            small: '0 4px 12px rgba(0, 0, 0, 0.3)',
            medium: '0 8px 32px rgba(0, 0, 0, 0.4)',
            large: '0 20px 60px rgba(0, 0, 0, 0.5)',
            glow: '0 4px 12px rgba(139, 92, 246, 0.5)',
        },
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
};

// دوال مساعدة للوصول السريع للثيم
export const getThemeGradient = (type: keyof ShamilTheme['gradients']) => {
    return shamilTheme.gradients[type];
};

export const getThemeColor = (path: string) => {
    const keys = path.split('.');
    let value: any = shamilTheme.colors;

    for (const key of keys) {
        value = value[key];
        if (value === undefined) return '';
    }

    return value;
};

export const getThemeEffect = (type: 'blur' | 'shadow', size: 'small' | 'medium' | 'large' | 'glow' = 'medium') => {
    return shamilTheme.effects[type][size as keyof typeof shamilTheme.effects.blur];
};

// Styles كاملة جاهزة للاستخدام المباشر
export const themeStyles = {
    // خلفيات
    background: {
        gradient: {
            background: shamilTheme.gradients.background,
        },
        solid: shamilTheme.colors.background.start,
    },

    // البطاقات
    card: {
        background: shamilTheme.gradients.card,
        backdropFilter: 'blur(20px)',
        border: shamilTheme.effects.border,
        boxShadow: shamilTheme.effects.shadow.medium,
    },

    // الأزرار
    button: {
        primary: {
            background: shamilTheme.gradients.button,
            color: shamilTheme.colors.text.primary,
            boxShadow: shamilTheme.effects.shadow.glow,
        },
        secondary: {
            background: shamilTheme.gradients.glow,
            color: shamilTheme.colors.text.primary,
            backdropFilter: 'blur(20px)',
            border: shamilTheme.effects.border,
        },
    },

    // المدخلات
    input: {
        background: shamilTheme.gradients.card,
        backdropFilter: 'blur(20px)',
        border: shamilTheme.effects.border,
        color: shamilTheme.colors.text.primary,
    },

    // القوائم المنسدلة
    dropdown: {
        background: shamilTheme.gradients.card,
        backdropFilter: 'blur(20px)',
        border: shamilTheme.effects.border,
        boxShadow: shamilTheme.effects.shadow.medium,
    },

    // النصوص
    text: {
        primary: {
            color: shamilTheme.colors.text.primary,
        },
        secondary: {
            color: shamilTheme.colors.text.secondary,
        },
        muted: {
            color: shamilTheme.colors.text.muted,
        },
    },
};

export default shamilTheme;
