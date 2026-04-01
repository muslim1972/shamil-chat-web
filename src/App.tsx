import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom';

// Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatBackgroundProvider } from './context/ChatBackgroundContext';
import { MediaViewerProvider } from './context/MediaViewerContext';
import { OnlinePresenceProvider } from './context/OnlinePresenceContext';
import { QueryProvider } from './providers/QueryProvider';
import { ForwardingProvider } from './context/ForwardingContext';
import { AddParticipantProvider } from './context/AddParticipantContext';
import { OptimizedCallAlertProvider } from './context/OptimizedCallAlertContext';
import { GlobalCallAlertProvider } from './context/GlobalCallAlertContext';

// Components
import { MainLayout } from './components/layout/MainLayout';
import { GlobalMediaViewer } from './components/media/GlobalMediaViewer';
import { GlobalNotificationsObserver } from './components/observers/GlobalNotificationsObserver';
import { Toaster } from 'react-hot-toast';

// Lazy Components (Vercel Performance Best Practice)
const AuthScreen = React.lazy(() => import('./components/AuthScreen.tsx'));
const ConversationListScreen = React.lazy(() => import('./components/ConversationListScreen.tsx'));
const ChatScreen = React.lazy(() => import('./components/ChatScreen.tsx'));
const ArchivedConversationsScreen = React.lazy(() => import('./components/ArchivedConversationsScreen.tsx'));
const UnifiedProfile = React.lazy(() => import('./components/profile/UnifiedProfile.tsx'));

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-400">جاري تحميل شات شامل...</div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center text-gray-400">جاري التحميل...</div>
      </div>
    }>
      <Routes>
        <Route path="/auth" element={!user ? <AuthScreen /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route element={user ? <Outlet /> : <Navigate to="/auth" />} >
          <Route path="/" element={<ConversationListScreen />} />
          <Route path="/chat/:conversationId" element={<ChatScreen />} />
          <Route path="/archived" element={<ArchivedConversationsScreen />} />
          <Route path="/profile" element={<UnifiedProfile />} />
          <Route path="/profile/:userId" element={<UnifiedProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ChatBackgroundProvider>
        <MediaViewerProvider>
          <QueryProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <AuthProvider>
              <GlobalNotificationsObserver />
              <OptimizedCallAlertProvider>
                <GlobalCallAlertProvider>
                  <OnlinePresenceProvider>
                    <BrowserRouter>
                      <ForwardingProvider>
                        <AddParticipantProvider>
                          <MainLayout hideNavigation={true}> {/* إخفاء تصفح التطبيق الشامل */}
                            <AppRoutes />
                          </MainLayout>
                        </AddParticipantProvider>
                      </ForwardingProvider>
                    </BrowserRouter>
                  </OnlinePresenceProvider>
                </GlobalCallAlertProvider>
              </OptimizedCallAlertProvider>
            </AuthProvider>
            <GlobalMediaViewer />
          </QueryProvider>
        </MediaViewerProvider>
      </ChatBackgroundProvider>
    </ThemeProvider>
  );
};

export default App;
