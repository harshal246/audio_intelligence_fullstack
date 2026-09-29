import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Activity, 
  Volume2, 
  VolumeX, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  ArrowRight,
  FileAudio
} from 'lucide-react';

export default function LiveAudioStudio({ 
  onAudioCaptured, 
  onDirectTranscribe,
  isAuthenticated,
  onRequireAuth
}) {
  // Recording states: 'idle' | 'recording' | 'paused' | 'recorded'
  const [recordState, setRecordState] = useState('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for dB meter
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechApiSupported, setSpeechApiSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState('bars'); // 'bars' | 'wave'

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const previewAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechApiSupported(false);
    }
    return () => {
      stopAllMedia();
    };
  }, []);

  // Cleanup helper
  const stopAllMedia = () => {
    isRecordingRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  // Canvas visualizer loop
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    animationFrameRef.current = requestAnimationFrame(drawVisualizer);

    if (visualizerMode === 'bars') {
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, 'rgba(10, 15, 29, 0.4)');
      bgGrad.addColorStop(1, 'rgba(8, 11, 17, 0.7)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Calculate average level for dB meter
      let sum = 0;
      const barCount = 48;
      const step = Math.floor(dataArray.length / barCount);
      const barWidth = (width / barCount) - 3;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        sum += val;
        const barHeight = Math.max(4, (val / 255) * (height - 18));
        const x = i * (barWidth + 3) + 2;
        const y = (height - barHeight) / 2; // Centered bars

        // Neon cyber gradient
        const barGrad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        barGrad.addColorStop(0, '#06B6D4');  // Cyan
        barGrad.addColorStop(0.5, '#6366F1'); // Indigo
        barGrad.addColorStop(1, '#EC4899');  // Pink

        ctx.fillStyle = barGrad;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';

        // Rounded capsule bars
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 4);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      const avgLevel = Math.min(100, Math.round((sum / barCount / 255) * 120));
      setAudioLevel(avgLevel);

    } else {
      // Oscilloscope Waveform Mode
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(10, 15, 29, 0.6)';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 3;
      const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
      waveGrad.addColorStop(0, '#06B6D4');
      waveGrad.addColorStop(0.5, '#8B5CF6');
      waveGrad.addColorStop(1, '#10B981');

      ctx.strokeStyle = waveGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.beginPath();

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
  };

  // Start Live Audio Listening & Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setLiveTranscript('');
    setInterimTranscript('');
    audioChunksRef.current = [];

    try {
      // 1. Request microphone access with advanced constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });
      streamRef.current = stream;

      // 2. Setup Web Audio API Analyser for Visualizer
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceNodeRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Start canvas drawing loop
      drawVisualizer();

      // 3. Setup MediaRecorder for audio file creation
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `live_recording_${timestamp}.webm`;
        const file = new File([blob], fileName, { type: mimeType });
        setAudioFile(file);

        if (onAudioCaptured) {
          onAudioCaptured(file, url);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms

      // 4. Setup Web Speech Recognition for live hearing feedback
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let finalStr = '';
            let interimStr = '';

            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalStr += res[0].transcript + ' ';
              } else {
                interimStr += res[0].transcript;
              }
            }

            setLiveTranscript(finalStr.trim());
            setInterimTranscript(interimStr);
          };

          recognition.onerror = (e) => {
            if (e.error !== 'no-speech') {
              console.warn('SpeechRecognition warning:', e.error);
            }
          };

          recognition.onend = () => {
            // If user is still actively recording, restart speech recognition automatically
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (err) {
          console.warn('SpeechRecognition setup error:', err);
        }
      }

      // 5. Timer
      setElapsedTime(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      isRecordingRef.current = true;
      setRecordState('recording');

    } catch (err) {
      console.error('Microphone access failed:', err);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser address bar.'
          : `Failed to access microphone: ${err.message}`
      );
      stopAllMedia();
      setRecordState('idle');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordState === 'recording') {
      isRecordingRef.current = false;
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setRecordState('paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordState === 'paused') {
      isRecordingRef.current = true;
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
      setRecordState('recording');
    }
  };

  // Stop recording and finalize audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordState === 'recording' || recordState === 'paused')) {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      stopAllMedia();
      setRecordState('recorded');
    }
  };

  // Discard and Reset
  const resetRecording = () => {
    stopAllMedia();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioFile(null);
    setElapsedTime(0);
    setLiveTranscript('');
    setInterimTranscript('');
    setAudioLevel(0);
    setRecordState('idle');
    setErrorMessage(null);
  };

  // Handle immediate 1-click transcribe
  const handleProceedToTranscribe = () => {
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth();
      return;
    }
    if (audioFile && onDirectTranscribe) {
      onDirectTranscribe(audioFile, liveTranscript.trim());
    }
  };

  // Format time mm:ss
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  return (
    <div className="live-audio-studio-panel">
      {/* Top Status Header */}
      <div className="live-studio-header">
        <div className="live-status-pill-group">
          {recordState === 'recording' && (
            <span className="live-badge-recording">
              <span className="live-red-beacon"></span>
              LIVE LISTENING
            </span>
          )}
          {recordState === 'paused' && (
            <span className="live-badge-paused">PAUSED</span>
          )}
          {recordState === 'recorded' && (
            <span className="live-badge-ready">
              <CheckCircle2 size={14} /> AUDIO CAPTURED
            </span>
          )}
          {recordState === 'idle' && (
            <span className="live-badge-idle">
              <Radio size={14} /> STUDIO READY
            </span>
          )}

          <div className="audio-spec-tag">
            <span>48kHz Studio Mic</span>
            <span className="spec-dot">•</span>
            <span>Noise Cancellation Active</span>
          </div>
        </div>

        {/* Visualizer Mode Toggle */}
        <div className="visualizer-toggle-btns">
          <button
            type="button"
            className={`vis-mode-btn ${visualizerMode === 'bars' ? 'active' : ''}`}
            onClick={() => setVisualizerMode('bars')}
            title="Frequency Bars"
          >
            Equalizer
          </button>
          <button
            type="button"
            className={`vis-mode-btn ${visualizerMode === 'wave' ? 'active' : ''}`}
            onClick={() => setVisualizerMode('wave')}
            title="Oscilloscope Wave"
          >
            Oscilloscope
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="live-stage-arena">
        {/* Canvas Visualizer Backdrop */}
        <div className="canvas-wrapper">
          <canvas 
            ref={canvasRef} 
            width={720} 
            height={160} 
            className="visualizer-canvas"
          />

          {/* Idle Placeholder Graphics when not recording */}
          {recordState === 'idle' && (
            <div className="canvas-idle-overlay">
              <div className="idle-soundwave-bars">
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <p className="idle-hint-text">Speak naturally — microphone soundwaves and live voice intelligence will stream here</p>
            </div>
          )}
        </div>

        {/* Level Meter & Timer Row */}
        <div className="audio-telemetry-bar">
          <div className="telemetry-timer">
            <span className="timer-label">DURATION</span>
            <span className={`timer-clock ${recordState === 'recording' ? 'pulse' : ''}`}>
              {formatTime(elapsedTime)}
            </span>
          </div>

          <div className="telemetry-meter">
            <div className="meter-header">
              <span className="meter-label">INPUT LEVEL</span>
              <span className="meter-value">{audioLevel}%</span>
            </div>
            <div className="meter-track">
              <div 
                className="meter-fill" 
                style={{ 
                  width: `${audioLevel}%`,
                  background: audioLevel > 80 ? '#F43F5E' : (audioLevel > 50 ? '#F59E0B' : '#06B6D4')
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Live Speech Recognition Transcript Stream ("Hearing Your Audio") */}
        {(recordState === 'recording' || recordState === 'paused' || liveTranscript) && (
          <div className="live-hearing-stream-card">
            <div className="hearing-stream-header">
              <div className="stream-indicator">
                <Sparkles size={14} className="sparkle-gold animate-spin-slow" />
                <span className="stream-title">Live Voice Hearing Feed</span>
              </div>
              <span className="stream-sub">Real-Time Word Extraction</span>
            </div>

            <div className="hearing-stream-body">
              {liveTranscript || interimTranscript ? (
                <p className="realtime-text">
                  <span className="final-transcript">{liveTranscript}</span>
                  <span className="interim-transcript">{interimTranscript}</span>
                  <span className="typing-cursor"></span>
                </p>
              ) : (
                <p className="hearing-prompt">
                  <Activity size={16} className="inline-pulse" /> Listening to your microphone... Start speaking to see live speech extraction!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="live-error-alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Controls Console */}
        <div className="live-controls-console">
          {recordState === 'idle' && (
            <div className="idle-control-center">
              <button
                type="button"
                className="giant-record-btn"
                onClick={startRecording}
                title="Start Live Hearing & Recording"
              >
                <div className="record-ring ring-1"></div>
                <div className="record-ring ring-2"></div>
                <div className="record-inner-circle">
                  <Mic size={32} className="mic-icon-pulse" />
                </div>
              </button>
              <div className="btn-label-group">
                <span className="btn-main-title">Click to Start Live Audio</span>
                <span className="btn-sub-title">Listen live & prepare for AI speaker diarization</span>
              </div>
            </div>
          )}

          {(recordState === 'recording' || recordState === 'paused') && (
            <div className="active-control-group">
              {/* Pause / Resume Button */}
              {recordState === 'recording' ? (
                <button
                  type="button"
                  className="live-action-btn pause-btn"
                  onClick={pauseRecording}
                  title="Pause Recording"
                >
                  <Pause size={18} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="live-action-btn resume-btn"
                  onClick={resumeRecording}
                  title="Resume Recording"
                >
                  <Play size={18} />
                  <span>Resume</span>
                </button>
              )}

              {/* Stop & Finish Button */}
              <button
                type="button"
                className="live-action-btn stop-btn primary-glow-btn"
                onClick={stopRecording}
                title="Complete and save audio"
              >
                <Square size={18} />
                <span>Stop & Capture Audio</span>
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                className="live-action-btn cancel-btn"
                onClick={resetRecording}
                title="Discard this recording"
              >
                <RotateCcw size={18} />
                <span>Discard</span>
              </button>
            </div>
          )}

          {recordState === 'recorded' && audioUrl && (
            <div className="recorded-success-card">
              <div className="recorded-meta-row">
                <div className="recorded-icon-box">
                  <FileAudio size={26} />
                </div>
                <div className="recorded-file-info">
                  <span className="recorded-title">Live Audio Recorded Successfully</span>
                  <span className="recorded-specs">
                    {formatTime(elapsedTime)} • {audioBlob ? (audioBlob.size / 1024).toFixed(1) + ' KB' : ''} • Opus WebM
                  </span>
                </div>

                {/* Inline playback */}
                <div className="recorded-playback-controls">
                  <audio
                    ref={previewAudioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                  />
                  <button
                    type="button"
                    className="player-round-btn"
                    onClick={togglePreviewPlay}
                  >
                    {isPlayingPreview ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="recorded-action-buttons">
                <button
                  type="button"
                  className="btn-transcribe-now primary-glow-btn"
                  onClick={handleProceedToTranscribe}
                >
                  <Zap size={18} />
                  <span>Send to Gemini AI Diarization</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  className="btn-rerecord-outline"
                  onClick={resetRecording}
                >
                  <RotateCcw size={16} />
                  <span>Record Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
