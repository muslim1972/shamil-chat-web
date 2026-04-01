import React from 'react';

interface GroupAvatarsProps {
  participants: Array<{
    id: string;
    username: string;
    avatar_url?: string;
  }>;
  size?: 'small' | 'medium' | 'large';
  maxDisplay?: number;
}

export const GroupAvatars: React.FC<GroupAvatarsProps> = ({ 
  participants, 
  size = 'medium',
  maxDisplay = 4 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12'
  };
  
  const displayParticipants = participants.slice(0, maxDisplay);
  const remaining = participants.length - maxDisplay;

  return (
    <div className="flex -space-x-2">
      {displayParticipants.map((participant, index) => (
        <div
          key={participant.id}
          className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-gray-800 overflow-hidden`}
          style={{ zIndex: displayParticipants.length - index }}
        >
          {participant.avatar_url ? (
            <img
              src={participant.avatar_url}
              alt={participant.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              {participant.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold text-xs`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};