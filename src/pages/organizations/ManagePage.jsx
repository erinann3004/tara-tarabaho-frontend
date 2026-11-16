import { useRef, useState } from 'react';
import { EmptyState, Icon } from '../../components/ui.jsx';
import { formatDate } from '../../utils/date.js';
import { orientalMindoroLocations } from '../../utils/locations.js';
import { jobIndustries, trainingCategories } from '../../utils/listing-categories.js';

export function ManagePage({ user, listings, loading, error, onRetry, onCreate, onUpdateJob, onCloseJob, onCloseTraining }) {
  const isTraining = user?.role === 'provider';
  const categoryOptions = isTraining ? trainingCategories : jobIndustries;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [editingListing, setEditingListing] = useState(null);
  const [listingFilter, setListingFilter] = useState('hiring');
  const [form, setForm] = useState({ title: '', location: '', category: '', description: '', skills: '', deadline: '', salary: '', listing_type: 'Full-time', starts: '', ends: '', duration: '', slots: 10 });
  const listingGroups = {
    hiring: listings.filter((listing) => (listing.status || '').toLowerCase() === 'published'),
    done: listings.filter((listing) => (listing.status || '').toLowerCase() === 'closed'),
    attention: listings.filter((listing) => !['published', 'closed'].includes((listing.status || '').toLowerCase())),
  };
  const visibleListings = isTraining ? listings : listingGroups[listingFilter];
  const update = (event) => setForm((state) => ({ ...state, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const values = { ...form, kind: isTraining ? 'training' : 'job', skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean) };
      const saved = editingListing ? await onUpdateJob(editingListing.id, values) : await onCreate(values);
      if (!saved) return;
      setEditingListing(null);
      setForm((state) => ({ ...state, title: '', location: '', category: '', description: '', skills: '', deadline: '', salary: '', starts: '', ends: '', duration: '' }));
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };
  const editListing = (listing) => {
    setEditingListing(listing);
    setForm((state) => ({
      ...state,
      title: listing.title || '',
      location: listing.location || '',
      category: listing.category || '',
      description: listing.description || '',
      skills: Array.isArray(listing.skills) ? listing.skills.join(', ') : (listing.skills || ''),
      deadline: listing.deadline || '',
      salary: listing.salary || '',
      listing_type: listing.listing_type || 'Full-time',
    }));
  };
  const closeListing = async (listing) => {
    if (!window.confirm(`Close “${listing.title}”? It will disappear from public job listings. Existing applications will remain available.`)) return;
    const closed = await onCloseJob(listing.id);
    if (!closed) return;
    setListingFilter('done');
    if (editingListing?.id === listing.id) {
      setEditingListing(null);
      setForm((state) => ({ ...state, title: '', location: '', category: '', description: '', skills: '', deadline: '', salary: '' }));
    }
  };
  const completeTraining = async (listing) => {
    if (!window.confirm(`Mark “${listing.title}” as completed? It will be removed from public training listings, and all registrations will be kept.`)) return;
    await onCloseTraining(listing.id);
  };
  return <section className="page-shell"><div className="page-banner"><div><span className="eyebrow">ORGANIZATION WORKSPACE</span><h1>{isTraining ? 'Training programs' : 'Job listings'}</h1><p>Publish opportunities and connect with local job seekers.</p></div><span className="banner-mark"><Icon name={isTraining ? 'graduation' : 'briefcase'} /></span></div><div className="page-content manage-grid">
    <section className="dashboard-panel"><span className="eyebrow">{editingListing ? 'EDIT JOB POST' : 'CREATE A LISTING'}</span><h2>{editingListing ? 'Update job details' : isTraining ? 'Add a training program' : 'Post a new job'}</h2><form className="form-stack listing-form" onSubmit={submit}>
      <label className="form-label">{isTraining ? 'Program title' : 'Job title'}<input required name="title" value={form.title} onChange={update} /></label>
      <div className="form-row"><label className="form-label">Location<select required name="location" value={form.location} onChange={update}><option value="" disabled>Select a location</option>{form.location && !orientalMindoroLocations.includes(form.location) && <option value={form.location}>{form.location}</option>}{orientalMindoroLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label><label className="form-label">{isTraining ? 'Training category' : 'Industry'}<select required name="category" value={form.category} onChange={update}><option value="" disabled>{isTraining ? 'Select a training category' : 'Select an industry'}</option>{form.category && !categoryOptions.includes(form.category) && <option value={form.category}>{form.category}</option>}{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
      {!isTraining && <div className="form-row"><label className="form-label">Employment type<select name="listing_type" value={form.listing_type} onChange={update}>{['Full-time', 'Part-time', 'Contract', 'Temporary'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="form-label">Salary range<input name="salary" value={form.salary} onChange={update} placeholder="e.g. ₱18,000–₱25,000" /></label></div>}
      {isTraining && <><div className="form-row"><label className="form-label">Start date<input required type="date" name="starts" value={form.starts} onChange={update} /></label><label className="form-label">End date<input required type="date" name="ends" value={form.ends} onChange={update} min={form.starts || undefined} /></label></div><label className="form-label">Available slots<input required type="number" min="1" name="slots" value={form.slots} onChange={update} /></label></>}
      <label className="form-label">Relevant skills <small>Separate skills with commas</small><input name="skills" value={form.skills} onChange={update} placeholder="Communication, customer service" /></label>
      <label className="form-label">Description<textarea required minLength="25" name="description" value={form.description} onChange={update} rows="5" /></label>
      <div className="listing-form-actions"><button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? (editingListing ? 'Saving…' : 'Submitting…') : editingListing ? 'Save changes' : 'Submit for review'} <Icon name="arrow" /></button>{editingListing && <button className="button button-ghost" type="button" disabled={isSubmitting} onClick={() => { setEditingListing(null); setForm((state) => ({ ...state, title: '', category: '', description: '', skills: '', deadline: '', salary: '' })); }}>Cancel edit</button>}</div>
    </form></section>
    <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR LISTINGS</span><h2>Current status</h2></div></div>{!isTraining && <div className="listing-filter-bar" role="group" aria-label="Classify job listings">{[
      ['hiring', 'Hiring'],
      ['done', 'Done / filled'],
      ['attention', 'Needs attention'],
    ].map(([key, label]) => <button type="button" key={key} className={`listing-filter ${listingFilter === key ? 'listing-filter-active' : ''}`} onClick={() => setListingFilter(key)}>{label}<span>{listingGroups[key].length}</span></button>)}</div>}{error ? <div className="error-panel"><p>{error}</p>{onRetry && <button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>}</div> : loading && !listings.length ? <div className="loading-state"><span className="spinner"></span>Loading your listings…</div> : visibleListings.length ? visibleListings.map((listing) => <div className="compact-listing" key={listing.id}><span className="compact-icon"><Icon name={isTraining ? 'graduation' : 'briefcase'} /></span><div><strong>{listing.title}</strong><small>{listing.location} · Submitted {formatDate(listing.created_at)}</small></div><span className={`badge badge-${(listing.status || 'pending').toLowerCase()}`}>{listing.status === 'closed' ? (isTraining ? 'Completed' : 'Closed / filled') : listing.status}</span>{!isTraining && <div className="listing-management-actions"><button type="button" className="button button-ghost button-small" onClick={() => editListing(listing)}>Edit</button>{['pending', 'published'].includes((listing.status || '').toLowerCase()) && <button type="button" className="button button-ghost button-small" onClick={() => closeListing(listing)}>Close</button>}</div>}{isTraining && (listing.status || '').toLowerCase() === 'published' && <div className="listing-management-actions"><button type="button" className="button button-ghost button-small" onClick={() => completeTraining(listing)}>Mark completed</button></div>}</div>) : listings.length ? <EmptyState title={listingFilter === 'hiring' ? 'No jobs currently hiring' : listingFilter === 'done' ? 'No completed or filled jobs' : 'No jobs needing attention'}>Choose another category above to see your other job posts.</EmptyState> : <EmptyState title="No listings yet">Create your first listing to start reaching local job seekers.</EmptyState>}</section>
  </div></section>;
}
