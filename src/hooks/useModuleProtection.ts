/**
 * Hook لإدارة حالة الحماية للوحدات المعزولة
 * يتيح للمطورين التبديل بين الحماية المفعلة والمعطلة
 */

import { useState, useCallback } from 'react';

export interface ModuleProtectionState {
  isProtected: boolean;
  protectionLevel: 'strict' | 'normal' | 'disabled';
  lastModified: number;
  modifiedBy: 'system' | 'developer';
}

export interface ModuleProtectionManager {
  // الحالة الحالية
  isModuleProtected: (moduleType: string) => boolean;
  getProtectionLevel: (moduleType: string) => 'strict' | 'normal' | 'disabled';
  
  // التبديل بين الحماية
  toggleModuleProtection: (moduleType: string) => Promise<boolean>;
  enableModuleProtection: (moduleType: string) => Promise<boolean>;
  disableModuleProtection: (moduleType: string) => Promise<boolean>;
  
  // إدارة متقدمة
  setProtectionLevel: (moduleType: string, level: 'strict' | 'normal' | 'disabled') => Promise<boolean>;
  getProtectionHistory: (moduleType: string) => ModuleProtectionState[];
  
  // معلومات الحماية
  getProtectionInfo: (moduleType: string) => {
    isProtected: boolean;
    level: string;
    lastModified: Date;
    modifiedBy: string;
    recommendations: string[];
  };
  
  // إحصائيات
  getProtectionStats: () => {
    total: number;
    protected: number;
    disabled: number;
    strict: number;
    normal: number;
  };
}

const PROTECTION_STORAGE_KEY = 'module_protection_state';
const PROTECTION_HISTORY_KEY = 'module_protection_history';

// حالة الحماية الافتراضية للوحدات
const DEFAULT_PROTECTION_LEVELS: Record<string, 'strict' | 'normal' | 'disabled'> = {
  'video-thumbnail': 'strict',        // حماية شديدة - لا يمكن التعديل
  'video-message': 'strict',          // حماية شديدة - لا يمكن التعديل
  'cache-management': 'normal',       // حماية عادية - مسموح بالقراءة والتعديل المقيد
  'image-processing': 'normal',       // حماية عادية
  'audio-processing': 'normal',       // حماية عادية
  'network-management': 'normal'      // حماية عادية
};

