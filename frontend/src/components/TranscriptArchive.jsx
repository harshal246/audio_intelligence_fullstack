import React, { useState, useEffect } from 'react';
import { 
  FolderArchive, 
  Search, 
  Trash2, 
  Eye, 
  MessageSquare, 
  Clock, 
  FileAudio, 
  Play, 
  Pause, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  X,
  User,
  Copy,
  Check
} from 'lucide-react';
import { fetchTranscriptsApi, fetchTranscriptDetailsApi, deleteTranscriptApi, getApiBaseUrl } from '../api';

export default function TranscriptArchive({ 
  isAuthenticated, 
  onRequireAuth, 
  onSwitchToChat, 
  onUpdateCount 
}) {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Audio Playback state
  const [playingId, setPlayingId] = useState(null);
  const audioRefs = React.useRef({});

  // Details Modal
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalDetails, setModalDetails] = useState(null);
  const [copiedModal, setCopiedModal] = useState(false);

  // Helper to resolve relative audio URLs against backend base URL
  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = getApiBaseUrl().replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${base}${cleanPath}`;
  };

  const loadArchive = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTranscriptsApi();
      const list = (res && res.transcripts) || [];
      setTranscripts(list);
      setFilteredList(list);
      if (onUpdateCount) onUpdateCount(list.length);
    } catch (err) {
      setError(err.message || "Failed to load transcripts archive.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadArchive();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredList(transcripts);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredList(
        transcripts.filter(t => 
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.audio_filename && t.audio_filename.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, transcripts]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title || 'this transcript'}"? This will also remove its vector embeddings and associated summaries.`)) {
      return;
    }

    try {
      await deleteTranscriptApi(id);
      const updated = transcripts.filter(t => t.transcript_id !== id);
      setTranscripts(updated);
      if (onUpdateCount) onUpdateCount(updated.length);
    } catch (err) {
      alert("Error deleting transcript: " + err.message);
    }
  };

  const handleOpenDetails = async (transcript) => {
    setSelectedTranscript(transcript);
    setIsLoadingDetails(true);
    try {
      const details = await fetchTranscriptDetailsApi(transcript.transcript_id);
      setModalDetails(details.transcript || null);
    } catch (err) {
      alert("Error fetching full transcript details: " + err.message);
      setSelectedTranscript(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const toggleAudio = (id) => {
    const audioEl = audioRefs.current[id];
    if (!audioEl) return;

    if (playingId === id) {
      audioEl.pause();
      setPlayingId(null);
    } else {
      // Pause any previously playing audio
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      audioEl.play();
      setPlayingId(id);
    }
  };

  const formatSeconds = (sec) => {
    if (sec === undefined || sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSpeakerColorClass = (speaker) => {
    const speakerNum = parseInt((speaker || '').replace(/\D/g, ''), 10);
    const colors = ['speaker-cyan', 'speaker-violet', 'speaker-emerald', 'speaker-amber', 'speaker-pink'];
    if (isNaN(speakerNum)) return 'speaker-default';
    return colors[speakerNum % colors.length];
  };

  const handleCopyModalText = () => {
    if (!modalDetails?.full_transcript_data) return;
    const text = modalDetails.full_transcript_data
      .map(s => `[${s.speaker || 'SPEAKER'}] ${s.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedModal(true);
    setTimeout(() => setCopiedModal(false), 2000);
  };

  return (
    <div className="archive-layout">
      {/* Header bar */}
      <div className="archive-top-bar">
        <div className="archive-title-group">
          <div className="header-icon-box cyan-box">
            <FolderArchive size={22} />
          </div>
          <div>
            <h2 className="card-title">Transcripts & Recordings Library</h2>
            <p className="card-subtitle">Manage, playback, and review your historical diarized audio intelligence records</p>
          </div>
        </div>

        <div className="archive-controls">
          <div className="search-box-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by title or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <button 
            className="secondary-btn" 
            onClick={loadArchive}
            disabled={isLoading}
            title="Refresh transcripts list"
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Transcripts */}
      {isLoading ? (
        <div className="archive-loading-state">
          <Loader2 size={36} className="spinner-icon" />
          <p>Loading your transcripts archive...</p>
        </div>
      ) : filteredList.length > 0 ? (
        <div className="transcripts-grid">
          {filteredList.map((t) => {
            const hasAudio = Boolean(t.audio_url);
            const dateStr = t.processing_timestamp
              ? new Date(t.processing_timestamp).toLocaleDateString([], { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown date';

            return (
              <div key={t.transcript_id} className="transcript-grid-card">
                <div className="grid-card-top">
                  <div className="card-audio-pill">
                    <FileAudio size={14} />
                    <span className="card-filename" title={t.audio_filename}>
                      {t.audio_filename || 'manual_entry.txt'}
                    </span>
                  </div>

                  <span className="card-timestamp">
                    <Clock size={12} />
                    {dateStr}
                  </span>
                </div>

                <h3 className="grid-card-title">{t.title || 'Untitled Transcript'}</h3>

                {/* Audio Player preview if URL available */}
                {hasAudio && (
                  <div className="grid-card-audio-bar">
                    <audio
                      ref={(el) => (audioRefs.current[t.transcript_id] = el)}
                      src={getAudioUrl(t.audio_url)}
                      onEnded={() => setPlayingId(null)}
                    />
                    <button
                      className="audio-play-toggle-btn"
                      onClick={() => toggleAudio(t.transcript_id)}
                      title={playingId === t.transcript_id ? 'Pause audio' : 'Play audio'}
                    >
                      {playingId === t.transcript_id ? <Pause size={14} /> : <Play size={14} />}
                      <span>{playingId === t.transcript_id ? 'Pause' : 'Play Audio'}</span>
                    </button>
                  </div>
                )}

                {/* Embedded Summary Snippet */}
                {t.summary ? (
                  <div className="grid-card-summary-box">
                    <div className="summary-micro-tag">
                      <Sparkles size={12} className="sparkle-gold" />
                      <span>{t.summary.title || 'AI Summary'}</span>
                    </div>
                    <p className="summary-micro-text">
                      {t.summary.summary_text?.slice(0, 150)}
                      {t.summary.summary_text?.length > 150 ? '...' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="grid-card-empty-summary">
                    <span>No pre-generated summary attached</span>
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="grid-card-footer">
                  <button 
                    className="card-action-btn view-btn"
                    onClick={() => handleOpenDetails(t)}
                    title="View Speaker Diarization Segments"
                  >
                    <Eye size={14} />
                    <span>Diarization</span>
                  </button>

                  <button 
                    className="card-action-btn chat-btn"
                    onClick={() => onSwitchToChat && onSwitchToChat(`Tell me what was discussed in "${t.title || 'this session'}"`)}
                    title="Ask AI questions about this audio"
                  >
                    <MessageSquare size={14} />
                    <span>Chat</span>
                  </button>

                  <button 
                    className="card-action-btn delete-btn"
                    onClick={() => handleDelete(t.transcript_id, t.title)}
                    title="Delete transcript and vector embeddings"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-results-state">
          <FolderArchive size={48} className="faint-icon" />
          <h3>No Transcripts Found</h3>
          <p>
            {searchQuery 
              ? `No transcripts match "${searchQuery}". Try a different keyword.` 
              : 'You haven\'t processed any audio files yet. Jump over to Transcribe Studio to begin!'}
          </p>
        </div>
      )}

      {/* Modal: View Full Diarization Segments */}
      {selectedTranscript && (
        <div className="modal-backdrop" onClick={() => setSelectedTranscript(null)}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <FileAudio size={20} className="modal-icon-cyan" />
                <div>
                  <h3 className="modal-title">{selectedTranscript.title || 'Transcript Diarization'}</h3>
                  <span className="modal-sub">{selectedTranscript.audio_filename}</span>
                </div>
              </div>
              <div className="modal-actions-right">
                <button 
                  className="secondary-btn" 
                  onClick={handleCopyModalText}
                  title="Copy full text"
                >
                  {copiedModal ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedModal ? 'Copied' : 'Copy'}</span>
                </button>
                <button 
                  className="modal-close-btn" 
                  onClick={() => setSelectedTranscript(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-scroll-body">
              {isLoadingDetails ? (
                <div className="modal-loading-box">
                  <Loader2 size={32} className="spinner-icon" />
                  <span>Loading full speaker turns...</span>
                </div>
              ) : modalDetails?.full_transcript_data && Array.isArray(modalDetails.full_transcript_data) ? (
                <div className="segments-scroll-list">
                  {modalDetails.full_transcript_data.map((seg, i) => (
                    <div key={i} className="segment-row-card">
                      <div className="segment-top-meta">
                        <span className={`speaker-pill ${getSpeakerColorClass(seg.speaker)}`}>
                          <User size={12} />
                          {seg.speaker || `SPEAKER_${i + 1}`}
                        </span>

                        {(seg.start_time !== undefined && seg.end_time !== undefined) && (
                          <span className="timestamp-pill">
                            <Clock size={12} />
                            {formatSeconds(seg.start_time)} - {formatSeconds(seg.end_time)}
                          </span>
                        )}
                      </div>
                      <div className="segment-text-body">{seg.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-notice">No segment turns recorded for this transcript.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
