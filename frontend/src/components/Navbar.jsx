import React from 'react';
import { 
  Mic, 
  Bot, 
  FileText, 
  FolderArchive, 
  Settings, 
  LogIn, 
  LogOut, 
  User, 
  Activity, 
  Wifi, 
  WifiOff,
  Sparkles
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  userEmail,
  onOpenAuth,
  onLogout,
  onOpenSettings,
  isOnline,
  transcriptCount = 0
}) {
  const navItems = [
    { id: 'transcribe', label: 'Transcribe Studio', icon: Mic, badge: 'Live Mic' },
    { id: 'chat', label: 'Audio Q&A Bot', icon: Bot, badge: 'RAG' },
    { id: 'summary', label: 'Executive Summaries', icon: FileText, badge: 'AI Insights' },
    { id: 'archive', label: 'Transcripts Library', icon: FolderArchive, count: transcriptCount },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-brand-section" onClick={() => setActiveTab('transcribe')}>
        <div className="logo-badge">
          <div className="soundwave-bars">
            <span className="bar bar-1"></span>
            <span className="bar bar-2"></span>
            <span className="bar bar-3"></span>
            <span className="bar bar-4"></span>
          </div>
          <Sparkles className="logo-sparkle" size={14} />
        </div>
        <div className="brand-titles">
          <h1 className="brand-name">AudioPulse <span className="brand-gradient">AI</span></h1>
          <span className="brand-tagline">Multi-Speaker Diarization & Intelligence</span>
        </div>
      </div>

      <nav className="navbar-tabs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} className="tab-icon" />
              <span className="tab-label">{item.label}</span>
              {item.badge && <span className="tab-pill-badge">{item.badge}</span>}
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="tab-count-badge">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="navbar-actions">
        {/* Backend Connectivity Status */}
        <div 
          className={`status-pill ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Connected to Backend API' : 'Cannot reach Backend API'}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="status-text">{isOnline ? 'API Connected' : 'Offline'}</span>
        </div>

        {/* Server Settings */}
        <button 
          className="icon-action-btn" 
          onClick={onOpenSettings} 
          title="Configure API Endpoint"
        >
          <Settings size={18} />
        </button>

        {/* User Account */}
        {userEmail ? (
          <div className="user-profile-menu">
            <div className="user-info-chip" title={userEmail}>
              <div className="avatar-circle">
                <User size={14} />
              </div>
              <span className="user-email-text">{userEmail}</span>
            </div>
            <button 
              className="logout-action-btn" 
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="btn-text">Sign Out</span>
            </button>
          </div>
        ) : (
          <button className="login-action-btn" onClick={onOpenAuth}>
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
