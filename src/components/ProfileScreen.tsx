import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Check, X, Camera, QrCode, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { UserService } from '../services/UserService';
import { StorageService } from '../services/StorageService';
import { Capacitor } from '@capacitor/core';
import { QRCodeDialog } from './profile/QRCodeDialog';
import { PhoneUpdateDialog } from './profile/PhoneUpdateDialog';
import { shareQRImage } from '../utils/qrUtils';

export const ProfileScreen: React.FC<{ userIdOverride?: string; backTo?: string; children?: React.ReactNode }> = ({ userIdOverride, backTo, children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const isViewingOwn = !routeUserId || routeUserId === user?.id;
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    display_name: '',
    avatar_url: '',
    phone_number: ''
  });
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    vibration: true,
    sound: true
  });
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);

  // QR Code States
  const [showQRMenu, setShowQRMenu] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [userQR, setUserQR] = useState<string | null>(null);
  const qrMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // إغلاق قائمة QR والتنبيهات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qrMenuRef.current && !qrMenuRef.current.contains(event.target as Node)) {
        setShowQRMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationOptions(false);
      }
    };
    if (showQRMenu || showNotificationOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQRMenu, showNotificationOptions]);

  useEffect(() => {
    const fetchUserData = async () => {
      const targetUserId = userIdOverride || routeUserId || user?.id;
      if (targetUserId) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('username, email, display_name, avatar_url, phone_number')
            .eq('id', targetUserId)
            .single();

          // جلب رمز QR من جدول profiles
          try {
            const { data: profileData, error: qrError } = await supabase
              .from('profiles')
              .select('user_qr')
              .eq('id', targetUserId)
              .maybeSingle();

            if (!qrError && profileData?.user_qr) {
              setUserQR(profileData.user_qr);
            }
          } catch (e) {
            console.warn('QR not found or profiles table issue:', e);
          }

          if (error) {
            console.error('Error fetching user data:', error);
          } else if (data) {
            setUserData({
              username: data.username || '',
              email: data.email || '',
              display_name: data.display_name || '',
              avatar_url: data.avatar_url || '',
              phone_number: data.phone_number || ''
            });
          }

          const savedSettings = await StorageService.getNotificationSettings();
          if (savedSettings) {
            setNotificationSettings(savedSettings);
          }
        } catch (error) {
          console.error('Error in fetchUserData:', error);
        }
      }
    };

    fetchUserData();
  }, [user, userIdOverride, routeUserId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backTo || '/conversations');
    }
  };

  const handleEditUsername = () => {
    setTempUsername(userData.username);
    setEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
    setEditingUsername(false);
    setTempUsername('');
    setMessage(null);
  };

  const handleSaveUsername = async () => {
    if (!isViewingOwn) return;
    const targetUserId = userIdOverride || user?.id;
    if (!targetUserId || !tempUsername.trim()) return;

    setUpdating(true);
    setMessage(null);

    try {
      const result = await UserService.updateUsername(targetUserId, tempUsername.trim());

      if (result.success) {
        setUserData(prev => ({ ...prev, username: tempUsername.trim() }));
        setMessage({ text: 'تم تحديث اسم المستخدم بنجاح', type: 'success' });
        setEditingUsername(false);
      } else {
        setMessage({ text: result.error || 'فشل تحديث اسم المستخدم', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating username:', error);
      setMessage({ text: 'حدث خطأ أثناء تحديث اسم المستخدم', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleEditAvatar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }

    const file = e.target.files[0];
    setUpdating(true);
    setMessage(null);
    setAvatarMessage(null);

    try {
      const result = await UserService.uploadAvatar(user.id, file);

      if (result.success && result.avatarUrl) {
        setUserData(prev => ({ ...prev, avatar_url: result.avatarUrl || '' }));
        setAvatarMessage({ text: 'تم تحديث الصورة الشخصية بنجاح', type: 'success' });
      } else {
        setAvatarMessage({ text: result.error || 'فشل تحديث الصورة الشخصية', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setAvatarMessage({ text: 'حدث خطأ أثناء تحديث الصورة الشخصية', type: 'error' });
    } finally {
      setUpdating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQRGenerated = async (qrDataUrl: string) => {
    const targetUserId = userIdOverride || routeUserId || user?.id;
    if (!targetUserId) return;

    try {
      const result = await UserService.updateUserQR(targetUserId, qrDataUrl);
      if (result.success) {
        setUserQR(qrDataUrl);
      } else {
        console.error('Failed to save QR:', result.error);
      }
    } catch (error) {
      console.error('Exception saving QR:', error);
    }
  };

  const handleShareQR = async () => {
    setShowQRMenu(false);
    if (userQR) {
      await shareQRImage(userQR, `رمز QR - ${userData.username}`);
    } else {
      setShowQRDialog(true);
    }
  };

  const applyNotificationSettings = async (settings: typeof notificationSettings) => {
    try {
      await StorageService.saveNotificationSettings(settings);
      setMessage({ text: 'تم حفظ إعدادات الإشعارات بنجاح', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error applying notification settings:', error);
      setMessage({ text: 'فشل حفظ إعدادات الإشعارات', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Back Button */}
      <div className="p-4 flex items-center gap-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <button onClick={handleBack} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">الملف الشخصي</h1>
      </div>

      <div className="flex-1 overflow-auto p-0 md:p-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 shadow-sm md:rounded-2xl mb-6 relative">
          <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 rounded-t-lg md:rounded-t-2xl" />

          <div className="px-4 pb-6">
            <div className="flex flex-col items-center -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden shadow-md bg-gray-200 dark:bg-gray-700">
                  {userData.avatar_url ? (
                    <img src={userData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Camera size={32} />
                    </div>
                  )}
                </div>
                {isViewingOwn && (
                  <>
                    <button onClick={handleEditAvatar} className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full border-2 border-white dark:border-gray-800 shadow-sm hover:bg-indigo-700">
                      <Camera size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  </>
                )}
              </div>

              {/* Name & Username */}
              <div className="text-center mt-3">
                <div className="flex items-center justify-center gap-2">
                  {editingUsername ? (
                    <div className="flex items-center gap-2">
                      <input value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-center" autoFocus />
                      <button onClick={handleSaveUsername} className="text-green-500"><Check size={20} /></button>
                      <button onClick={handleCancelEditUsername} className="text-red-500"><X size={20} /></button>
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {userData.display_name || userData.username || 'مستخدم'}
                    </h2>
                  )}
                  {isViewingOwn && !editingUsername && (
                    <button onClick={handleEditUsername} className="text-gray-400 hover:text-indigo-500"><Edit size={16} /></button>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">@{userData.username}</p>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-6 mt-6">
                <button onClick={() => isViewingOwn && setShowPhoneDialog(true)} className={`flex flex-col items-center gap-1 ${!userData.phone_number ? 'opacity-60' : ''}`} disabled={!isViewingOwn}>
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <Phone size={20} />
                  </div>
                  <span className="text-[10px] text-gray-500">الهاتف</span>
                </button>

                <div className="relative" ref={qrMenuRef}>
                  <button onClick={() => setShowQRMenu(!showQRMenu)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <QrCode size={20} />
                    </div>
                    <span className="text-[10px] text-gray-500">QR</span>
                  </button>
                  {showQRMenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 min-w-[120px] overflow-hidden">
                      <button onClick={() => { setShowQRMenu(false); setShowQRDialog(true); }} className="w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-right font-medium">عرض</button>
                      <button onClick={handleShareQR} className="w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-right font-medium">مشاركة</button>
                    </div>
                  )}
                </div>

                <button onClick={() => isViewingOwn && setShowNotificationOptions(!showNotificationOptions)} className="flex flex-col items-center gap-1" disabled={!isViewingOwn}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${notificationSettings.enabled ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-red-50 text-red-500'}`}>
                    {notificationSettings.enabled ? <span className="text-xl">🔔</span> : <X size={20} />}
                  </div>
                  <span className="text-[10px] text-gray-500">تنبيهات</span>
                </button>
              </div>

              {showNotificationOptions && isViewingOwn && (
                <div ref={notificationRef} className="w-full max-w-xs mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 animate-fade-in border border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">تفعيل الإشعارات</span>
                    <input type="checkbox" checked={notificationSettings.enabled} onChange={(e) => { const s = { ...notificationSettings, enabled: e.target.checked }; setNotificationSettings(s); applyNotificationSettings(s); }} className="w-5 h-5 accent-indigo-600" />
                  </div>
                  {notificationSettings.enabled && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <label className="flex items-center justify-between cursor-pointer">
                         <span className="text-sm text-gray-600 dark:text-gray-400">اهتزاز</span>
                         <input type="checkbox" checked={notificationSettings.vibration} onChange={(e) => { const s = { ...notificationSettings, vibration: e.target.checked }; setNotificationSettings(s); applyNotificationSettings(s); }} className="w-4 h-4 accent-indigo-600" />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600 dark:text-gray-400">صوت التنبيه</span>
                        <input type="checkbox" checked={notificationSettings.sound} onChange={(e) => { const s = { ...notificationSettings, sound: e.target.checked }; setNotificationSettings(s); applyNotificationSettings(s); }} className="w-4 h-4 accent-indigo-600" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              {(message || avatarMessage) && (
                <div className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium ${(message?.type || avatarMessage?.type) === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message?.text || avatarMessage?.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children (Placeholder for shared media or extra info) */}
        <div className="px-4">
          {children}
        </div>
      </div>

      {/* QR Code Dialog */}
      <QRCodeDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        username={userData.username}
        email={userData.email}
        existingQR={userQR}
        onQRGenerated={handleQRGenerated}
      />

      {/* Phone Update Dialog */}
      <PhoneUpdateDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        currentPhoneNumber={userData.phone_number}
      />
    </div>
  );
};
