import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { formatDate } from '../utils/date.js';
import { clearApplicationDraft, loadApplicationDraft, storeApplicationDraft } from '../services/application-drafts.js';

export function Icon({ name }) {
  const paths = {
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    graduation: <><path d="m2 10 10-6 10 6-10 6-10-6Z" /><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}

export function Brand() {
  return <span className="brand"><span className="brand-mark">T</span><span>TARA<span className="brand-accent">-TRABAHO</span></span></span>;
}

export function Link({ to, onNavigate, children, className = '', ...props }) {
  return <RouterLink
    to={to}
    className={className}
    onClick={(event) => {
      if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigate(to);
    }}
    {...props}
  >{children}</RouterLink>;
}

export function Toast({ message, onClose }) {
  if (!message) return null;
  return <div className={`toast toast-${message.type || 'info'}`} role="status">
    <span>{message.text}</span><button className="icon-button" aria-label="Dismiss" onClick={onClose}><Icon name="close" /></button>
  </div>;
}

export function EmptyState({ icon = 'spark', title, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} /></span><h3>{title}</h3><p>{children}</p></div>;
}

export function ListingCard({ listing, kind, user, isSaved = false, onToggleSave, onApply }) {
  const isTraining = kind === 'training';
  const tags = Array.isArray(listing.skills) ? listing.skills : [];
  const actionLabel = listing.listing_type || (isTraining ? 'Registration open' : 'New opportunity');
  return <article className="listing-card">
    <div className="listing-card-top">
      <span className={`listing-symbol ${isTraining ? 'training-symbol' : ''}`}><Icon name={isTraining ? 'graduation' : 'briefcase'} /></span>
      <span className="eyebrow">{listing.category || listing.industry || (isTraining ? 'Training program' : 'Job opportunity')}</span>
      <span className="badge badge-open">{actionLabel}</span>
    </div>
    <h3>{listing.title}</h3>
    <div className="listing-meta">
      <span>{listing.organization || listing.employer || listing.provider}</span>
      <span><Icon name="pin" />{listing.location || 'Oriental Mindoro'}</span>
    </div>
    <p>{listing.description || listing.summary || 'Explore this local opportunity and build your next career step.'}</p>
    {tags.length > 0 && <div className="chips">{tags.slice(0, 4).map((tag) => <span className="chip" key={tag}>{tag}</span>)}</div>}
    <div className="listing-footer">
      <span className="listing-date">{isTraining ? `Starts ${listing.starts || 'date to be announced'}` : (listing.salary || 'See details')}</span>
      <div className="listing-actions">
        <button className={`button button-small ${isSaved ? 'button-secondary' : 'button-ghost'}`} type="button" aria-pressed={isSaved} onClick={() => onToggleSave?.(listing.id)}>{isSaved ? 'Saved' : 'Save'}</button>
        <button className="button button-primary button-small" onClick={() => onApply(listing, isTraining ? 'training' : 'job')} disabled={user && !['student'].includes(user.role)}>
          {isTraining ? 'View program' : 'View job'} <Icon name="arrow" />
        </button>
      </div>
    </div>
  </article>;
}

export function OpportunityDialog({ listing, kind, user, onClose, onSubmit, onClearDraft, onNotify }) {
  const [step, setStep] = useState('details');
  const [values, setValues] = useState({ phone: '', location: user?.location || '', note: '' });
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const isJob = kind === 'job';

  useEffect(() => {
    try {
      const draft = loadApplicationDraft(kind, listing.id);
      if (draft) setValues((current) => ({ ...current, ...draft }));
    } catch (caught) {
      setError(caught.message);
    }
  }, [kind, listing.id]);

  const submit = async (event) => {
    event.preventDefault();
    if (isJob && !resume) {
      setError('Please attach your resume to continue.');
      return;
    }
    if (resume && resume.size > 2 * 1024 * 1024) {
      setError('Your resume must be 2 MB or smaller.');
      return;
    }
    if (resume && !/\.(pdf|docx)$/i.test(resume.name)) {
      setError('Please choose your resume as a PDF or DOCX file.');
      return;
    }
    const formData = new FormData();
    formData.set('listing_id', listing.id);
    formData.set('kind', kind);
    formData.set('phone', values.phone);
    formData.set('location', values.location);
    formData.set('note', values.note);
    if (resume) formData.set('resume', resume);
    setBusy(true);
    setError('');
    try {
      const submitted = await onSubmit(formData);
      if (submitted) {
        onClearDraft(kind, listing.id);
        onClose();
      }
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="opportunity-dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-dialog-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close job details"><Icon name="close" /></button>
      {step === 'details' ? <>
        <span className="eyebrow">{listing.category || (isJob ? 'JOB OPPORTUNITY' : 'TRAINING PROGRAM')}</span>
        <h2 id="opportunity-dialog-title">{listing.title}</h2>
        <div className="opportunity-dialog-meta"><strong>{listing.organization}</strong><span><Icon name="pin" />{listing.location}</span></div>
        <div className="opportunity-facts">
          {listing.salary && <span><small>Salary</small><strong>{listing.salary}</strong></span>}
          {listing.listing_type && <span><small>Employment type</small><strong>{listing.listing_type}</strong></span>}
          {listing.deadline && <span><small>Application deadline</small><strong>{formatDate(listing.deadline)}</strong></span>}
          {isJob ? <span><small>Posted</small><strong>{formatDate(listing.created_at)}</strong></span> : <>
            {listing.starts && <span><small>Program starts</small><strong>{formatDate(listing.starts)}</strong></span>}
            {listing.ends && <span><small>Program ends</small><strong>{formatDate(listing.ends)}</strong></span>}
            {listing.duration && <span><small>Duration</small><strong>{listing.duration}</strong></span>}
            {listing.slots > 0 && <span><small>Available slots</small><strong>{listing.slots}</strong></span>}
          </>}
        </div>
        <div className="opportunity-description"><h3>About this opportunity</h3><p>{listing.description || 'Contact the organization for more information about this opportunity.'}</p></div>
        {Array.isArray(listing.skills) && listing.skills.length > 0 && <div className="opportunity-description"><h3>{isJob ? 'Skills and qualifications' : 'Skills covered'}</h3><div className="chips">{listing.skills.map((skill) => <span className="chip" key={skill}>{skill}</span>)}</div></div>}
        <div className="dialog-actions"><button className="button button-ghost" onClick={onClose}>Back</button><button className="button button-primary" onClick={() => {
          if (!user || user.role !== 'student') {
            onSubmit(null);
            return;
          }
          setStep('application');
        }}>{isJob ? 'Apply for this job' : 'Register for this program'} <Icon name="arrow" /></button></div>
      </> : <form onSubmit={submit} className="job-application-form">
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2 id="opportunity-dialog-title">{isJob ? 'Apply for this job' : 'Register for this program'}</h2>
        <div className="application-progress" aria-label="Application progress">
          <span className="application-progress-complete"><span>1</span> {isJob ? 'Job details' : 'Program details'}</span><i />
          <span className="application-progress-current"><span>2</span> Your details</span>
        </div>
        <div className="application-job-summary"><span className="application-summary-icon"><Icon name={isJob ? 'briefcase' : 'graduation'} /></span><div><strong>{listing.title}</strong><small>{listing.organization} · {listing.location}</small></div></div>
        <p className="form-intro">{isJob ? 'Complete your contact details and attach a resume so the employer can review your application.' : 'Share your contact details and an optional message with the training provider.'}</p>
        {error && <div className="error-panel" role="alert">{error}</div>}
        <div className="application-form-section"><div className="application-section-heading"><span>01</span><div><strong>Your contact details</strong><small>We’ll share these with the {isJob ? 'employer' : 'training provider'}.</small></div></div>
          <div className="form-row">
            <label className="form-field"><span>Full name</span><input value={user?.name || ''} readOnly /></label>
            <label className="form-field"><span>Email address</span><input value={user?.email || ''} readOnly /></label>
          </div>
          <div className="form-row">
            <label className="form-field"><span>Phone number <b>*</b></span><input type="tel" value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} maxLength="40" autoComplete="tel" placeholder="e.g. 0917 123 4567" required /></label>
            <label className="form-field"><span>Current location <b>*</b></span><input value={values.location} onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))} maxLength="160" autoComplete="address-level2" placeholder="City or municipality" required /></label>
          </div>
        </div>
        <div className="application-form-section"><div className="application-section-heading"><span>02</span><div><strong>Introduce yourself</strong><small>Optional — share a little about yourself.</small></div></div>
          <label className="form-field"><span>{isJob ? 'Cover letter' : 'Message to the provider'} <small>Optional</small></span><textarea value={values.note} onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))} rows="4" maxLength="3000" placeholder="Share your relevant experience, skills, or interest." /></label>
        </div>
        {isJob && <div className="application-form-section"><div className="application-section-heading"><span>03</span><div><strong>Attach your resume <b>*</b></strong><small>Required for this job application.</small></div></div>
          <label className={`resume-upload ${resume ? 'resume-upload-selected' : ''}`}><span className="resume-upload-icon"><Icon name={resume ? 'check' : 'file'} /></span><span className="resume-upload-copy"><strong>{resume ? resume.name : (isJob ? 'Choose your resume' : 'Choose a resume or document')}</strong><small>{resume ? `${(resume.size / 1024 / 1024).toFixed(2)} MB · Ready to attach` : 'PDF or DOCX · Maximum file size 2 MB'}</small></span><span className="button button-secondary button-small">{resume ? 'Change file' : 'Browse files'}</span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-required={isJob} onChange={(event) => setResume(event.target.files?.[0] || null)} /><small className="resume-privacy">{isJob ? "Only the employer for this job can view your resume and application details." : "Only the provider for this program can view your application details and attached document."}</small></label>
        </div>}
        <div className="dialog-actions"><button type="button" className="button button-ghost" disabled={busy} onClick={() => { setError(''); setStep('details'); }}>Back to {isJob ? 'job' : 'program'} details</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => {
          try {
            storeApplicationDraft(kind, listing.id, values);
            setDraftSaved(true);
            onNotify('Application draft saved. You can resume it later.');
          } catch (caught) {
            setError(`Could not save your draft: ${caught.message}`);
          }
        }}>{draftSaved ? 'Draft saved' : 'Save draft'}</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Submitting…' : isJob ? 'Submit application' : 'Submit registration'}</button></div>
      </form>}
    </section>
  </div>;
}
