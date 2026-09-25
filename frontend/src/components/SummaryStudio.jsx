import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Square,
  Clock
} from 'lucide-react';
import { marked } from 'marked';
import { generateDailySummaryApi, generateCustomSummaryApi, fetchTranscriptsApi } from '../api';

export default function SummaryStudio({ isAuthenticated, onRequireAuth }) {
  const [tab, setTab] = useState('daily'); // 'daily' | 'custom'
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Custom multi-transcript selection
  const [transcriptsList, setTranscriptsList] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFetchingTranscripts, setIsFetchingTranscripts] = useState(false);

  // Results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAuthenticated && tab === 'custom') {
      loadTranscripts();
    }
  }, [isAuthenticated, tab]);

  const loadTranscripts = async () => {
    setIsFetchingTranscripts(true);
    try {
      const res = await fetchTranscriptsApi();
      if (res && res.transcripts) {
        setTranscriptsList(res.transcripts);
      }
    } catch (err) {
      console.warn("Failed to load transcripts for custom summary:", err);
    } finally {
      setIsFetchingTranscripts(false);
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transcriptsList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transcriptsList.map(t => t.transcript_id)));
    }
  };

  const handleGenerateDaily = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!targetDate) {
      setError("Please select a date first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await generateDailySummaryApi(targetDate);
      setSummaryResult({
        title: res.title || `Executive Summary (${targetDate})`,
        summary_text: res.summary,
        summary_id: res.summary_id,
        date: res.date,
        type: 'daily'
      });
    } catch (err) {
      setError(err.message || "Failed to generate daily summary.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCustom = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (selectedIds.size === 0) {
      setError("Please select at least one transcript to synthesize.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await generateCustomSummaryApi(Array.from(selectedIds));
      setSummaryResult({
        title: res.title || 'Cross-Meeting Synthesis',
        summary_text: res.summary_text,
        summary_id: res.summary_id,
        transcript_ids: res.transcript_ids,
        type: 'custom'
      });
    } catch (err) {
      setError(err.message || "Failed to generate custom summary.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryResult?.summary_text) return;
    const text = `# ${summaryResult.title}\n\n${summaryResult.summary_text}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!summaryResult?.summary_text) return;
    const content = `# ${summaryResult.title}\n\n${summaryResult.summary_text}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(summaryResult.title || 'summary').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (content) => {
    try {
      return { __html: marked.parse(content || '') };
    } catch {
      return { __html: content };
    }
  };

  return (
    <div className="summary-studio-layout">
      {/* Left Configuration Panel */}
      <section className="studio-card summary-config-card">
        <div className="card-header">
          <div className="header-icon-box emerald-box">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="card-title">Executive AI Summarizer</h2>
            <p className="card-subtitle">Synthesize multi-turn dialogues into structured analytical briefs</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-btn ${tab === 'daily' ? 'active' : ''}`}
            onClick={() => { setTab('daily'); setError(null); }}
          >
            <Calendar size={18} />
            <span>Daily Aggregated Brief</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${tab === 'custom' ? 'active' : ''}`}
            onClick={() => { setTab('custom'); setError(null); }}
          >
            <Layers size={18} />
            <span>Multi-Transcript Synthesis</span>
          </button>
        </div>

        {tab === 'daily' ? (
          <div className="summary-config-body">
            <div className="form-field">
              <label className="input-label">Select Target Date</label>
              <input
                type="date"
                className="custom-date-input large"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <span className="field-hint">
                Aggregates all audio transcripts processed on this day and extracts cross-meeting highlights and deliverables.
              </span>
            </div>

            <button
              className="submit-action-btn primary-glow-btn"
              onClick={handleGenerateDaily}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Synthesizing Daily Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Daily Executive Summary</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="summary-config-body">
            <div className="transcripts-picker-top">
              <div className="picker-header">
                <span className="picker-title">Select Transcripts to Combine</span>
                <button className="select-all-btn" onClick={handleSelectAll}>
                  {selectedIds.size === transcriptsList.length && transcriptsList.length > 0 ? (
                    <>
                      <CheckSquare size={14} />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square size={14} />
                      <span>Select All ({transcriptsList.length})</span>
                    </>
                  )}
                </button>
              </div>
              <span className="badge-selected-count">
                {selectedIds.size} of {transcriptsList.length} transcripts selected
              </span>
            </div>

            <div className="transcripts-checklist-container">
              {isFetchingTranscripts ? (
                <div className="loading-checklist">
                  <Loader2 size={24} className="spinner-icon" />
                  <span>Loading transcripts library...</span>
                </div>
              ) : transcriptsList.length > 0 ? (
                transcriptsList.map((t) => {
                  const isChecked = selectedIds.has(t.transcript_id);
                  const dateStr = t.processing_timestamp
                    ? new Date(t.processing_timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';

                  return (
                    <div
                      key={t.transcript_id}
                      className={`checklist-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => handleToggleSelect(t.transcript_id)}
                    >
                      <div className="checkbox-box">
                        {isChecked ? <CheckSquare size={18} className="checked-icon" /> : <Square size={18} />}
                      </div>
                      <div className="checklist-details">
                        <span className="checklist-title">{t.title || 'Untitled Transcript'}</span>
                        <div className="checklist-sub">
                          <span className="checklist-file">{t.audio_filename}</span>
                          {dateStr && (
                            <span className="checklist-date">
                              <Clock size={10} />
                              {dateStr}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-checklist">
                  <p>No transcripts found in your library.</p>
                  <span>Upload some audio in Transcribe Studio first.</span>
                </div>
              )}
            </div>

            <button
              className="submit-action-btn primary-glow-btn"
              onClick={handleGenerateCustom}
              disabled={isLoading || selectedIds.size === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Synthesizing Multi-Meeting Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Synthesize {selectedIds.size > 0 ? `(${selectedIds.size}) ` : ''}Transcripts</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="error-alert mt-4">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Right / Generated Executive Summary View */}
      <section className="studio-card summary-viewer-card">
        <div className="card-header">
          <div className="header-icon-box gold-box">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="card-title">Executive Brief Output</h2>
            <p className="card-subtitle">Structured analyst report with key decisions, deliverables, and takeaways</p>
          </div>

          {summaryResult && (
            <div className="card-header-actions">
              <button 
                className="secondary-btn" 
                onClick={handleCopySummary}
                title="Copy markdown text"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button 
                className="secondary-btn" 
                onClick={handleDownloadMarkdown}
                title="Download as .md file"
              >
                <Download size={16} />
                <span>Export MD</span>
              </button>
            </div>
          )}
        </div>

        {summaryResult ? (
          <div className="summary-result-stream">
            <div className="summary-title-badge">
              <Sparkles size={18} className="sparkle-gold" />
              <h3 className="summary-rendered-title">{summaryResult.title}</h3>
            </div>

            <div 
              className="summary-body-markdown markdown-formatted-body"
              dangerouslySetInnerHTML={renderMarkdown(summaryResult.summary_text)}
            />
          </div>
        ) : (
          <div className="empty-results-state">
            <div className="waveform-placeholder-art">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <h3>No Summary Generated Yet</h3>
            <p>Select a date for a daily overview or choose multiple transcripts to synthesize an analyst-level briefing.</p>
          </div>
        )}
      </section>
    </div>
  );
}
