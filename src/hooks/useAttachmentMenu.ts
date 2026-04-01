import { useState } from 'react';

interface AttachmentMenuState {
  isAttachmentMenuOpen: boolean;
  openAttachmentMenu: () => void;
  closeAttachmentMenu: () => void;
  toggleAttachmentMenu: () => void;
}

export function useAttachmentMenu(): AttachmentMenuState {
  const [isAttachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  const openAttachmentMenu = () => {
    setAttachmentMenuOpen(true);
  };

  const closeAttachmentMenu = () => {
    setAttachmentMenuOpen(false);
  };

  const toggleAttachmentMenu = () => {
    setAttachmentMenuOpen(prev => !prev);
  };

  return {
    isAttachmentMenuOpen,
    openAttachmentMenu,
    closeAttachmentMenu,
    toggleAttachmentMenu,
  };
}