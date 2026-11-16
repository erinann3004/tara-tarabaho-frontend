const API_BASE = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? '/api' : `${window.TARA_APP_BASE || ''}/backend/LavaLust/public/api`
);
const pendingGetRequests = new Map();

export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const requestKey = method === 'GET' ? `${API_BASE}${path}` : null;
  if (requestKey && pendingGetRequests.has(requestKey)) return pendingGetRequests.get(requestKey);
  if (method !== 'GET') pendingGetRequests.clear();

  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchRequest = async () => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return payload;
  };

  if (!requestKey) return fetchRequest();
  const pendingRequest = fetchRequest();
  pendingGetRequests.set(requestKey, pendingRequest);
  try {
    return await pendingRequest;
  } finally {
    if (pendingGetRequests.get(requestKey) === pendingRequest) pendingGetRequests.delete(requestKey);
  }
}

export const api = {
  me: () => request('/me'),
  login: (email, password) => request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (values) => request('/register', { method: 'POST', body: JSON.stringify(values) }),
  logout: () => request('/logout', { method: 'POST' }),
  jobs: () => request('/jobs'),
  trainings: () => request('/trainings'),
  dashboard: () => request('/dashboard'),
  recommendations: () => request('/recommendations'),
  applications: () => request('/applications'),
  apply: (application) => request('/applications', {
    method: 'POST',
    body: application instanceof FormData ? application : JSON.stringify(application)
  }),
  resumeUrl: (applicationId, kindOrPreview = 'job', preview = false) => {
    const kind = typeof kindOrPreview === 'boolean' ? 'job' : (kindOrPreview || 'job');
    const isPreview = typeof kindOrPreview === 'boolean' ? kindOrPreview : preview;
    return `${API_BASE}/applications/resume?application_id=${encodeURIComponent(applicationId)}&kind=${encodeURIComponent(kind)}${isPreview ? '&preview=1' : ''}`;
  },
  notifications: () => request('/notifications'),
  markRead: (notificationId) => request('/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: notificationId }) }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  createListing: (listing) => request('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  ownListings: () => request('/listings/mine'),
  updateJobListing: (listingId, listing) => request('/listings/update-job', { method: 'POST', body: JSON.stringify({ ...listing, listing_id: listingId }) }),
  closeJobListing: (listingId) => request('/listings/close-job', { method: 'POST', body: JSON.stringify({ listing_id: listingId }) }),
  closeTrainingListing: (listingId) => request('/listings/close-training', { method: 'POST', body: JSON.stringify({ listing_id: listingId }) }),
  moderateListing: (listingId, status, kind = 'job') => request('/listings/moderate', { method: 'POST', body: JSON.stringify({ listing_id: listingId, status, kind }) }),
  updateApplication: (applicationId, status, kind = 'job') => request('/applications/status', { method: 'POST', body: JSON.stringify({ application_id: applicationId, status, kind }) }),
  withdrawApplication: (applicationId, kind = 'job') => request('/applications/withdraw', { method: 'POST', body: JSON.stringify({ application_id: applicationId, kind }) }),
  subscribePush: (subscription) => request('/push-subscriptions', { method: 'POST', body: JSON.stringify(subscription) }),
  deletePush: (endpoint) => request('/push-subscriptions/remove', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  pushKey: () => request('/push-key'),
  updatePreferences: (emailAlerts) => request('/notification-preferences', { method: 'POST', body: JSON.stringify({ email_alerts: emailAlerts }) }),
  updateProfile: (values) => request('/profile', { method: 'POST', body: JSON.stringify(values) }),
  updateProfilePhoto: (file) => {
    const body = new FormData();
    body.set('photo', file);
    return request('/profile/photo', { method: 'POST', body });
  }
};
