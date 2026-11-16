const STORAGE_KEY = 'tara-trabaho-saved-lists';

export function loadSavedListings() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { jobs: [], trainings: [] };

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    throw new Error('Saved listings could not be read from browser storage.');
  }

  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    throw new Error('Saved listings have an invalid browser-storage format.');
  }

  return {
    jobs: Array.isArray(saved.jobs) ? saved.jobs.map(Number).filter(Number.isFinite) : [],
    trainings: Array.isArray(saved.trainings) ? saved.trainings.map(Number).filter(Number.isFinite) : []
  };
}

export function storeSavedListings(saved) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}
