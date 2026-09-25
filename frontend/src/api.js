// API Client for Audio Intelligence Platform

export const getApiBaseUrl = () => {
  return localStorage.getItem('audio_intel_api_url') || 'http://localhost:8000';
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem('audio_intel_api_url', url.replace(/\/+$/, ''));
};

// Auth Token management
export const getAccessToken = () => localStorage.getItem('audio_intel_access_token');
export const getRefreshToken = () => localStorage.getItem('audio_intel_refresh_token');
export const getUserEmail = () => localStorage.getItem('audio_intel_user_email');

export const saveAuthData = (accessToken, refreshToken, email) => {
  if (accessToken) localStorage.setItem('audio_intel_access_token', accessToken);
  if (refreshToken) localStorage.setItem('audio_intel_refresh_token', refreshToken);
  if (email) localStorage.setItem('audio_intel_user_email', email);
};

export const clearAuthData = () => {
  localStorage.removeItem('audio_intel_access_token');
  localStorage.removeItem('audio_intel_refresh_token');
  localStorage.removeItem('audio_intel_user_email');
};

// Generic fetch wrapper with token injection and automatic token refresh
async function apiRequest(endpoint, options = {}, isRetry = false) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const headers = new Headers(options.headers || {});
  
  // Do not set Content-Type if sending FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(`Unable to connect to backend at ${baseUrl}. Ensure backend is running.`);
  }
  
  // Handle 401 Unauthorized by attempting a token refresh
  if (response.status === 401 && !isRetry && getRefreshToken()) {
    try {
      const refreshed = await refreshTokenApi();
      if (refreshed) {
        // Retry original request once with new token
        return apiRequest(endpoint, options, true);
      }
    } catch {
      clearAuthData();
    }
  }
  
  // Parse response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  if (!response.ok) {
    const errorMsg = typeof data === 'object' && data !== null && (data.detail || data.message)
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      : (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
  }
  
  return data;
}

// ── Auth APIs ───────────────────────────────────────────────────
export async function registerApi(email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveAuthData(data.access_token, data.refresh_token, email);
  return data;
}

export async function loginApi(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveAuthData(data.access_token, data.refresh_token, email);
  return data;
}

export async function refreshTokenApi() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  
  if (res.ok) {
    const data = await res.json();
    saveAuthData(data.access_token, data.refresh_token);
    return true;
  }
  clearAuthData();
  return false;
}

export async function logoutApi() {
  const refresh_token = getRefreshToken();
  if (refresh_token) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
  }
  clearAuthData();
}

export async function forgotPasswordApi(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtpApi(email, otp) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPasswordApi(email, new_password, reset_session_token) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, new_password, reset_session_token }),
  });
}

// ── Transcript APIs ─────────────────────────────────────────────
export async function fetchTranscriptsApi() {
  return apiRequest('/transcribe/');
}

export async function fetchTranscriptDetailsApi(transcriptId) {
  return apiRequest(`/transcribe/${transcriptId}`);
}

export async function transcribeAudioApi({
  audioFile,
  title,
  transcriptText,
  generateSummary = true,
}) {
  const formData = new FormData();
  if (audioFile) {
    formData.append('audio', audioFile);
  }
  if (title && title.trim()) {
    formData.append('title', title.trim());
  }
  if (transcriptText && transcriptText.trim()) {
    formData.append('transcript_text', transcriptText.trim());
  }
  
  const queryParams = new URLSearchParams();
  queryParams.set('generate_summary', generateSummary ? 'true' : 'false');
  queryParams.set('is_last_chunk', 'true');
  
  return apiRequest(`/transcribe/simple?${queryParams.toString()}`, {
    method: 'POST',
    body: formData,
  });
}

export async function deleteTranscriptApi(transcriptId) {
  return apiRequest(`/transcribe/${transcriptId}`, {
    method: 'DELETE',
  });
}

// ── Summary APIs ────────────────────────────────────────────────
export async function generateDailySummaryApi(targetDate) {
  return apiRequest(`/summary/preview?target_date=${encodeURIComponent(targetDate)}`, {
    method: 'POST',
  });
}

export async function generateCustomSummaryApi(transcriptIds) {
  return apiRequest('/summary/custom', {
    method: 'POST',
    body: JSON.stringify({ transcript_ids: transcriptIds }),
  });
}

// ── Chat / RAG Bot APIs ─────────────────────────────────────────
export async function askQuestionApi({ question, sessionId = null, targetDate = null }) {
  const payload = { question };
  if (sessionId) payload.session_id = sessionId;
  if (targetDate) payload.target_date = targetDate;
  
  return apiRequest('/chat/ask', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchChatSessionsApi(targetDate = null) {
  const query = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : '';
  return apiRequest(`/chat/sessions${query}`);
}

// ── Server Health Check ─────────────────────────────────────────
export async function checkServerHealthApi() {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/docs`, { method: 'HEAD', mode: 'no-cors' });
    return true;
  } catch {
    return false;
  }
}
