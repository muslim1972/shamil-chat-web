// AttachmentMenu Component
// This component displays the attachment options menu

import React from 'react';

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onPickMedia: (type: "image" | "video" | "audio" | "document") => Promise<void>;
  onSendLocation: () => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  isOpen,
  onClose,
  onPickMedia,
  onSendLocation
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* طبقة خلفية لإغلاق القائمة عند النقر في أي مكان آخر */}
      <div 
        className="fixed inset-0 z-10" 
        onClick={onClose}
      />
      <div className="absolute bottom-16 left-2 bg-white rounded-lg shadow-xl z-20 w-56 border border-gray-100">
      <ul>
        <li
          className="p-3 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700"
          onClick={() => {
            onPickMedia("image");
            onClose();
          }}
        >
          🖼️ صور
        </li>
        <li
          className="p-3 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700"
          onClick={() => {
            onPickMedia("video");
            onClose();
          }}
        >
          🎥 فيديوهات
        </li>
        <li
          className="p-3 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700"
          onClick={() => {
            onPickMedia("audio");
            onClose();
          }}
        >
          🎵 مقطع صوتي
        </li>
        <li
          className="p-3 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700"
          onClick={() => {
            onSendLocation();
            onClose();
          }}
        >
          📍 موقع
        </li>
        <li 
          className="p-3 hover:bg-gray-100 cursor-pointer flex items-center text-gray-700" 
          onClick={() => {
            onPickMedia("document");
            onClose();
          }}
        >
          📄 ملف
        </li>
      </ul>
    </div>
    </>
  );
};