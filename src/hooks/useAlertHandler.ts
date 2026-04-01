import { useState, useCallback } from 'react';
import type { User } from '../types';

interface AlertHandler {
  showAlert: boolean;
  alertSender: User | null;
  currentAlertAudio: HTMLAudioElement | null;
  handleShowAlert: (sender: User) => void;
  handleCloseAlert: () => void;
  handleAcceptAlert: () => void;
  handleRejectAlert: () => void;
}

export const useAlertHandler = (onAccept?: () => void, onReject?: () => void): AlertHandler => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertSender, setAlertSender] = useState<User | null>(null);
  const [currentAlertAudio, setCurrentAlertAudio] = useState<HTMLAudioElement | null>(null);

  const handleShowAlert = useCallback((sender: User) => {
    setAlertSender(sender);
    setShowAlert(true);
    
    // Play alert sound if needed
    const audio = new Audio('/path/to/alert-sound.mp3');
    audio.play().catch(e => console.error('Error playing alert sound:', e));
    setCurrentAlertAudio(audio);
  }, []);

  const handleCloseAlert = useCallback(() => {
    setShowAlert(false);
    setAlertSender(null);
    
    // Stop and clean up audio
    if (currentAlertAudio) {
      currentAlertAudio.pause();
      currentAlertAudio.currentTime = 0;
      setCurrentAlertAudio(null);
    }
  }, [currentAlertAudio]);

  const handleAcceptAlert = useCallback(() => {
    onAccept?.();
    handleCloseAlert();
  }, [onAccept, handleCloseAlert]);

  const handleRejectAlert = useCallback(() => {
    onReject?.();
    handleCloseAlert();
  }, [onReject, handleCloseAlert]);

  return {
    showAlert,
    alertSender,
    currentAlertAudio,
    handleShowAlert,
    handleCloseAlert,
    handleAcceptAlert,
    handleRejectAlert
  };
};
