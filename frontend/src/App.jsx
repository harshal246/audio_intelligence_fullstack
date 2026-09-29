import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TranscribeStudio from './components/TranscribeStudio';
import ChatBot from './components/ChatBot';
import SummaryStudio from './components/SummaryStudio';
import TranscriptArchive from './components/TranscriptArchive';
import AuthModal from './components/AuthModal';
import ApiSettingsModal from './components/ApiSettingsModal';
import { 
  getAccessToken, 
  getUserEmail, 
  clearAuthData, 
  logoutApi, 
  checkServerHealthApi,
  fetchTranscriptsApi
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('transcribe'); // 'transcribe' | 'chat' | 'summary' | 'archive'
  const [userEmail, setUserEmail] = useState(() => getUserEmail());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [transcriptCount, setTranscriptCount] = useState(0);

  // Check health periodically
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const ok = await checkServerHealthApi();
      if (isMounted) setIsOnline(ok);
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update transcript count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTranscriptsApi()
        .then((res) => {
          if (res?.transcripts) {
            setTranscriptCount(res.transcripts.length);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, activeTab]);

  const handleAuthSuccess = (email) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await logoutApi();
    clearAuthData();
    setUserEmail(null);
    setIsAuthenticated(false);
  };

  const handleTranscriptCreated = () => {
    setTranscriptCount((prev) => prev + 1);
  };

  const [initialChatQuery, setInitialChatQuery] = useState('');

  const handleSwitchToChat = (query = '') => {
    setActiveTab('chat');
    if (query) {
      setInitialChatQuery(query);
    }
  };

  return (
    <div className="app-root-container">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isOnline={isOnline}
        transcriptCount={transcriptCount}
      />

      {/* Main Workspace Body */}
      <main className="main-content-viewport">
        {/* Banner if not signed in */}
        {!isAuthenticated && (
          <div className="auth-alert-banner">
            <div className="banner-content">
              <span className="banner-sparkle">✨</span>
              <span>
                You are currently in guest mode. <strong>Sign in or create an account</strong> to save diarized transcripts, generate summaries, and interact with the AI assistant.
              </span>
            </div>
            <button className="banner-cta-btn" onClick={() => setIsAuthModalOpen(true)}>
              Sign In / Register
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'transcribe' && (
          <TranscribeStudio
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onSwitchToChat={handleSwitchToChat}
            onTranscriptCreated={handleTranscriptCreated}
          />
        )}

        {activeTab === 'chat' && (
          <ChatBot
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            initialQuery={initialChatQuery}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryStudio
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'archive' && (
          <TranscriptArchive
            isAuthenticated={isAuthenticated}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onSwitchToChat={handleSwitchToChat}
            onUpdateCount={(count) => setTranscriptCount(count)}
          />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ApiSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onUrlChanged={() => {
          checkServerHealthApi().then(setIsOnline);
        }}
      />
    </div>
  );
}