export const useModuleProtection = (): ModuleProtectionManager => {
  const [protectionState, setProtectionState] = useState<Record<string, ModuleProtectionState>>(() => {
    // تحميل الحالة المحفوظة من localStorage
    try {
      const saved = localStorage.getItem(PROTECTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // تحويل التواريخ المحفوظة
        Object.keys(parsed).forEach(key => {
          parsed[key].lastModified = new Date(parsed[key].lastModified).getTime();
        });
        return parsed;
      }
    } catch (error) {
      console.warn('فشل في تحميل حالة الحماية:', error);
    }
    
    // حالة افتراضية
    const defaultState: Record<string, ModuleProtectionState> = {};
    Object.keys(DEFAULT_PROTECTION_LEVELS).forEach(moduleType => {
      defaultState[moduleType] = {
        isProtected: DEFAULT_PROTECTION_LEVELS[moduleType] !== 'disabled',
        protectionLevel: DEFAULT_PROTECTION_LEVELS[moduleType],
        lastModified: Date.now(),
        modifiedBy: 'system'
      };
    });
    
    return defaultState;
  });

  // حفظ الحالة في localStorage
  const saveProtectionState = useCallback((newState: Record<string, ModuleProtectionState>) => {
    try {
      localStorage.setItem(PROTECTION_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('فشل في حفظ حالة الحماية:', error);
    }
  }, []);

  // إضافة سجل للتغيير
  const addToHistory = useCallback((moduleType: string, action: string, oldState: ModuleProtectionState, newState: ModuleProtectionState) => {
    try {
      const history = JSON.parse(localStorage.getItem(PROTECTION_HISTORY_KEY) || '{}');
      if (!history[moduleType]) {
        history[moduleType] = [];
      }
      
      history[moduleType].push({
        timestamp: Date.now(),
        action,
        oldState,
        newState
      });
      
      // الاحتفاظ بآخر 50 سجل فقط
      if (history[moduleType].length > 50) {
        history[moduleType] = history[moduleType].slice(-50);
      }
      
      localStorage.setItem(PROTECTION_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('فشل في حفظ سجل الحماية:', error);
    }
  }, []);

  // التحقق من حالة الحماية
  const isModuleProtected = useCallback((moduleType: string): boolean => {
    return protectionState[moduleType]?.isProtected ?? true;
  }, [protectionState]);

  const getProtectionLevel = useCallback((moduleType: string): 'strict' | 'normal' | 'disabled' => {
    return protectionState[moduleType]?.protectionLevel ?? 'normal';
  }, [protectionState]);

  // تبديل الحماية (دوران بين ثلاث حالات: معطل → عادي → شديد)
  const toggleModuleProtection = useCallback(async (moduleType: string): Promise<boolean> => {
    const currentState = protectionState[moduleType];
    if (!currentState) return false;

    let newLevel: 'strict' | 'normal' | 'disabled';
    let newIsProtected: boolean;

    // منطق الدوران بين ثلاث حالات
    if (currentState.protectionLevel === 'disabled') {
      // معطل → عادي
      newLevel = 'normal';
      newIsProtected = true;
    } else if (currentState.protectionLevel === 'normal') {
      // عادي → شديد
      newLevel = 'strict';
      newIsProtected = true;
    } else {
      // شديد → معطل
      newLevel = 'disabled';
      newIsProtected = false;
    }

    const newState: ModuleProtectionState = {
      ...currentState,
      protectionLevel: newLevel,
      isProtected: newIsProtected,
      lastModified: Date.now(),
      modifiedBy: 'developer'
    };

    const updatedState = {
      ...protectionState,
      [moduleType]: newState
    };

    setProtectionState(updatedState);
    saveProtectionState(updatedState);
    addToHistory(moduleType, 'toggle', currentState, newState);

    return newState.isProtected;
  }, [protectionState, saveProtectionState, addToHistory]);

  // تفعيل الحماية
  const enableModuleProtection = useCallback(async (moduleType: string): Promise<boolean> => {
    const currentState = protectionState[moduleType];
    if (!currentState) return false;

    const newState: ModuleProtectionState = {
      ...currentState,
      isProtected: true,
      protectionLevel: 'normal',
      lastModified: Date.now(),
      modifiedBy: 'developer'
    };

    const updatedState = {
      ...protectionState,
      [moduleType]: newState
    };

    setProtectionState(updatedState);
    saveProtectionState(updatedState);
    addToHistory(moduleType, 'enable', currentState, newState);

    return true;
  }, [protectionState, saveProtectionState, addToHistory]);

  // إلغاء الحماية
  const disableModuleProtection = useCallback(async (moduleType: string): Promise<boolean> => {
    const currentState = protectionState[moduleType];
    if (!currentState) return false;

    const newState: ModuleProtectionState = {
      ...currentState,
      isProtected: false,
      protectionLevel: 'disabled',
      lastModified: Date.now(),
      modifiedBy: 'developer'
    };

    const updatedState = {
      ...protectionState,
      [moduleType]: newState
    };

    setProtectionState(updatedState);
    saveProtectionState(updatedState);
    addToHistory(moduleType, 'disable', currentState, newState);

    return true;
  }, [protectionState, saveProtectionState, addToHistory]);

  // تعيين مستوى الحماية
  const setProtectionLevel = useCallback(async (moduleType: string, level: 'strict' | 'normal' | 'disabled'): Promise<boolean> => {
    const currentState = protectionState[moduleType];
    if (!currentState) return false;

    const newState: ModuleProtectionState = {
      ...currentState,
      protectionLevel: level,
      isProtected: level !== 'disabled',
      lastModified: Date.now(),
      modifiedBy: 'developer'
    };

    const updatedState = {
      ...protectionState,
      [moduleType]: newState
    };

    setProtectionState(updatedState);
    saveProtectionState(updatedState);
    addToHistory(moduleType, 'set_level', currentState, newState);

    return true;
  }, [protectionState, saveProtectionState, addToHistory]);

  // الحصول على سجل التغييرات
  const getProtectionHistory = useCallback((moduleType: string): ModuleProtectionState[] => {
    try {
      const history = JSON.parse(localStorage.getItem(PROTECTION_HISTORY_KEY) || '{}');
      return history[moduleType]?.map((entry: any) => ({
        ...entry.newState,
        lastModified: new Date(entry.timestamp).getTime()
      })) || [];
    } catch {
      return [];
    }
  }, []);

  // معلومات الحماية المفصلة
  const getProtectionInfo = useCallback((moduleType: string) => {
    const state = protectionState[moduleType];
    if (!state) {
      return {
        isProtected: true,
        level: 'normal',
        lastModified: new Date(),
        modifiedBy: 'system',
        recommendations: ['وحدة غير معروفة - يُنصح بتفعيل الحماية']
      };
    }

    const recommendations: string[] = [];
    
    if (state.protectionLevel === 'strict') {
      recommendations.push('حماية شديدة - التعديل معطل');
    } else if (state.protectionLevel === 'normal') {
      recommendations.push('حماية عادية - التعديل محدود');
    } else {
      recommendations.push('الحماية معطلة - يمكن التعديل بحرية');
    }

    if (state.modifiedBy === 'developer') {
      recommendations.push('تم التعديل بواسطة المطور');
    }

    return {
      isProtected: state.isProtected,
      level: state.protectionLevel,
      lastModified: new Date(state.lastModified),
      modifiedBy: state.modifiedBy,
      recommendations
    };
  }, [protectionState]);

  // إحصائيات الحماية
  const getProtectionStats = useCallback(() => {
    const modules = Object.keys(protectionState);
    const total = modules.length;
    const protectedCount = modules.filter(m => protectionState[m].isProtected).length;
    const disabled = modules.filter(m => !protectionState[m].isProtected).length;
    const strict = modules.filter(m => protectionState[m].protectionLevel === 'strict').length;
    const normal = modules.filter(m => protectionState[m].protectionLevel === 'normal').length;

    return { total, protected: protectedCount, disabled, strict, normal };
  }, [protectionState]);

  return {
    isModuleProtected,
    getProtectionLevel,
    toggleModuleProtection,
    enableModuleProtection,
    disableModuleProtection,
    setProtectionLevel,
    getProtectionHistory,
    getProtectionInfo,
    getProtectionStats
  };
};