import React from 'react';

// تعريف الأنواع المتاحة للمؤشر
export type IndicatorType = 'pen' | 'plane';

interface SmartIndicatorProps {
    type: IndicatorType;
    userName?: string;
    colorClass?: string;
    customColor?: string;
    scaleFactor?: number;
    textScale?: number;
}

const SmartTypingIndicator: React.FC<SmartIndicatorProps> = ({
    type,
    userName,
    colorClass = 'text-indigo-600 dark:text-indigo-400',
    customColor,
    scaleFactor = 1.0,
    textScale = 1.0
}) => {
    const indicatorText = userName ? `${userName} يفكر ويكتب...` : 'يفكر ويكتب...';

    const config = {
        pen: {
            text: indicatorText,
            animationClass: 'animate-writing-hand origin-bottom-left',
            icon: (
                <svg
                    className={`w-6 h-6 ${!customColor ? colorClass : ''}`}
                    style={customColor ? { color: customColor } : {}}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            ),
            extraEffect: (
                <div
                    className="absolute -bottom-0.5 -right-0.5 w-1 h-1 rounded-full opacity-0 animate-ping"
                    style={{ backgroundColor: customColor || '#3B82F6' }}
                ></div>
            )
        },
        plane: {
            text: indicatorText,
            animationClass: 'animate-plane-loading -rotate-12',
            icon: (
                <svg
                    className={`w-7 h-7 ${!customColor ? colorClass : ''}`}
                    style={customColor ? { color: customColor } : {}}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            ),
            extraEffect: (
                <div className="absolute -bottom-0.5 -left-0.5 flex gap-0.5">
                    <span
                        className="w-0.5 h-0.5 rounded-full animate-ping opacity-75"
                        style={{ backgroundColor: customColor ? customColor : '#818CF8' }}
                    ></span>
                </div>
            )
        }
    };

    const activeConfig = config[type];

    return (
        <div
            className="inline-flex items-center gap-1 px-2 py-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-md transition-all duration-300"
            style={{
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top right'
            }}
        >
            <div
                className="flex items-center"
                style={{
                    transform: `scale(${textScale})`,
                    transformOrigin: 'right center'
                }}
            >
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {activeConfig.text}
                </span>
            </div>

            <div className="relative flex items-center justify-center w-7 h-7">
                <div className={activeConfig.animationClass}>
                    {activeConfig.icon}
                </div>
                {activeConfig.extraEffect}
            </div>
        </div>
    );
};

export default SmartTypingIndicator;
