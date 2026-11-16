function normalizeApiBase(value) {
  const base = String(value || '').replace(/\/+$/, '');
  if (!base) return '/api';
  return /\/api$/i.test(base) ? base : `${base}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? '/api' : `${window.TARA_APP_BASE || ''}/backend/LavaLust/public/api`
));

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  me: () => request('/me'),
  login: (email, password) => request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (values) => request('/register', { method: 'POST', body: JSON.stringify(values) }),
  logout: () => request('/logout', { method: 'POST' }),
  jobs: () => request('/jobs'),
  trainings: () => request('/trainings'),
  dashboard: () => request('/dashboard'),
  applications: () => request('/applications'),
  apply: (application) => request('/applications', {
    method: 'POST',
    body: application instanceof FormData ? application : JSON.stringify(application)
  }),
  resumeUrl: (applicationId, preview = false) => `${API_BASE}/applications/resume?application_id=${encodeURIComponent(applicationId)}${preview ? '&preview=1' : ''}`,
  notifications: () => request('/notifications'),
  markRead: (notificationId) => request('/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: notificationId }) }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  createListing: (listing) => request('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  ownListings: () => request('/listings/mine'),
  moderateListing: (listingId, status) => request('/listings/moderate', { method: 'POST', body: JSON.stringify({ listing_id: listingId, status }) }),
  updateApplication: (applicationId, status) => request('/applications/status', { method: 'POST', body: JSON.stringify({ application_id: applicationId, status }) }),
  subscribePush: (subscription) => request('/push-subscriptions', { method: 'POST', body: JSON.stringify(subscription) }),
  deletePush: (endpoint) => request('/push-subscriptions/remove', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  pushKey: () => request('/push-key'),
  updatePreferences: (emailAlerts) => request('/notification-preferences', { method: 'POST', body: JSON.stringify({ email_alerts: emailAlerts }) }),
  updateProfile: (values) => request('/profile', { method: 'POST', body: JSON.stringify(values) })
};
