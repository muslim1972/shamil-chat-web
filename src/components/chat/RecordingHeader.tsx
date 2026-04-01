// RecordingHeader Component
// This component handles the UI for audio recording

import React, { useState, useEffect } from 'react';
import { Trash2, Send } from 'lucide-react';

interface RecordingHeaderProps {
  duration: number;
  onCancel: () => void;
  onSend: () => Promise<void>;
}

export const RecordingHeader: React.FC<RecordingHeaderProps> = ({ duration, onCancel, onSend }) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // حساب اللون الرئيسي بناءً على مدة التسجيل
  const getMainColor = () => {
    const seconds = Math.floor(duration / 1000);
    
    // تحديد اللون الأساسي حسب المرحلة
    if (seconds < 20) {
      // مرحلة الأزرق الفاتح
      return {
        start: '#93c5fd', // blue-300
        end: '#60a5fa',   // blue-400
        pulse: '#dbeafe'  // blue-100
      };
    } else if (seconds < 40) {
      // مرحلة الأزرق الغامق
      return {
        start: '#3b82f6', // blue-500
        end: '#2563eb',   // blue-600
        pulse: '#bfdbfe'  // blue-200
      };
    } else if (seconds < 60) {
      // مرحلة الأصفر
      return {
        start: '#fde047', // yellow-300
        end: '#facc15',   // yellow-400
        pulse: '#fef9c3'  // yellow-100
      };
    } else if (seconds < 80) {
      // مرحلة الزهري
      return {
        start: '#f9a8d4', // pink-300
        end: '#f472b6',   // pink-400
        pulse: '#fce7f3'  // pink-100
      };
    } else if (seconds < 100) {
      // مرحلة الأحمر الفاتح
      return {
        start: '#fca5a5', // red-300
        end: '#f87171',   // red-400
        pulse: '#fee2e2'  // red-100
      };
    } else {
      // مرحلة الأحمر الغامق
      return {
        start: '#ef4444', // red-500
        end: '#dc2626',   // red-600
        pulse: '#fecaca'  // red-200
      };
    }
  };

  // حساب الألوان المتدرجة بشكل سلس
  const getSmoothGradient = () => {
    const seconds = Math.floor(duration / 1000);
    
    // تحديد المرحلة الحالية (كل مرحلة 20 ثانية)
    const stage = Math.floor(seconds / 20);
    
    // الموقع ضمن المرحلة الحالية (0-19)
    const positionInStage = seconds % 20;
    
    // تحديد المرحلة التالية
    const nextStage = Math.min(stage + 1, 5);
    
    // ألوان المراحل
    const stages = [
      { start: '#93c5fd', end: '#60a5fa' },   // الأزرق الفاتح
      { start: '#3b82f6', end: '#2563eb' },   // الأزرق الغامق
      { start: '#fde047', end: '#facc15' },   // الأصفر
      { start: '#f9a8d4', end: '#f472b6' },   // الزهري
      { start: '#fca5a5', end: '#f87171' },   // الأحمر الفاتح
      { start: '#ef4444', end: '#dc2626' }    // الأحمر الغامق
    ];
    
    // حساب التدرج بين المراحل
    const currentColor = stages[stage].end;
    const nextColor = stages[nextStage].start;
    
    // حساب نسبة التدرج (0-1) بناءً على الموقع ضمن المرحلة
    const progressRatio = positionInStage / 20;
    
    // دالة لتحويل لون HEX إلى RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    
    // دالة لتحويل RGB إلى HEX
    const rgbToHex = (r: number, g: number, b: number) => {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };
    
    // حساب اللون المتدرج
    const currentRgb = hexToRgb(currentColor);
    const nextRgb = hexToRgb(nextColor);
    
    const r = Math.round(currentRgb.r + (nextRgb.r - currentRgb.r) * progressRatio);
    const g = Math.round(currentRgb.g + (nextRgb.g - currentRgb.g) * progressRatio);
    const b = Math.round(currentRgb.b + (nextRgb.b - currentRgb.b) * progressRatio);
    
    const gradientColor = rgbToHex(r, g, b);
    
    // حساب اللون التالي (لإنشاء تدرج)
    const nextPosition = Math.min(positionInStage + 2, 20);
    const nextProgressRatio = nextPosition / 20;
    
    const nextR = Math.round(currentRgb.r + (nextRgb.r - currentRgb.r) * nextProgressRatio);
    const nextG = Math.round(currentRgb.g + (nextRgb.g - currentRgb.g) * nextProgressRatio);
    const nextB = Math.round(currentRgb.b + (nextRgb.b - currentRgb.b) * nextProgressRatio);
    
    const nextGradientColor = rgbToHex(nextR, nextG, nextB);
    
    return {
      start: gradientColor,
      end: nextGradientColor
    };
  };

  // حالة للتحكم في موضع التموج المضيء
  const [wavePosition, setWavePosition] = useState(0);
  
  // حالة لمنع النقر المتكرر على زر الإرسال
  const [isSending, setIsSending] = useState(false);
  
  // تحديث موضع التموج
  useEffect(() => {
    const interval = setInterval(() => {
      setWavePosition(prev => (prev >= 100 ? 0 : prev + 2));
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
  
  const mainColor = getMainColor();
  const gradientColor = getSmoothGradient();
  
  // دالة معالجة إرسال التسجيل
  const handleSendClick = async () => {
    if (isSending) return; // منع النقر المتكرر
    
    try {
      setIsSending(true);
      await onSend(); // استدعاء دالة الإرسال
    } catch (error) {
      console.error('Error sending recording:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg">
      {/* الخلفية المتدرجة */}
      <div 
        className="w-full h-full p-3"
        style={{
          background: `linear-gradient(to right, ${gradientColor.start}, ${gradientColor.end})`
        }}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              className="p-2 text-white hover:bg-black hover:bg-opacity-20 rounded-full transition-colors flex items-center justify-center"
              title="إلغاء التسجيل"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex items-center bg-black bg-opacity-20 px-3 py-1 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
              <span className="text-white font-mono text-sm">{formatDuration(duration)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">            <button
              onClick={handleSendClick}
              disabled={isSending}
              className={`p-2 text-white rounded-full transition-colors flex items-center justify-center ${
                isSending 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              title="إرسال الرسالة الصوتية"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* التموج المضيء المتحرك */}
      <div 
        className="absolute top-0 h-full w-1/4 opacity-70 animate-pulse"
        style={{
          left: `${wavePosition}%`,
          background: `linear-gradient(90deg, transparent, ${mainColor.pulse}, transparent)`,
          filter: 'blur(15px)'
        }}
      />
    </div>
  );
};