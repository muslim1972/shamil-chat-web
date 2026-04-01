import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useUsers';
import type { User } from '../types';

const UserListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { users, loading, error, createConversation } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleCreateConversation = async (userId: string) => {
    try {
      const conversationId = await createConversation(userId);
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (error) {
      console.error('فشل إنشاء المحادثة:', error);
    }
  };

  const handleBack = () => {
    navigate('/conversations');
  };

  const filteredUsers = (users || []).filter(user =>
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل المستخدمين...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">حدث خطأ</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 shadow-md flex items-center">
        <button
          onClick={handleBack}
          className="mr-2 p-2 rounded-full hover:bg-indigo-500 transition-colors"
          aria-label="العودة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold">محادثة جديدة</h2>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="بحث عن مستخدم..."
            className="w-full p-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {filteredUsers.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {searchTerm ? 'لا يوجد مستخدمون يطابقون بحثك' : 'لا يوجد مستخدمون'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((userItem: User) => (
              <li
                key={userItem.id}
                className="p-4 hover:bg-gray-100 cursor-pointer transition-colors flex items-center"
                onClick={() => handleCreateConversation(userItem.id)}
              >
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold overflow-hidden">
                  {userItem.avatar_url ? (
                    <img 
                      src={userItem.avatar_url} 
                      alt={userItem.username || 'مستخدم'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (userItem.username || '#').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {userItem.username || 'مستخدم غير معروف'}
                  </h3>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserListScreen;
