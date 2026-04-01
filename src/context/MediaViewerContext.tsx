import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type MediaType = 'image' | 'video' | 'audio' | 'web';

export interface MediaViewerState {
    isOpen: boolean;
    mediaType: MediaType | null;
    mediaUrl: string | null;
    fileName?: string;
    metadata?: {
        width?: number;
        height?: number;
        blurhash?: string;
        duration?: number;
        background_audio?: {
            url: string;
            duration?: number;
        };
    };
}

interface MediaViewerContextValue {
    state: MediaViewerState;
    openMedia: (type: MediaType, url: string, metadata?: MediaViewerState['metadata'], fileName?: string) => void;
    closeMedia: () => void;
}

const MediaViewerContext = createContext<MediaViewerContextValue | undefined>(undefined);

export const MediaViewerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<MediaViewerState>({
        isOpen: false,
        mediaType: null,
        mediaUrl: null,
        metadata: undefined,
    });

    const openMedia = (type: MediaType, url: string, metadata?: MediaViewerState['metadata'], fileName?: string) => {
        setState({
            isOpen: true,
            mediaType: type,
            mediaUrl: url,
            fileName,
            metadata,
        });
    };

    const closeMedia = () => {
        setState({
            isOpen: false,
            mediaType: null,
            mediaUrl: null,
            fileName: undefined,
            metadata: undefined,
        });
    };

    return (
        <MediaViewerContext.Provider value={{ state, openMedia, closeMedia }}>
            {children}
        </MediaViewerContext.Provider>
    );
};

export const useMediaViewer = () => {
    const context = useContext(MediaViewerContext);
    if (!context) {
        throw new Error('useMediaViewer must be used within MediaViewerProvider');
    }
    return context;
};
