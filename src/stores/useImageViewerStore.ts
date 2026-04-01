import { create } from 'zustand';

interface ImageViewerState {
    isOpen: boolean;
    src: string | null;
    alt?: string;
    openImage: (src: string, alt?: string) => void;
    closeImage: () => void;
}

export const useImageViewerStore = create<ImageViewerState>((set) => ({
    isOpen: false,
    src: null,
    alt: undefined,
    openImage: (src, alt) => set({ isOpen: true, src, alt }),
    closeImage: () => set({ isOpen: false, src: null, alt: undefined }),
}));
