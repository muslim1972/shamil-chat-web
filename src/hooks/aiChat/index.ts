// src/hooks/aiChat/index.ts
// ملف تصدير موحد لجميع هوكات AI

export { useAIChatWithImages } from './useAIChatWithImages';
export { useAIChatWithFiles } from './useAIChatWithFiles';
export { useAIConversationDetector } from './useAIConversationDetector';
export { useAIMessageHandler } from './useAIMessageHandler';
export { useImageSelection, type SelectedImage } from './useImageSelection';
export { useFileSelection, type SelectedFile, type FileType, ACCEPT_MIME, SUPPORTED_EXTENSIONS } from './useFileSelection';
export { useSendAIWithImages } from './useSendAIWithImages';

