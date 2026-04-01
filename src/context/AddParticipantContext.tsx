import React, { createContext, useContext, useState } from 'react';

interface AddParticipantContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const AddParticipantContext = createContext<AddParticipantContextType | undefined>(undefined);

export const AddParticipantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AddParticipantContext.Provider value={{
      isOpen,
      openDialog: () => setIsOpen(true),
      closeDialog: () => setIsOpen(false),
    }}>
      {children}
    </AddParticipantContext.Provider>
  );
};

export const useAddParticipant = () => {
  const context = useContext(AddParticipantContext);
  if (!context) {
    throw new Error('useAddParticipant must be used within AddParticipantProvider');
  }
  return context;
};