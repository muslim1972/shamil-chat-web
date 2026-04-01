import React, { useEffect, useRef } from 'react';

interface EnhancedDialogWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const EnhancedDialogWrapper: React.FC<EnhancedDialogWrapperProps> = ({
  isOpen,
  onClose,
  children,
  title
}) => {
const dialogRef = useRef<HTMLDivElement>(null);
const contentRef = useRef<HTMLDivElement>(null);
const openTimeRef = useRef<number>(0);

useEffect(() => {
  if (!isOpen) return;

  // تسجيل وقت الفتح
  openTimeRef.current = Date.now();

  // منع scroll في الخلفية
  document.body.style.overflow = 'hidden';
  
    // تأخير صغير للتأكد من العرض بشكل صحيح
    const timer = setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
onClick={(e) => {
        if (e.target === dialogRef.current) {
          const timeSinceOpen = Date.now() - openTimeRef.current;
if (timeSinceOpen > 1000) {
              onClose();
          }
        }
      }}
      onTouchEnd={(e) => {
        if (e.target === dialogRef.current) {
          const timeSinceOpen = Date.now() - openTimeRef.current;
          if (timeSinceOpen > 500) {
            onClose();
          }
        }
      }}
          >
      <div
        ref={contentRef}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md my-auto shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

EnhancedDialogWrapper.displayName = 'EnhancedDialogWrapper';