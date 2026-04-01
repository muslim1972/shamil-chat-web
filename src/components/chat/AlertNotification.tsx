import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';

interface AlertNotificationProps {
  sender: User;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}

export const AlertNotification: React.FC<AlertNotificationProps> = ({
  sender,
  onAccept,
  onReject,
  isVisible,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible && !isPlaying) {
      playSound();
    }
    return () => {
      stopSound();
    };
  }, [isVisible]);

  const playSound = () => {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.loop = true;
      audio.volume = 1.0;
      audio.play().then(() => {
        setIsPlaying(true);
        audioRef.current = audio;
      }).catch(e => {
        console.error('Error playing alert sound:', e);
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleAccept = () => {
    stopSound();
    onAccept();
  };

  const handleReject = () => {
    stopSound();
    onReject();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <div className="mb-4">
          <img 
            src={sender.avatar_url || '/default-avatar.png'} 
            alt={sender.username}
            className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-blue-500"
          />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {sender.username}
          </h3>
        </div>
        
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          أدخل إلى المحادثة، أحتاجك بشكل ضروري
        </p>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleReject}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            رفض
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            قبول
          </button>
        </div>
      </div>
    </div>
  );
};
