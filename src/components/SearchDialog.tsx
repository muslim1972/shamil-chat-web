import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Camera, Image, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchStore } from '@/stores/searchStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

interface SearchDialogProps {
  onOpenConversation: (userId: string) => void;
  onGenerateQR: () => void;
  onOpenCamera: () => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({
  onOpenConversation,
  onGenerateQR,
  onOpenCamera
}) => {
  const [searchText, setSearchText] = useState('');
  const [showQRMenu, setShowQRMenu] = useState(false);
  const { addToSearchHistory } = useSearchStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qrMenuRef = useRef<HTMLDivElement>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users', searchText],
    queryFn: async () => {
      if (!searchText.trim()) return [];
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, username, email, display_name, avatar_url');
      if (allUsersError) {
        toast.error('حدث خطأ أثناء البحث في قاعدة البيانات');
        return [];
      }
      if (!allUsers) return [];
      const searchLower = searchText.trim().toLowerCase();
      return allUsers.filter((u) =>
        (u.username && u.username.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.display_name && u.display_name.toLowerCase().includes(searchLower))
      );
    },
    enabled: searchText.length > 0,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qrMenuRef.current && !qrMenuRef.current.contains(event.target as Node)) {
        setShowQRMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSelect = (user: User) => {
    addToSearchHistory(user.username);
    onOpenConversation(user.id);
    setSearchText('');
    toast.success(`تم فتح محادثة مع ${user.username}`);
  };

  const handleGenerateQR = () => {
    setShowQRMenu(false);
    onGenerateQR();
  };

  const handleOpenCamera = () => {
    setShowQRMenu(false);
    onOpenCamera();
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--primary)]" />
        <Input
          ref={searchInputRef}
          placeholder="ابحث عن مستخدم بالاسم أو البريد الإلكتروني"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10 pr-12 py-3 text-right border-2 rounded-lg shadow-sm transition-colors placeholder:text-slate-400"
          style={{ 
            background: 'var(--conversation-card-bg)', 
            borderColor: 'var(--shagram-border)',
            color: 'var(--shagram-text)' 
          }}
          dir="rtl"
        />
        {searchText && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchText('')}
              className="h-8 w-8 rounded-full"
              style={{ color: 'var(--primary)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQRMenu && (
          <motion.div
            ref={qrMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 mt-1 w-56 border rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ 
              background: 'var(--conversation-card-bg)', 
              borderColor: 'var(--shagram-border)' 
            }}
          >
            <div className="p-3 border-b" style={{ background: 'var(--header-bg)', borderColor: 'var(--shagram-border)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--primary)' }}>خيارات QR</div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-none p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              onClick={handleGenerateQR}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center ml-3">
                  <Image className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-right">
                  <div className="font-medium" style={{ color: 'var(--shagram-text)' }}>من الاستوديو</div>
                  <div className="text-xs" style={{ color: 'var(--shagram-text-muted)' }}>إنشاء رمز QR من صورة</div>
                </div>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-none p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-t border-slate-100 dark:border-slate-700"
              onClick={handleOpenCamera}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center ml-3">
                  <Camera className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-800 dark:text-slate-100">باستخدام الكاميرا</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">فتح الكاميرا لمسح QR</div>
                </div>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-1 w-full border rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto"
            style={{ 
              background: 'var(--conversation-card-bg)', 
              borderColor: 'var(--shagram-border)' 
            }}
          >
            {isLoading ? (
              <div className="p-6 text-center flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                <div className="text-indigo-600 dark:text-indigo-400 font-medium">جاري البحث...</div>
              </div>
            ) : users && users.length > 0 ? (
              <>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">نتائج البحث</div>
                </div>
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    whileHover={{ backgroundColor: "var(--conversation-card-hover)" }}
                    className="p-4 cursor-pointer border-b transition-colors"
                    style={{ borderColor: 'var(--shagram-border)' }}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full ml-3 border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ml-3 text-white font-bold shadow-md">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold" style={{ color: 'var(--shagram-text)' }}>{user.username}</div>
                      </div>
                      <div className="text-indigo-500 dark:text-indigo-400">
                        <MessageSquarePlus size={18} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="text-slate-400 dark:text-slate-500 mb-2">
                  <Search size={32} className="mx-auto" />
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium">لا يوجد مستخدمين بهذا الاسم</div>
                <div className="text-sm text-slate-400 dark:text-slate-500 mt-1">جرب كلمات مفتاحية أخرى</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchDialog;
