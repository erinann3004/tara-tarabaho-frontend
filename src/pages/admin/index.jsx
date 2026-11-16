import { useMemo, useState } from 'react';
import { EmptyState, Icon, Link } from '../../components/ui.jsx';

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

function downloadCommunityReport(data) {
  const stats = data?.stats || {};
  const analytics = data?.analytics || {};
  const rows = [['Section', 'Metric', 'Value']];
  rows.push(['Summary', 'Generated on', new Date().toLocaleString()]);
  for (const [label, value] of [
    ['Accounts', stats.users],
    ['Job listings', stats.jobs],
    ['Training programs', stats.trainings],
    ['Applications', stats.applications],
    ['Listings waiting for review', stats.pending],
  ]) {
    if (value !== undefined) rows.push(['Summary', label, value]);
  }

  for (const [key, section] of [
    ['user_distribution', 'User distribution'],
    ['job_vacancies_by_industry', 'Job posts by industry'],
    ['most_demanded_skills', 'Most requested skills'],
    ['application_status', 'Application status'],
    ['job_vacancy_trend', 'Job listing status'],
  ]) {
    const report = analytics[key] || {};
    (report.labels || []).forEach((label, index) => rows.push([section, label, report.values?.[index] ?? 0]));
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  link.href = blobUrl;
  link.download = `tara-trabaho-community-report-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function ReviewPage({ data, error, loading, onRetry, onModerate }) {
  const [moderating, setModerating] = useState({});
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const listings = data?.pending_listings || [];
  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return listings.filter((listing) => {
      if (kindFilter !== 'all' && listing.kind !== kindFilter) return false;
      if (!normalizedQuery) return true;
      return [listing.title, listing.organization, listing.location, listing.description]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }, [kindFilter, listings, query]);

  const moderate = async (listing, status) => {
    const key = `${listing.kind}-${listing.id}`;
    setModerating((current) => ({ ...current, [key]: status }));
    try {
      await onModerate(listing.id, status, listing.kind);
    } finally {
      setModerating((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  return <section className="page-shell">
    <div className="page-banner"><div><span className="eyebrow">QUALITY AND SAFETY</span><h1>Review listings</h1><p>Check job and training submissions before they reach job seekers.</p></div><span className="banner-mark"><Icon name="check" /></span></div>
    <div className="page-content">
      {error ? <div className="error-panel"><strong>Review queue is unavailable.</strong><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : loading && !data ? <div className="admin-loading" role="status">Loading the review queue…</div> : <>
        <div className="admin-review-toolbar">
          <label className="admin-search"><Icon name="search" /><span className="sr-only">Search pending listings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, organization, or location" /></label>
          <label className="admin-kind-filter"><span className="sr-only">Filter by listing type</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">All listing types</option><option value="job">Jobs</option><option value="training">Training</option></select></label>
          <span className="admin-result-count">{filteredListings.length} of {listings.length} pending</span>
        </div>
        {filteredListings.length ? <div className="review-list">{filteredListings.map((listing) => {
          const action = moderating[`${listing.kind}-${listing.id}`];
          return <article className="review-card" key={`${listing.kind}-${listing.id}`}>
            <div className="listing-card-top"><span className={`listing-symbol ${listing.kind === 'training' ? 'training-symbol' : ''}`}><Icon name={listing.kind === 'training' ? 'graduation' : 'briefcase'} /></span><span className="eyebrow">{listing.organization || 'Organization not provided'}</span><span className="badge badge-pending">Pending review</span></div>
            <h3>{listing.title}</h3>
            <div className="listing-meta"><span><Icon name="pin" />{listing.location || 'Location not provided'}</span><span>{listing.kind === 'training' ? 'Training program' : 'Job listing'}</span></div>
            <p>{listing.description || 'No description provided.'}</p>
            <div className="actions"><button className="button button-primary" disabled={Boolean(action)} onClick={() => moderate(listing, 'published')}><Icon name="check" /> {action === 'published' ? 'Publishing…' : 'Publish'}</button><button className="button button-ghost" disabled={Boolean(action)} onClick={() => moderate(listing, 'rejected')}>{action === 'rejected' ? 'Rejecting…' : 'Reject'}</button></div>
          </article>;
        })}</div> : listings.length ? <EmptyState icon="search" title="No matching listings">Try another search or choose a different listing type.</EmptyState> : <EmptyState icon="check" title="All caught up">New submissions from employers and providers will appear here.</EmptyState>}
      </>}
    </div>
  </section>;
}

export function ReportsPage({ data, error, loading, onRetry }) {
  const stats = data?.stats || {};
  return <section className="page-shell">
    <div className="page-banner"><div><span className="eyebrow">PLATFORM OVERVIEW</span><h1>Community reports</h1><p>A snapshot of jobs, skills programs, and applications on the platform.</p></div><span className="banner-mark"><Icon name="spark" /></span></div>
    <div className="page-content">
      {error ? <div className="error-panel"><strong>Report data is unavailable.</strong><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : loading && !data ? <div className="admin-loading" role="status">Loading platform reports…</div> : <>
        <div className="report-download-row"><p>Download the current platform totals and chart breakdowns as a CSV file.</p><button type="button" className="button button-primary" onClick={() => downloadCommunityReport(data)}><Icon name="download" /> Download report CSV</button></div>
        <div className="stats-grid">{[['users', 'Accounts', 'spark'], ['jobs', 'Job listings', 'briefcase'], ['trainings', 'Training programs', 'graduation'], ['applications', 'Applications', 'arrow']].map(([key, label, icon]) => <article className="stat-card" key={key}><span className="stat-icon"><Icon name={icon} /></span><span className="stat-value">{Number(stats[key] || 0)}</span><span className="stat-label">{label}</span></article>)}</div>
        <div className="admin-report-grid">
          <article className="dashboard-panel report-note"><span className="eyebrow">COMMUNITY IMPACT</span><h2>Building a stronger local workforce</h2><p>Use listings and application activity to understand participation and connect local people with opportunity.</p></article>
          <article className="dashboard-panel admin-queue-panel"><span className="eyebrow">MODERATION</span><strong className="admin-queue-count">{Number(stats.pending || 0)}</strong><p>Listings waiting for review</p><Link to="/review" className="button button-primary">Open review queue <Icon name="arrow" /></Link></article>
        </div>
      </>}
    </div>
  </section>;
}
