declare global {
  interface Window {
    updateConversationMessages?: () => void;
  }
}

export {};
