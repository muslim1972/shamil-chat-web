import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ChatBackground =
    | 'default'
    | 'light-blue'
    | 'warm-cream'
    | 'soft-green'
    | 'lavender'
    | 'gradient-sunset'
    | 'gradient-ocean'
    | 'gradient-forest'
    | 'pattern-dots'
    | 'pattern-waves'
    | 'pattern-geometric'
    | 'pattern-subtle';

interface ChatBackgroundContextType {
    background: ChatBackground;
    setBackground: (bg: ChatBackground) => void;
}

const ChatBackgroundContext = createContext<ChatBackgroundContextType | undefined>(undefined);

interface ChatBackgroundProviderProps {
    children: ReactNode;
}

export const ChatBackgroundProvider: React.FC<ChatBackgroundProviderProps> = ({ children }) => {
    const [background, setBackgroundState] = useState<ChatBackground>('default');

    // تحميل من localStorage
    useEffect(() => {
        const saved = localStorage.getItem('chat-background');
        if (saved) {
            setBackgroundState(saved as ChatBackground);
        }
    }, []);

    // حفظ عند التغيير
    const setBackground = (bg: ChatBackground) => {
        setBackgroundState(bg);
        localStorage.setItem('chat-background', bg);
    };

    return (
        <ChatBackgroundContext.Provider value={{ background, setBackground }}>
            {children}
        </ChatBackgroundContext.Provider>
    );
};

export const useChatBackground = () => {
    const context = useContext(ChatBackgroundContext);
    if (!context) {
        throw new Error('useChatBackground must be used within ChatBackgroundProvider');
    }
    return context;
};
