import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  FileText, 
  Sparkles, 
  Play, 
  Pause, 
  Clock, 
  User, 
  Copy, 
  Check, 
  Download, 
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { transcribeAudioApi } from '../api';

export default function TranscribeStudio({ 
  onTranscriptCreated, 
  onSwitchToChat,
  onRequireAuth,
  isAuthenticated 
}) {
  const [mode, setMode] = useState('audio'); // 'audio' | 'text'
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [title, setTitle] = useState('');
  const [generateSummary, setGenerateSummary] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setError(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(URL.createObjectURL(file));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setAudioFile(file);
      setError(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(URL.createObjectURL(file));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const toggleAudioPlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (mode === 'audio' && !audioFile) {
      setError('Please select or drop an audio file first.');
      return;
    }
    if (mode === 'text' && !transcriptText.trim()) {
      setError('Please enter transcript text to proceed.');
      return;
    }

    setIsLoading(true);
    setLoadingStep(mode === 'audio' ? 'Uploading & Diarizing via Gemini AI...' : 'Parsing and indexing text...');

    try {
      const response = await transcribeAudioApi({
        audioFile: mode === 'audio' ? audioFile : null,
        transcriptText: mode === 'text' ? transcriptText : null,
        title: title || undefined,
        generateSummary,
      });

      setResult(response);
      if (onTranscriptCreated) {
        onTranscriptCreated(response);
      }
    } catch (err) {
      setError(err.message || 'Transcription failed.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopyTranscript = () => {
    if (!result?.segments) return;
    const fullText = result.segments
      .map(s => `[${s.speaker || 'SPEAKER'}] ${s.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.extracted_title || title || 'transcript'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSeconds = (sec) => {
    if (sec === undefined || sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Color generator for distinct speaker badges
  const getSpeakerColorClass = (speaker) => {
    const speakerNum = parseInt((speaker || '').replace(/\D/g, ''), 10);
    const colors = ['speaker-cyan', 'speaker-violet', 'speaker-emerald', 'speaker-amber', 'speaker-pink'];
    if (isNaN(speakerNum)) return 'speaker-default';
    return colors[speakerNum % colors.length];
  };

  return (
    <div className="transcribe-studio-layout">
      {/* Left / Input Section */}
      <section className="studio-card input-card">
        <div className="card-header">
          <div className="header-icon-box">
            <Sparkles className="sparkle-icon" size={20} />
          </div>
          <div>
            <h2 className="card-title">Transcription & Diarization Studio</h2>
            <p className="card-subtitle">Upload speech audio for AI multi-speaker recognition and semantic embedding</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-btn ${mode === 'audio' ? 'active' : ''}`}
            onClick={() => setMode('audio')}
          >
            <FileAudio size={18} />
            <span>Upload Audio File</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            <FileText size={18} />
            <span>Manual Text Ingestion</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="studio-form">
          {mode === 'audio' ? (
            <div 
              className={`dropzone-box ${audioFile ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.m4a,.flac,.ogg,.aac,.webm,.mp4"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              
              {audioFile ? (
                <div className="selected-file-preview" onClick={(e) => e.stopPropagation()}>
                  <div className="file-icon-badge">
                    <FileAudio size={28} />
                  </div>
                  <div className="file-meta">
                    <span className="file-name">{audioFile.name}</span>
                    <span className="file-size">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>

                  {audioUrl && (
                    <div className="audio-inline-player">
                      <audio 
                        ref={audioPlayerRef} 
                        src={audioUrl} 
                        onEnded={() => setIsPlaying(false)}
                      />
                      <button 
                        type="button" 
                        className="player-play-btn"
                        onClick={toggleAudioPlay}
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                    </div>
                  )}

                  <button 
                    type="button" 
                    className="change-file-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty">
                  <div className="upload-circle">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="drop-title">Drag & drop your audio file here</h3>
                  <p className="drop-desc">or click to browse your local device</p>
                  <div className="format-badges">
                    <span>WAV</span>
                    <span>MP3</span>
                    <span>M4A</span>
                    <span>FLAC</span>
                    <span>OGG</span>
                    <span>WEBM</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-input-group">
              <label htmlFor="manual-text" className="input-label">Meeting Transcript / Speech Text</label>
              <textarea
                id="manual-text"
                rows={9}
                className="custom-textarea"
                placeholder="Paste verbatim transcript or speech notes here... (e.g. Speaker 1: Hello team... Speaker 2: Let's discuss sprint goals...)"
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
              />
            </div>
          )}

          {/* Metadata & Controls */}
          <div className="form-controls-grid">
            <div className="form-field">
              <label className="input-label">Transcript Title (Optional)</label>
              <input
                type="text"
                className="custom-input"
                placeholder="Auto-extracted by Gemini AI if blank"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-field checkbox-field">
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generateSummary}
                  onChange={(e) => setGenerateSummary(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">Auto-Generate Executive Summary</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="submit-action-btn primary-glow-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner-icon" />
                <span>{loadingStep || 'Processing Speech...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Transcribe & Diarize Audio</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Right / Results Section */}
      <section className="studio-card results-card">
        <div className="card-header">
          <div className="header-icon-box violet-box">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="card-title">Live Diarization Output</h2>
            <p className="card-subtitle">
              {result ? `${result.segment_count || result.segments?.length || 0} speaker turns identified` : 'Awaiting transcription output'}
            </p>
          </div>

          {result && (
            <div className="card-header-actions">
              <button 
                className="secondary-btn" 
                onClick={handleCopyTranscript}
                title="Copy all text"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button 
                className="secondary-btn" 
                onClick={handleDownloadJson}
                title="Download JSON structure"
              >
                <Download size={16} />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>

        {result ? (
          <div className="results-content-stream">
            {/* Header info banner */}
            <div className="results-meta-banner">
              <div className="meta-item">
                <span className="meta-label">Title</span>
                <span className="meta-value highlight">{result.extracted_title || title || 'Untitled'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">File</span>
                <span className="meta-value">{result.audio_filename || 'manual_entry.txt'}</span>
              </div>
              {result.transcript_id && (
                <div className="meta-item">
                  <span className="meta-label">Transcript ID</span>
                  <span className="meta-value mono">{result.transcript_id.slice(0, 8)}...</span>
                </div>
              )}
            </div>

            {/* Generated Summary Card */}
            {result.summary && (
              <div className="ai-summary-highlight-card">
                <div className="summary-card-top">
                  <Sparkles size={16} className="sparkle-gold" />
                  <h4>{result.summary.title || 'Executive Summary'}</h4>
                </div>
                <div className="summary-card-body">
                  <p>{result.summary.summary_text}</p>
                </div>
              </div>
            )}

            {/* Diarization Segments list */}
            <div className="segments-scroll-list">
              <h4 className="segments-list-title">Speaker Diarization Timeline</h4>
              {result.segments && result.segments.length > 0 ? (
                result.segments.map((seg, idx) => (
                  <div key={idx} className="segment-row-card">
                    <div className="segment-top-meta">
                      <span className={`speaker-pill ${getSpeakerColorClass(seg.speaker)}`}>
                        <User size={12} />
                        {seg.speaker || `SPEAKER_${idx + 1}`}
                      </span>

                      {(seg.start_time !== undefined && seg.end_time !== undefined) && (
                        <span className="timestamp-pill">
                          <Clock size={12} />
                          {formatSeconds(seg.start_time)} - {formatSeconds(seg.end_time)}
                        </span>
                      )}
                    </div>
                    <div className="segment-text-body">
                      {seg.text}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-notice">No segments returned.</p>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="results-footer-actions">
              <button 
                className="action-pill-btn primary"
                onClick={() => onSwitchToChat && onSwitchToChat()}
              >
                <MessageSquare size={16} />
                <span>Ask AI Questions About This Audio</span>
              </button>
              <button 
                className="action-pill-btn outline"
                onClick={() => {
                  setResult(null);
                  setAudioFile(null);
                  setTranscriptText('');
                  setTitle('');
                }}
              >
                <RefreshCw size={16} />
                <span>Process Another</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-results-state">
            <div className="waveform-placeholder-art">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <h3>No transcript generated yet</h3>
            <p>Upload an audio recording or paste text on the left to extract diarized speaker transcripts with Gemini AI.</p>
          </div>
        )}
      </section>
    </div>
  );
}
