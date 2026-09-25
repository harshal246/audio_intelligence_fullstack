import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { 
  loginApi, 
  registerApi, 
  forgotPasswordApi, 
  verifyOtpApi, 
  resetPasswordApi 
} from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'verify_otp' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSessionToken, setResetSessionToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginApi(email, password);
      onAuthSuccess(email);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await registerApi(email, password);
      onAuthSuccess(email);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      setSuccessMsg(res.detail || 'Reset code sent if email exists.');
      setTimeout(() => switchMode('verify_otp'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to request password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtpApi(email, otp);
      setResetSessionToken(res.reset_session_token);
      setSuccessMsg('OTP verified successfully!');
      setTimeout(() => switchMode('reset'), 800);
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordApi(email, newPassword, resetSessionToken);
      setSuccessMsg('Password updated! Please log in with your new password.');
      setTimeout(() => switchMode('login'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-auth" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Modal Top Header */}
        <div className="auth-header-section">
          <div className="auth-icon-circle">
            <Sparkles size={24} className="sparkle-gold" />
          </div>
          <h2 className="auth-title">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'verify_otp' && 'Verify 6-Digit Code'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' && 'Sign in to access your audio intelligence and transcript vector store'}
            {mode === 'register' && 'Join AudioPulse AI for state-of-the-art diarization and summaries'}
            {mode === 'forgot' && 'We will send a 6-digit verification code to your email'}
            {mode === 'verify_otp' && `Enter the 6-digit code sent to ${email}`}
            {mode === 'reset' && 'Enter your new strong password below'}
          </p>
        </div>

        {/* Mode Tabs for Login & Register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-tab-buttons">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              <UserPlus size={16} />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {error && (
          <div className="error-alert mb-3">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="success-alert mb-3">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  className="custom-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <div className="label-with-link">
                <label className="input-label">Password</label>
                <button
                  type="button"
                  className="inline-text-btn"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  required
                  className="custom-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="submit-action-btn primary-glow-btn mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <LogIn size={18} />}
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  className="custom-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  required
                  className="custom-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  required
                  className="custom-input"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="submit-action-btn primary-glow-btn mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <UserPlus size={18} />}
              <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="auth-input-group">
              <label className="input-label">Account Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  className="custom-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="submit-action-btn primary-glow-btn mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <Mail size={18} />}
              <span>{isLoading ? 'Sending Code...' : 'Send Reset Code'}</span>
            </button>

            <button
              type="button"
              className="inline-text-btn align-center mt-3"
              onClick={() => switchMode('login')}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* Verify OTP Form */}
        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="auth-input-group">
              <label className="input-label">6-Digit Verification Code</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="field-icon" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  className="custom-input mono letter-spacing-lg"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <button type="submit" className="submit-action-btn primary-glow-btn mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <KeyRound size={18} />}
              <span>{isLoading ? 'Verifying...' : 'Verify OTP'}</span>
            </button>

            <button
              type="button"
              className="inline-text-btn align-center mt-3"
              onClick={() => switchMode('forgot')}
            >
              ← Resend code
            </button>
          </form>
        )}

        {/* Set New Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="auth-input-group">
              <label className="input-label">New Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  required
                  className="custom-input"
                  placeholder="New strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="submit-action-btn primary-glow-btn mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="spinner-icon" /> : <Lock size={18} />}
              <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
