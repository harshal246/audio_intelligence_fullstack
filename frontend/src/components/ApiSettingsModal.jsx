import React, { useState } from 'react';
import { X, Server, Check, AlertCircle, Loader2, Wifi } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkServerHealthApi } from '../api';

export default function ApiSettingsModal({ isOpen, onClose, onUrlChanged }) {
  if (!isOpen) return null;

  const [url, setUrl] = useState(() => getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily store to test
      const original = getApiBaseUrl();
      setApiBaseUrl(url);
      const ok = await checkServerHealthApi();
      if (ok) {
        setTestResult({ success: true, message: 'Successfully reached backend server API!' });
      } else {
        setTestResult({ success: false, message: 'Backend reachable but returned an unexpected response.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Could not connect: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(url);
    if (onUrlChanged) onUrlChanged(url);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-auth" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="auth-header-section">
          <div className="auth-icon-circle">
            <Server size={24} className="sparkle-gold" />
          </div>
          <h2 className="auth-title">API Endpoint Settings</h2>
          <p className="auth-subtitle">
            Configure the FastAPI backend server URL for all speech processing and vector search requests
          </p>
        </div>

        <div className="auth-form">
          <div className="auth-input-group">
            <label className="input-label">Backend Base URL</label>
            <input
              type="text"
              className="custom-input mono"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://localhost:8000"
            />
          </div>

          <div className="preset-buttons-row">
            <span className="preset-label">Presets:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() => { setUrl('http://localhost:8000'); setTestResult(null); }}
            >
              localhost:8000
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => { setUrl('http://127.0.0.1:8000'); setTestResult(null); }}
            >
              127.0.0.1:8000
            </button>
          </div>

          {testResult && (
            <div className={`mt-3 ${testResult.success ? 'success-alert' : 'error-alert'}`}>
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="settings-actions-grid mt-4">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? <Loader2 size={16} className="spinner-icon" /> : <Wifi size={16} />}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              className="submit-action-btn primary-glow-btn"
              onClick={handleSave}
            >
              <Check size={18} />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
