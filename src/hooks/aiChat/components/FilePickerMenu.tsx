// src/hooks/aiChat/components/FilePickerMenu.tsx
// قائمة منسدلة لاختيار نوع الملف المراد إرفاقه

import React, { useState, useRef, useEffect } from 'react';
import { Image, FileText, FileType2, X } from 'lucide-react';
import type { FileType } from '../useFileSelection';

interface FilePickerMenuProps {
    onSelect: (type: FileType) => void;
    disabled?: boolean;
}

export const FilePickerMenu: React.FC<FilePickerMenuProps> = ({ onSelect, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // إغلاق القائمة عند النقر خارجها
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (type: FileType) => {
        if (type !== 'image') {
            alert('سيتم اضافة هذه الميزة قريبا');
            setIsOpen(false);
            return;
        }
        onSelect(type);
        setIsOpen(false);
    };

    const menuItems = [
        { type: 'image' as FileType, icon: Image, label: 'صورة', color: 'text-blue-500' },
        { type: 'text' as FileType, icon: FileText, label: 'ملف نصي', color: 'text-green-500' },
        { type: 'document' as FileType, icon: FileText, label: 'Word / Docs', color: 'text-blue-600' },
        { type: 'pdf' as FileType, icon: FileType2, label: 'PDF', color: 'text-red-500' },
    ];

    return (
        <div className="relative" ref={menuRef}>
            {/* زر الإرفاق */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`p-2 rounded-full transition-all duration-200 ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                    }`}
                title="إرفاق ملف"
            >
                {isOpen ? (
                    <X className="w-5 h-5 text-gray-500" />
                ) : (
                    <svg
                        className="w-5 h-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                    </svg>
                )}
            </button>

            {/* القائمة المنسدلة */}
            {isOpen && (
                <div
                    className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{ minWidth: '140px' }}
                >
                    {menuItems.map((item) => (
                        <button
                            key={item.type}
                            type="button"
                            onClick={() => handleSelect(item.type)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-right"
                        >
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilePickerMenu;
