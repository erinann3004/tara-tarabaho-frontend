import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Brand, EmptyState, Icon, Link, ListingCard } from '../../components/ui.jsx';
import { orientalMindoroLocations } from '../../utils/locations.js';
import { trainingCategories } from '../../utils/listing-categories.js';

export function HomePage({ jobs, trainings, jobError, trainingError, onNavigate, onApply, onToggleSave, savedListings, user }) {
  const navigateFromChild = onNavigate;
  const [query, setQuery] = useState('');
  return <>
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow"><span className="live-dot" /> YOUR NEXT STEP STARTS HERE</span>
          <h1>Find work that fits.<br /><span>Build skills that last.</span></h1>
          <p>Find local jobs, discover practical training, and connect with employers across Oriental Mindoro.</p>
          <form className="hero-search" onSubmit={(event) => { event.preventDefault(); onNavigate(`/jobs?q=${encodeURIComponent(query)}`); }}>
            <Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title, skill, or location" aria-label="Search job listings" /><button className="button button-primary" type="submit">Search jobs</button>
          </form>
          <div className="hero-stats"><span><strong>Local</strong> opportunities</span><span><strong>Skills-first</strong> training</span><span><strong>One place</strong> to grow</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun"></div><div className="hill hill-back"></div><div className="hill hill-front"></div>
          <div className="hero-card hero-card-job"><span className="art-icon"><Icon name="briefcase" /></span><div><strong>A fresh start</strong><small>Opportunity is closer than you think</small></div><span className="art-check"><Icon name="check" /></span></div>
          <div className="hero-card hero-card-training"><span className="art-icon art-icon-green"><Icon name="graduation" /></span><div><strong>Learn something new</strong><small>Skills for the next chapter</small></div></div>
          <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✳</span>
        </div>
      </div>
      <div className="hero-wave"></div>
    </section>
    <section className="section section-narrow" id="about">
      <div className="section-heading"><span className="eyebrow">A PRACTICAL WAY FORWARD</span><h2>Your path, made clearer.</h2><p>From your first search to your next qualification, find support at every step.</p></div>
      <div className="feature-grid">
        <article className="feature-tile"><span className="feature-number">01</span><span className="feature-icon"><Icon name="briefcase" /></span><h3>Find local work</h3><p>Explore opportunities from employers who are hiring in your community.</p><Link to="/jobs" onNavigate={onNavigate} className="text-link">Explore jobs <Icon name="arrow" /></Link></article>
        <article className="feature-tile"><span className="feature-number">02</span><span className="feature-icon feature-icon-green"><Icon name="graduation" /></span><h3>Grow your skills</h3><p>Find accessible programs that prepare you for in-demand careers.</p><Link to="/training" onNavigate={onNavigate} className="text-link">Browse training <Icon name="arrow" /></Link></article>
        <article className="feature-tile"><span className="feature-number">03</span><span className="feature-icon feature-icon-gold"><Icon name="bell" /></span><h3>Stay in the loop</h3><p>Get updates when new jobs and training programs become available.</p><Link to={user ? '/notifications' : '/register'} onNavigate={onNavigate} className="text-link">Get updates <Icon name="arrow" /></Link></article>
      </div>
    </section>
    <section className="section section-listings">
      <div className="section-narrow">
        <div className="section-heading section-heading-row"><div><span className="eyebrow">NEW OPPORTUNITIES</span><h2>Find your next opportunity.</h2></div><Link to="/jobs" onNavigate={onNavigate} className="text-link">All jobs <Icon name="arrow" /></Link></div>
        {jobError ? <div className="error-panel"><strong>Opportunity data couldn't be loaded.</strong><p>{jobError}</p></div> : jobs.length ? <div className="card-grid">{jobs.slice(0, 3).map((job) => <ListingCard key={job.id} listing={job} kind="job" user={user} isSaved={savedListings.jobs.includes(Number(job.id))} onToggleSave={onToggleSave} onApply={onApply} />)}</div> : <div className="home-empty"><span className="empty-icon"><Icon name="briefcase" /></span><div><strong>Local opportunities are on their way.</strong><p>Check back soon or browse training while you wait.</p></div><Link to="/training" onNavigate={onNavigate} className="button button-secondary">Explore training</Link></div>}
      </div>
    </section>
    <section className="section section-narrow">
      <div className="section-heading section-heading-row"><div><span className="eyebrow">LEARN WHAT'S NEXT</span><h2>Training that moves you forward.</h2></div><Link to="/training" onNavigate={onNavigate} className="text-link">All training <Icon name="arrow" /></Link></div>
      {trainingError ? <div className="error-panel"><strong>Training data couldn't be loaded.</strong><p>{trainingError}</p></div> : trainings.length ? <div className="card-grid">{trainings.slice(0, 3).map((training) => <ListingCard key={training.id} listing={training} kind="training" user={user} isSaved={savedListings.trainings.includes(Number(training.id))} onToggleSave={onToggleSave} onApply={onApply} />)}</div> : <div className="home-empty"><span className="empty-icon"><Icon name="graduation" /></span><div><strong>New training programs will appear here.</strong><p>Sign up to be notified when a provider publishes a new program.</p></div><Link to={user ? '/notifications' : '/register'} onNavigate={onNavigate} className="button button-secondary">Stay updated</Link></div>}
    </section>
    <section className="cta-section"><div><span className="eyebrow">MAKE YOUR NEXT MOVE</span><h2>Ready to take the next step?</h2><p>Join a local network built around skills, opportunity, and progress.</p></div><Link to={user ? '/dashboard' : '/register'} onNavigate={onNavigate} className="button button-light">{user ? 'Go to your dashboard' : 'Join TARA-TRABAHO'} <Icon name="arrow" /></Link></section>
  </>;
}

export function ExplorePage({ kind, entries = [], loading, error, onRetry, onNavigate, user, savedIds = [], onToggleSave, onApply }) {
  const isTraining = kind === 'training';
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const openedListingId = useRef('');
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');
  const availableTrainingCategories = [...new Set([...trainingCategories, ...entries.map((entry) => entry.category).filter(Boolean)])].sort();
  const targetListingId = searchParams.get('listing_id');
  useEffect(() => {
    if (!targetListingId || loading || openedListingId.current === targetListingId) return;
    const listing = entries.find((entry) => Number(entry.id) === Number(targetListingId));
    if (!listing) return;
    openedListingId.current = targetListingId;
    onApply(listing, kind);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('listing_id');
    setSearchParams(nextParams, { replace: true });
  }, [entries, kind, loading, onApply, searchParams, setSearchParams, targetListingId]);
  const filtered = entries.filter((entry) => {
    const text = [entry.title, entry.organization, entry.employer, entry.provider, entry.location, entry.category, ...(entry.skills || [])].join(' ').toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (location === 'all' || entry.location === location) && (!isTraining || category === 'all' || entry.category === category);
  });
  return <section className="page-shell">
    <div className={`page-banner ${isTraining ? 'banner-training' : ''}`}><div><span className="eyebrow">{isTraining ? 'LEARN AND GROW' : 'LOCAL JOB OPPORTUNITIES'}</span><h1>{isTraining ? 'Training programs' : 'Find your next job'}</h1><p>{isTraining ? 'Discover practical programs and build the skills employers need.' : 'Explore local opportunities that match your experience and goals.'}</p></div><div className="banner-mark"><Icon name={isTraining ? 'graduation' : 'briefcase'} /></div></div>
    <div className="page-content">
      <div className="filter-panel">
        <label className="search-field"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isTraining ? 'Search programs, skills, or providers' : 'Search title, employer, or skill'} aria-label="Search listings" /></label>
        <label className="select-field"><span>Location</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">All locations</option>{orientalMindoroLocations.map((place) => <option key={place} value={place}>{place}</option>)}</select></label>
        {isTraining && <label className="select-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{availableTrainingCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span><Link to="/locations" onNavigate={onNavigate} className="text-link map-view-link"><Icon name="pin" /> Opportunity map</Link>
      </div>
      {error ? <div className="error-panel"><strong>We couldn't load these opportunities.</strong><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : loading && !entries.length ? <div className="loading-state"><span className="spinner"></span><span>Finding local opportunities…</span></div> : filtered.length ? <div className="card-grid">{filtered.map((listing) => <ListingCard key={listing.id} listing={listing} kind={kind} user={user} isSaved={savedIds.includes(Number(listing.id))} onToggleSave={onToggleSave} onApply={onApply} />)}</div> : <EmptyState icon={isTraining ? 'graduation' : 'briefcase'} title={query ? 'No matches just yet' : 'No listings available yet'}>{query ? 'Try a different search or clear one of the filters.' : 'New opportunities will show up here when they are published.'}</EmptyState>}
      {user?.role === 'student' && <div className="subscribe-callout"><span className="callout-icon"><Icon name="bell" /></span><div><strong>Be first to know</strong><p>Get alerts when new local jobs and training programs are published.</p></div><Link to="/notifications" onNavigate={onNavigate} className="button button-secondary">Manage alerts</Link></div>}
    </div>
  </section>;
}

export function AuthPage({ mode, onNavigate, onAuthenticated, onError }) {
  const isRegister = mode === 'register';
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'student', location: '' });
  const [busy, setBusy] = useState(false);
  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = isRegister ? await api.register(values) : await api.login(values.email, values.password);
      onAuthenticated(result.user);
    } catch (caught) { onError(caught.message); }
    finally { setBusy(false); }
  };
  return <section className="auth-page">
    <div className="auth-aside"><Link to="/" onNavigate={onNavigate}><Brand /></Link><div><span className="eyebrow">TARA-TRABAHO · ORIENTAL MINDORO</span><h1>{isRegister ? 'Make your next move.' : 'Your next opportunity is waiting.'}</h1><p>{isRegister ? 'Create your account and connect with local work and training.' : 'Sign in to find local jobs, learn new skills, and keep your progress moving.'}</p><div className="auth-benefit"><Icon name="check" /> Local jobs and practical training</div><div className="auth-benefit"><Icon name="check" /> Alerts when new opportunities open</div></div><small>Local opportunity. Real skills.</small></div>
    <div className="auth-form-wrap"><div className="auth-form-card"><div className="auth-mobile-brand"><Link to="/" onNavigate={onNavigate}><Brand /></Link></div><span className="eyebrow">{isRegister ? 'GET STARTED' : 'WELCOME BACK'}</span><h2>{isRegister ? 'Create your account' : 'Sign in to your account'}</h2><p>{isRegister ? 'Tell us a little about yourself.' : 'Enter your email and password to continue.'}</p>
      <form onSubmit={submit} className="form-stack">
        {isRegister && <>
          <label className="form-label">I am joining as<select required name="role" value={values.role} onChange={update}><option value="student">Job seeker / student</option><option value="employer">Employer</option><option value="provider">Training provider</option></select></label>
          <label className="form-label">Full name or organization<input required name="name" value={values.name} onChange={update} autoComplete="name" /></label>
          <label className="form-label">Location<select required name="location" value={values.location} onChange={update}><option value="" disabled>Select your location</option>{orientalMindoroLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
        </>}
        <label className="form-label">Email address<input required type="email" name="email" value={values.email} onChange={update} autoComplete="email" /></label>
        <label className="form-label">Password<input required type="password" minLength={8} name="password" value={values.password} onChange={update} autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <Icon name="arrow" /></button>
      </form>
      <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to TARA-TRABAHO?'} <Link to={isRegister ? '/login' : '/register'} onNavigate={onNavigate}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
    </div></div>
  </section>;
}
