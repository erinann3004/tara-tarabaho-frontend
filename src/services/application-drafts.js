const STORAGE_KEY = 'tara-trabaho-application-draft';

export function loadApplicationDraft(kind, listingId) {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    throw new Error('The saved application draft could not be read.');
  }

  if (draft?.type !== kind || Number(draft.id) !== Number(listingId)) return null;
  return {
    phone: draft.phone || '',
    location: draft.location || '',
    note: draft.note || ''
  };
}

export function storeApplicationDraft(kind, listingId, values) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    type: kind,
    id: Number(listingId),
    ...values,
    savedAt: new Date().toISOString()
  }));
}

export function clearApplicationDraft(kind, listingId) {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const draft = JSON.parse(raw);
  if (draft?.type === kind && Number(draft.id) === Number(listingId)) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
