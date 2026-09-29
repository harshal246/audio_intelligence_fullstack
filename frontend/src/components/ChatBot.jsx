import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Plus, 
  Calendar, 
  MessageSquare, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import { marked } from 'marked';
import { askQuestionApi, fetchChatSessionsApi, deleteChatSessionApi } from '../api';

export default function ChatBot({ isAuthenticated, onRequireAuth, initialQuery = '' }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState(initialQuery || '');
  const [targetDate, setTargetDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  // Quick suggestion chips
  const suggestions = [
    "What were the key takeaways from my latest meeting?",
    "List all action items and assigned tasks.",
    "Who participated in the discussions and what were their main points?",
    "Were there any upcoming deadlines or milestones mentioned?",
    "Summarize what was decided regarding project goals.",
  ];

  const loadSessions = async (dateFilter = targetDate, autoSelectLatest = true) => {
    if (!isAuthenticated) return;
    setIsFetchingSessions(true);
    try {
      const data = await fetchChatSessionsApi(dateFilter || null);
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList);

      // Auto-select latest session if none is selected
      if (sessionList.length > 0) {
        if (!currentSessionId && autoSelectLatest) {
          const latest = sessionList[0];
          setCurrentSessionId(latest.id);
          setMessages(latest.history || []);
        } else if (currentSessionId) {
          const match = sessionList.find(s => s.id === currentSessionId);
          if (match && match.history && match.history.length > 0) {
            setMessages(match.history);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load sessions:", err);
    } finally {
      setIsFetchingSessions(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions(targetDate, true);
    }
  }, [isAuthenticated, targetDate]);

  useEffect(() => {
    if (initialQuery) {
      setQuestion(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectSession = (session) => {
    setCurrentSessionId(session.id);
    if (session.history && Array.isArray(session.history)) {
      setMessages(session.history);
    } else {
      setMessages([]);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation history?")) return;

    try {
      await deleteChatSessionApi(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
          setMessages(remaining[0].history || []);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      alert("Error deleting conversation: " + err.message);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setQuestion('');
  };

  const handleSend = async (overrideQuestion = null) => {
    const textToSend = overrideQuestion || question;
    if (!textToSend.trim()) return;

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    const userMessage = {
      role: 'user',
      content: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await askQuestionApi({
        question: textToSend.trim(),
        sessionId: currentSessionId,
        targetDate: targetDate || null,
      });

      setCurrentSessionId(res.session_id);

      if (res.history && Array.isArray(res.history)) {
        setMessages(res.history);
      } else {
        const botMessage = {
          role: 'assistant',
          content: res.answer,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }

      // Refresh sessions in background
      loadSessions();
    } catch (err) {
      setError(err.message || 'Failed to get answer from AI bot.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render markdown safely
  const renderMarkdown = (content) => {
    try {
      const html = marked.parse(content || '');
      return { __html: html };
    } catch {
      return { __html: content };
    }
  };

  return (
    <div className="chatbot-layout">
      {/* Sessions Sidebar */}
      <aside className="chatbot-sidebar">
        <div className="sidebar-top">
          <button className="new-chat-btn primary-glow-btn" onClick={handleNewSession}>
            <Plus size={18} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="date-filter-box">
          <label className="filter-label">
            <Calendar size={14} />
            <span>Filter Transcripts by Date</span>
          </label>
          <div className="date-input-wrapper">
            <input
              type="date"
              className="custom-date-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            {targetDate && (
              <button 
                className="clear-date-btn" 
                onClick={() => setTargetDate('')}
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="sessions-list-header">
          <span className="sessions-header-title">Chat History</span>
          <button 
            className="icon-refresh-btn" 
            onClick={() => loadSessions()} 
            title="Refresh sessions"
            disabled={isFetchingSessions}
          >
            <RefreshCw size={14} className={isFetchingSessions ? 'spinning' : ''} />
          </button>
        </div>

        <div className="sessions-scroll-view">
          {sessions.length > 0 ? (
            sessions.map((sess) => {
              const isSelected = sess.id === currentSessionId;
              const dateDisplay = sess.created_at
                ? new Date(sess.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : '';

              return (
                <div
                  key={sess.id}
                  className={`session-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectSession(sess)}
                >
                  <div className="session-icon">
                    <MessageSquare size={16} />
                  </div>
                  <div className="session-info">
                    <h4 className="session-title">{sess.title || 'Conversation'}</h4>
                    <div className="session-meta">
                      {dateDisplay && <span className="session-date">{dateDisplay}</span>}
                      {sess.message_count > 0 && (
                        <span className="session-count">{sess.message_count} messages</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="session-delete-action-btn"
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    title="Delete conversation history"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="sidebar-empty-state">
              <MessageSquare size={24} className="faint-icon" />
              <p>No active sessions</p>
              <span>Ask a question to start your first chat</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Conversation Container */}
      <main className="chatbot-main-area">
        {/* Header Bar */}
        <div className="chat-header-bar">
          <div className="bot-status-wrapper">
            <div className="bot-avatar-glow">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="bot-title">Audio Intelligence RAG Assistant</h3>
              <p className="bot-subtitle">
                {targetDate 
                  ? `Answering using transcript vector memories from ${targetDate}`
                  : 'Answering using semantic vector search across all your audio records'}
              </p>
            </div>
          </div>

          {currentSessionId && (
            <span className="session-badge">Session: {currentSessionId.slice(0, 8)}...</span>
          )}
        </div>

        {/* Message Stream */}
        <div className="chat-messages-stream">
          {messages.length === 0 ? (
            <div className="chat-welcome-state">
              <div className="welcome-avatar-icon">
                <Sparkles size={36} />
              </div>
              <h2 className="welcome-title">Ask anything about your audio recordings</h2>
              <p className="welcome-desc">
                The AI assistant uses pgvector semantic search to locate exact discussion excerpts, speaker remarks, and meeting decisions.
              </p>

              <div className="suggestions-grid">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    className="suggestion-pill-card"
                    onClick={() => handleSend(sug)}
                  >
                    <MessageSquare size={14} className="sug-icon" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const msgKey = msg.id || index;
              return (
                <div key={msgKey} className={`message-row ${isUser ? 'user-row' : 'bot-row'}`}>
                  <div className="message-avatar">
                    {isUser ? <User size={16} /> : <Bot size={18} />}
                  </div>

                  <div className="message-bubble-wrapper">
                    <div className="bubble-header">
                      <span className="bubble-sender">{isUser ? 'You' : 'Audio Intelligence Bot'}</span>
                      {msg.created_at && (
                        <span className="bubble-timestamp">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!isUser && (
                        <button
                          className="copy-bubble-btn"
                          onClick={() => handleCopyMessage(msg.content, msgKey)}
                          title="Copy reply"
                        >
                          {copiedId === msgKey ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    <div className="message-bubble-content">
                      {isUser ? (
                        <p>{msg.content}</p>
                      ) : (
                        <div 
                          className="markdown-formatted-body"
                          dangerouslySetInnerHTML={renderMarkdown(msg.content)} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="message-row bot-row loading-row">
              <div className="message-avatar">
                <Bot size={18} />
              </div>
              <div className="message-bubble-wrapper">
                <div className="typing-indicator-box">
                  <span className="dot dot-1"></span>
                  <span className="dot dot-2"></span>
                  <span className="dot dot-3"></span>
                  <span className="typing-label">Searching vector embeddings & generating answer...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error notification */}
        {error && (
          <div className="chat-error-bar">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="chat-input-container">
          <div className="input-textarea-wrapper">
            <textarea
              className="chat-textarea"
              rows={2}
              placeholder="Ask a question about your transcripts... (Press Enter to send, Shift+Enter for newline)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="send-msg-btn primary-glow-btn"
              onClick={() => handleSend()}
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <Send size={18} />}
            </button>
          </div>
          <div className="chat-input-hint">
            <span>Powered by Gemini 2.5 Flash & pgvector embeddings</span>
          </div>
        </div>
      </main>
    </div>
  );
}
