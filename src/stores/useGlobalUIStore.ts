import { create } from 'zustand';

interface GlobalUIState {
  activeScreen: 'home' | 'chat' | 'conversations' | 'profile' | 'settings';
  selectionMode: 'none' | 'messages' | 'conversations';
  selectedItems: any[];

  setActiveScreen: (screen: 'home' | 'chat' | 'conversations' | 'profile' | 'settings') => void;
  setSelectionMode: (mode: 'none' | 'messages' | 'conversations') => void;
  setSelectedItems: (items: any[]) => void;
  clearSelection: () => void;
  toggleSelectedItem: (item: any, type: 'message' | 'conversation') => void;

  triggerAction: (actionType: 'deleteForMe' | 'deleteForAll' | 'pin' | 'forward' | 'info' | 'edit' | 'share' | 'deleteConversation' | 'deleteConversationForAll' | 'archiveConversation' | 'reply') => void;
  lastTriggeredAction: { type: string; timestamp: number } | null;
  clearLastTriggeredAction: () => void;

  isKeyboardVisible: boolean;
  setKeyboardVisible: (visible: boolean) => void;
}

export const useGlobalUIStore = create<GlobalUIState>((set, get) => ({
  activeScreen: 'conversations',
  selectionMode: 'none',
  selectedItems: [],
  lastTriggeredAction: null,
  isKeyboardVisible: false,

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSelectedItems: (items) => set({ selectedItems: items }),
  clearSelection: () => set({ selectionMode: 'none', selectedItems: [] }),
  clearLastTriggeredAction: () => set({ lastTriggeredAction: null }),
  setKeyboardVisible: (visible) => set({ isKeyboardVisible: visible }),

  toggleSelectedItem: (item, type) => {
    const { selectedItems, selectionMode } = get();
    const isSelected = selectedItems.some(sItem => sItem.id === item.id);

    if (isSelected) {
      const newSelectedItems = selectedItems.filter(sItem => sItem.id !== item.id);
      if (newSelectedItems.length === 0) {
        set({ selectedItems: [], selectionMode: 'none' });
      } else {
        set({ selectedItems: newSelectedItems });
      }
    } else {
      // ✨ Shamli: For conversations, always enforce single selection
      if (type === 'conversation') {
        set({ selectedItems: [item], selectionMode: 'conversations' });
        return;
      }

      // Logic for messages
      if (selectionMode !== 'messages') {
        set({ selectedItems: [item], selectionMode: 'messages' });
      } else {
        set({ selectedItems: [...selectedItems, item] });
      }
    }
  },

  triggerAction: (actionType) => {
    set({ lastTriggeredAction: { type: actionType, timestamp: Date.now() } });
  },
}));