import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const coordinatesCache = new Map();
let lastGeocodeRequestAt = 0;
let geocodeQueue = Promise.resolve();

function markerGroups(listings) {
  const groups = new Map();
  for (const listing of listings) {
    const location = String(listing.location || '').trim();
    const organization = String(listing.organization || '').trim();
    if (!location || !organization) continue;

    const kind = listing.kind === 'training' ? 'Training center' : 'Employer';
    const key = location.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { location, organizations: new Map() });
    }
    const organizations = groups.get(key).organizations;
    const organizationKey = `${kind}\u0000${organization.toLowerCase()}`;
    if (!organizations.has(organizationKey)) {
      organizations.set(organizationKey, { kind, name: organization, titles: [] });
    }
    organizations.get(organizationKey).titles.push(String(listing.title || 'Opportunity'));
  }
  return [...groups.values()].map((group) => ({
    ...group,
    organizations: [...group.organizations.values()]
  }));
}

function geocodeLocation(location, signal) {
  const query = `${location}, Oriental Mindoro, Philippines`;
  if (coordinatesCache.has(query)) return Promise.resolve(coordinatesCache.get(query));

  const request = geocodeQueue.then(async () => {
    if (signal.aborted) return null;
    const delay = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal.aborted) return null;

    lastGeocodeRequestAt = Date.now();
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'ph'
    });
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal
    });
    if (!response.ok) {
      throw new Error(`OpenStreetMap location search failed (${response.status}).`);
    }

    const results = await response.json();
    const result = Array.isArray(results) ? results[0] : null;
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    const point = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    coordinatesCache.set(query, point);
    return point;
  });
  geocodeQueue = request.catch(() => null);
  return request;
}

function createPopup(group) {
  const content = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = `Opportunities in ${group.location}`;
  const location = document.createElement('p');
  location.textContent = group.location;
  const opportunityList = document.createElement('ul');
  for (const organization of group.organizations) {
    const item = document.createElement('li');
    item.textContent = `${organization.kind}: ${organization.name} — ${organization.titles.join(', ')}`;
    opportunityList.appendChild(item);
  }
  content.append(heading, location, opportunityList);
  return content;
}

export function renderOpportunityMap(container, listings) {
  const map = L.map(container, { scrollWheelZoom: false }).setView([13.4, 121.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const controller = new AbortController();
  const groups = markerGroups(listings);
  const ready = (async () => {
    const points = [];
    for (const group of groups) {
      const point = await geocodeLocation(group.location, controller.signal);
      if (!point || controller.signal.aborted) continue;

      const trainingOnly = group.organizations.every((organization) => organization.kind === 'Training center');
      L.circleMarker(point, {
        radius: 8,
        color: trainingOnly ? '#977444' : '#266b50',
        fillColor: trainingOnly ? '#d5ad68' : '#5a9b70',
        fillOpacity: 0.9,
        weight: 2
      }).addTo(map).bindPopup(createPopup(group));
      points.push(point);
    }

    if (controller.signal.aborted) {
      return {
        markerCount: points.length,
        locationCount: groups.length,
        unresolvedCount: groups.length - points.length
      };
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 12 });
    } else if (points.length === 1) {
      map.setView(points[0], 11);
    }
    map.invalidateSize();

    return {
      markerCount: points.length,
      locationCount: groups.length,
      unresolvedCount: groups.length - points.length
    };
  })();

  return {
    ready,
    destroy() {
      controller.abort();
      map.remove();
    }
  };
}
