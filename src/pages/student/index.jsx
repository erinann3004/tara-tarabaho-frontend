import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, Icon, Link } from '../../components/ui.jsx';
import { formatDate } from '../../utils/date.js';
import { roles } from '../../utils/roles.js';
import { api } from '../../services/api.js';
import { renderOpportunityMap } from '../../services/leaflet-map.js';

const jobApplicationStatuses = ['Submitted', 'Reviewing', 'Shortlisted', 'Interview', 'Hired', 'Rejected'];
const trainingApplicationStatuses = ['Submitted', 'Reviewing', 'Accepted', 'Waitlisted', 'Rejected', 'Completed'];
const applicationStatusLabel = (status, kind) => kind === 'training'
  ? ({ Submitted: 'Registered', Reviewing: 'Under review' }[status] || status)
  : status;
const trainingProgramPhase = (application) => {
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if ((application.program_status || '').toLowerCase() === 'closed') return 'Completed';
  if (application.program_starts && application.program_starts > today) return 'Upcoming';
  if (application.program_ends && application.program_ends < today) return 'Completed';
  return 'Ongoing';
};

export function NotificationsPage({ items, loading, error, onRead, onOpen, onReadAll, onTogglePush, pushEnabled, onRetry }) {
  return <section className="page-shell">
    <div className="page-banner banner-notifications"><div><span className="eyebrow">STAY IN THE LOOP</span><h1>Your notifications</h1><p>Updates about new jobs, training programs, and your applications.</p></div><span className="banner-mark"><Icon name="bell" /></span></div>
    <div className="page-content">
      <div className="notification-settings"><span className="notification-settings-icon"><Icon name="bell" /></span><div><strong>Get alerts wherever you are</strong><p>Turn on browser alerts and receive email updates when new opportunities are posted.</p><small>Email notification preferences are managed from your account profile.</small></div><button className={`button ${pushEnabled ? 'button-secondary' : 'button-primary'}`} onClick={onTogglePush}>{pushEnabled ? 'Disable browser alerts' : 'Enable browser alerts'}</button></div>
      <div className="panel-heading notification-heading"><div><span className="eyebrow">YOUR UPDATES</span><h2>Recent activity</h2></div>{items.some((item) => !item.read_at) && <button className="button button-ghost" onClick={onReadAll}>Mark all as read</button>}</div>
      {error ? <div className="error-panel"><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : loading && !items.length ? <div className="loading-state"><span className="spinner"></span>Loading your updates…</div> : items.length ? <div className="notification-list">{items.map((item) => <article key={item.id} className={`notification-item ${item.read_at ? '' : 'notification-unread'}`}><button type="button" className="notification-open" onClick={() => onOpen(item)} aria-label={`Open notification: ${item.title}`}><span className={`notification-type-icon notification-${item.kind || 'update'}`}><Icon name={item.kind === 'training' ? 'graduation' : item.kind === 'job' ? 'briefcase' : 'bell'} /></span><div className="notification-copy"><div className="notification-title-row"><h3>{item.title}</h3>{!item.read_at && <span className="unread-dot" aria-label="Unread" />}</div><p>{item.details}</p><time>{formatDate(item.created_at)}</time><span className="notification-open-hint">View details <Icon name="arrow" /></span></div></button>{!item.read_at && <button className="button button-small button-ghost" onClick={() => onRead(item.id)}>Mark read</button>}</article>)}</div> : <EmptyState icon="bell" title="You're all caught up">When new jobs or training programs are published, you’ll see them here.</EmptyState>}
    </div>
  </section>;
}

export function ApplicationDetailDialog({ application, user, onClose, onUpdate, onWithdraw }) {
  const isStudent = user?.role === 'student';
  const isProvider = user?.role === 'provider';
  const isPdf = application.resume_mime === 'application/pdf';
  const [updateError, setUpdateError] = useState('');
  const [updating, setUpdating] = useState(false);
  const canWithdraw = isStudent && (application.kind === 'training'
    ? ['Submitted', 'Reviewing', 'Accepted', 'Waitlisted'].includes(application.status)
    : ['Submitted', 'Reviewing', 'Shortlisted', 'Interview'].includes(application.status));
  const changeStatus = async (status) => {
    setUpdating(true);
    setUpdateError('');
    try {
      const updated = await onUpdate(application.id, status, application.kind || 'job');
      if (!updated) setUpdateError('The status could not be updated. Please try again.');
    } catch (caught) {
      setUpdateError(caught.message);
    } finally {
      setUpdating(false);
    }
  };
  return <div className="dialog-backdrop application-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="opportunity-dialog application-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close application details"><Icon name="close" /></button>
      <span className="eyebrow">{isStudent ? 'YOUR SUBMISSION' : isProvider ? 'TRAINING APPLICANT' : 'JOB APPLICANT'}</span>
      <div className="application-detail-title-row"><div><h2 id="application-detail-title">Application details</h2><p>{application.title} · {application.organization}</p></div><span className={`badge badge-${(application.status || 'submitted').toLowerCase()}`}>{applicationStatusLabel(application.status, application.kind)}</span></div>
      <div className="application-detail-body">
        <section className="application-detail-section">
          <div className="application-section-heading"><span>01</span><div><strong>Applicant information</strong><small>Contact details submitted with this application.</small></div></div>
          <div className="application-detail-profile"><span className="applicant-avatar">{(application.applicant_name || user?.name || 'A').trim().charAt(0).toUpperCase()}</span><div><strong className="applicant-name">{application.applicant_name || user?.name}</strong><a className="applicant-email" href={`mailto:${encodeURIComponent(application.applicant_email || user?.email || '')}`}>{application.applicant_email || user?.email}</a></div><span className="applicant-submitted">Submitted {formatDate(application.created_at)}</span></div>
          <div className="applicant-detail-grid"><div><span>Phone number</span><strong>{application.applicant_phone || 'Not provided'}</strong></div><div><span>Current location</span><strong>{application.applicant_location || 'Not provided'}</strong></div></div>
        </section>
        <section className="application-detail-section">
          <div className="application-section-heading"><span>02</span><div><strong>{application.kind === 'training' ? 'Message to provider' : 'Cover letter'}</strong><small>Additional information from the applicant.</small></div></div>
          <div className="applicant-cover-letter"><p>{application.note || 'No additional message was included.'}</p></div>
        </section>
        {application.kind !== 'training' && <section className="application-detail-section">
          <div className="application-section-heading"><span>03</span><div><strong>Attached file</strong><small>{application.resume_original_name ? 'Resume or supporting document submitted with this application.' : 'No file was attached to this application.'}</small></div></div>
          {application.resume_original_name ? <>
            <div className="application-attachment-card"><span className="resume-upload-icon"><Icon name="file" /></span><span className="resume-upload-copy"><strong>{application.resume_original_name}</strong><small>{isPdf ? 'PDF document · Preview available below' : 'DOCX document · Download to view'}</small></span><a className="button button-secondary button-small" href={api.resumeUrl(application.id, application.kind || 'job')}><Icon name="download" /> Download</a></div>
            {isPdf && <div className="application-file-preview"><iframe title={`PDF attachment: ${application.resume_original_name}`} src={api.resumeUrl(application.id, application.kind || 'job', true)} /></div>}
          </> : <div className="application-no-attachment"><Icon name="file" /><span>No resume or supporting file was attached.</span></div>}
        </section>}
      </div>
      <div className="application-detail-footer">
        {!isStudent ? <div className="application-detail-status"><label className="application-status-select"><span>{application.kind === 'training' ? 'Registration status' : 'Application status'} {updating && '· Saving…'}</span><select aria-label={`Update ${application.applicant_name}'s status`} value={application.status} disabled={updating || application.status === 'Withdrawn'} onChange={(event) => changeStatus(event.target.value)}>{application.status === 'Withdrawn' && <option value="Withdrawn">Withdrawn</option>}{(application.kind === 'training' ? trainingApplicationStatuses : jobApplicationStatuses).map((status) => <option key={status} value={status}>{status === 'Submitted' ? applicationStatusLabel(status, application.kind) : status}</option>)}</select></label>{updateError && <small className="application-status-error" role="alert">{updateError}</small>}</div> : <><span className="application-status-note">{application.kind === 'training' ? 'Registration status' : 'Application status'}: <strong>{applicationStatusLabel(application.status, application.kind)}</strong></span>{canWithdraw && <div className="application-detail-status"><button className="button button-ghost" disabled={updating} onClick={async () => {
          if (!window.confirm(`Withdraw your application for ${application.title}?`)) return;
          setUpdating(true);
          setUpdateError('');
          try {
            if (await onWithdraw(application.id, application.kind || 'job')) onClose();
            else setUpdateError('The application could not be withdrawn. Please try again.');
          } catch (caught) {
            setUpdateError(caught.message);
          } finally {
            setUpdating(false);
          }
        }}>{updating ? 'Withdrawing…' : 'Withdraw application'}</button>{updateError && <small className="application-status-error" role="alert">{updateError}</small>}</div>}</>}
        <button className="button button-ghost" onClick={onClose}>Close details</button>
      </div>
    </section>
  </div>;
}

export function ApplicationsPage({ data, user, loading, error, onUpdate, onWithdraw }) {
  const items = data?.applications || [];
  const isStudent = user?.role === 'student';
  const isProvider = user?.role === 'provider';
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('All');
  const [programFilter, setProgramFilter] = useState('all');
  const [programPhaseFilter, setProgramPhaseFilter] = useState('All');
  useEffect(() => {
    const applicationId = Number(searchParams.get('application_id'));
    const kind = searchParams.get('kind');
    if (!applicationId || !items.length) return;
    const target = items.find((item) => Number(item.id) === applicationId && (!kind || item.kind === kind));
    if (!target) return;
    setSelectedApplication(target);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('application_id');
    nextParams.delete('kind');
    setSearchParams(nextParams, { replace: true });
  }, [items, searchParams, setSearchParams]);
  const statusOptions = [...new Set(items.flatMap((item) => [...(item.kind === 'training' ? trainingApplicationStatuses : jobApplicationStatuses), ...(item.status === 'Withdrawn' ? ['Withdrawn'] : [])]))];
  const statusCounts = items.reduce((counts, item) => {
    const status = item.status || 'Submitted';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const trainingPrograms = [...new Map(items.filter((item) => item.kind === 'training').map((item) => [String(item.listing_id), item])).values()];
  const phases = ['Upcoming', 'Ongoing', 'Completed'];
  const filteredItems = items.filter((item) =>
    (statusFilter === 'All' || item.status === statusFilter) &&
    (!isProvider || (programFilter === 'all' || String(item.listing_id) === programFilter) &&
      (programPhaseFilter === 'All' || trainingProgramPhase(item) === programPhaseFilter))
  );
  const updateSelectedStatus = async (id, status, kind = 'job') => {
    const updated = await onUpdate(id, status, kind);
    if (updated) setSelectedApplication((current) => current?.id === id ? { ...current, status } : current);
    return updated;
  };
  return <section className="page-shell"><div className="page-banner"><div><span className="eyebrow">{isStudent ? 'YOUR PROGRESS' : isProvider ? 'TRAINING CANDIDATES' : 'REVIEW CANDIDATES'}</span><h1>{isStudent ? 'My applications' : isProvider ? 'Program applicants' : 'Job applicants'}</h1><p>{isStudent ? 'Keep track of your job applications and training registrations.' : isProvider ? 'Review candidate contact details and registration messages for your programs.' : 'Review candidate profiles, contact details, and resumes for your job posts.'}</p></div><span className="banner-mark"><Icon name={isStudent ? 'arrow' : 'file'} /></span></div><div className="page-content">
    {!error && items.length > 0 && <div className="application-filter-bar" role="group" aria-label="Filter applications by status"><button type="button" className={`application-filter ${statusFilter === 'All' ? 'application-filter-active' : ''}`} onClick={() => setStatusFilter('All')}>All <span>{items.length}</span></button>{statusOptions.filter((status) => statusCounts[status]).map((status) => <button type="button" key={status} className={`application-filter ${statusFilter === status ? 'application-filter-active' : ''}`} onClick={() => setStatusFilter(status)}>{status === 'Submitted' && items.some((item) => item.kind === 'training') && !items.some((item) => item.kind !== 'training') ? 'Registered' : status === 'Reviewing' ? 'Under review' : status} <span>{statusCounts[status]}</span></button>)}</div>}
    {isProvider && items.length > 0 && <><div className="filter-panel"><label className="select-field"><span>Program / batch</span><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}><option value="all">All programs</option>{trainingPrograms.map((program) => <option key={program.listing_id} value={program.listing_id}>{program.title} · {program.program_starts ? formatDate(program.program_starts) : 'Start date not set'} – {program.program_ends ? formatDate(program.program_ends) : 'End date not set'}</option>)}</select></label></div><div className="application-filter-bar" role="group" aria-label="Filter programs by schedule"><button type="button" className={`application-filter ${programPhaseFilter === 'All' ? 'application-filter-active' : ''}`} onClick={() => setProgramPhaseFilter('All')}>All programs <span>{trainingPrograms.length}</span></button>{phases.map((phase) => <button type="button" key={phase} className={`application-filter ${programPhaseFilter === phase ? 'application-filter-active' : ''}`} onClick={() => setProgramPhaseFilter(phase)}>{phase} <span>{trainingPrograms.filter((program) => trainingProgramPhase(program) === phase).length}</span></button>)}</div></>}
    {error ? <div className="error-panel">{error}</div> : loading && !data ? <div className="loading-state"><span className="spinner"></span>Loading applications…</div> : filteredItems.length ? <div className={`application-list ${isStudent ? 'application-list-student' : 'application-list-review'}`}>{filteredItems.map((item) => <article key={`${item.kind || 'job'}-${item.id}`} className="application-card application-summary-card">
      <div className="application-card-heading"><span className={`application-icon ${item.kind === 'training' ? 'application-icon-training' : ''}`}><Icon name={item.kind === 'training' ? 'graduation' : 'briefcase'} /></span><div className="application-job-heading"><span className="eyebrow">{isStudent ? (item.kind === 'training' ? 'TRAINING REGISTRATION' : 'JOB APPLICATION') : (isProvider ? 'PROGRAM APPLICANT' : 'JOB APPLICANT')}</span><h2>{item.title}</h2><p>{item.organization} <span>·</span> {item.location}</p></div><span className={`application-status-badge badge badge-${(item.status || 'submitted').toLowerCase()}`}>{applicationStatusLabel(item.status, item.kind)}</span></div>
      <div className="application-summary-footer"><div className="application-summary-applicant">{isStudent ? <><span className="applicant-submitted">Submitted {formatDate(item.created_at)}</span>{item.resume_original_name && <span className="application-file-indicator"><Icon name="file" /> File attached</span>}</> : <><span className="applicant-avatar">{(item.applicant_name || 'A').trim().charAt(0).toUpperCase()}</span><span><strong>{item.applicant_name}</strong><small>{item.applicant_email}</small></span><span className="applicant-submitted">Applied {formatDate(item.created_at)}</span>{item.kind !== 'training' && (item.resume_original_name ? <span className="application-file-indicator"><Icon name="file" /> Attachment</span> : <span className="application-no-file-indicator">No attachment</span>)}</>}</div><button className="button button-primary button-small" onClick={() => setSelectedApplication(item)}>View application <Icon name="arrow" /></button></div>
    </article>)}</div> : statusFilter !== 'All' && items.length ? <EmptyState icon="briefcase" title={`No ${statusFilter.toLowerCase()} applications`}>Choose another status above to see more applications.</EmptyState> : <EmptyState icon="briefcase" title={isStudent ? 'No applications yet' : 'No applicants yet'}>{isStudent ? 'Your submitted job applications and training registrations will show up here.' : isProvider ? 'When candidates register for your training programs, their contact details and messages will appear here.' : 'When candidates apply to your job posts, their contact details and resumes will appear here.'}</EmptyState>}
  </div>{selectedApplication && <ApplicationDetailDialog application={selectedApplication} user={user} onClose={() => setSelectedApplication(null)} onUpdate={updateSelectedStatus} onWithdraw={onWithdraw} />}</section>;
}

export function SkillsPage({ user, onSaveSkills, onAnalyze }) {
  const navigateFromChild = useNavigate();
  const [skills, setSkills] = useState(user?.skills || []);
  const [skill, setSkill] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = async () => {
    setAnalyzing(true);
    setAnalysisError('');
    try {
      if (!await onSaveSkills(skills)) {
        return;
      }
      const response = await onAnalyze();
      setAnalysis(response.recommendations);
    } catch (caught) {
      setAnalysisError(caught.message);
    } finally {
      setAnalyzing(false);
    }
  };
  return <section className="page-shell"><div className="page-banner"><div><span className="eyebrow">BUILD YOUR NEXT STEP</span><h1>Skills gap analysis</h1><p>Compare your skills with employer requirements and find training that addresses real skill gaps.</p></div><span className="banner-mark"><Icon name="spark" /></span></div><div className="page-content skills-layout"><section className="dashboard-panel"><span className="eyebrow">YOUR PROFILE</span><h2>Skills you already have</h2><div className="skill-editor">{skills.map((item) => <span className="chip" key={item}>{item}<button aria-label={`Remove ${item}`} onClick={() => setSkills((current) => current.filter((entry) => entry !== item))}>×</button></span>)}</div><form className="inline-form" onSubmit={(event) => { event.preventDefault(); const next = skill.trim(); if (next && !skills.some((entry) => entry.toLowerCase() === next.toLowerCase())) setSkills((current) => [...current, next]); setSkill(''); }}><input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Add a skill" /><button className="button button-secondary">Add skill</button></form><div className="actions"><button className="button button-primary" type="button" onClick={analyze} disabled={analyzing}><Icon name="spark" /> {analyzing ? 'Matching…' : 'Find my matches'}</button><button className="button button-secondary" type="button" onClick={() => onSaveSkills(skills)}>Save skills</button></div><small className="recommendation-note">Matches use your saved skills and requirements from published job and training listings.</small>{analysisError && <div className="error-panel" role="alert">{analysisError}</div>}</section>
    <section className="dashboard-panel analysis-panel"><span className="eyebrow">DATABASE MATCHES</span>{analysis ? <>
      <h2>Job opportunities</h2>{analysis.jobs.length ? <ul className="recommendation-list">{analysis.jobs.map((item) => <li key={item.id}><strong>{item.title}</strong> · {item.organization} · {item.location}<p><b>{item.match_percentage}% skills match</b></p><p>Matched: {item.matched_skills.join(', ') || 'None'}</p><p>To build: {item.missing_skills.join(', ') || 'No skill gaps'}</p></li>)}</ul> : <EmptyState title="No job matches yet">Save skills that match requirements on published job listings to see relevant matches here.</EmptyState>}
      <h2>Training for skill gaps</h2>{analysis.trainings.length ? <ul className="recommendation-list">{analysis.trainings.map((item) => <li key={item.id}><strong>{item.title}</strong> · {item.organization} · {item.location}<p><b>Covers {item.covered_missing_skills.join(', ')}</b></p><p>Recommended for: {item.related_jobs.map((job) => job.title).join(', ')}</p></li>)}</ul> : <EmptyState title="No matching training yet">No published training program currently covers the missing skills from the available job listings.</EmptyState>}
      <div className="ai-guidance" aria-live="polite"><span className="eyebrow">OPENAI SKILLS GUIDANCE</span>{analysis.ai_guidance ? <p>{analysis.ai_guidance}</p> : <p>{analysis.ai_guidance_status === 'not_configured' ? 'AI guidance is not configured yet. Your database-based matches are still available.' : 'AI guidance is temporarily unavailable. Your database-based matches are still available.'}</p>}<small>Guidance uses your skill labels and published listing requirements; database matches remain authoritative.</small></div>
      <Link to="/jobs" onNavigate={navigateFromChild} className="button button-secondary">Explore jobs <Icon name="arrow" /></Link> <Link to="/training" onNavigate={navigateFromChild} className="button button-secondary">Find training <Icon name="arrow" /></Link>
    </> : <EmptyState title="Your analysis starts here">Save your skills to compare them with actual published jobs and training programs.</EmptyState>}</section></div></section>;
}

export function LocationsPage({ onNavigate, listings = [], loading = false, error = '' }) {
  const mapContainer = useRef(null);
  const [mapStatus, setMapStatus] = useState('loading');
  const [mapMessage, setMapMessage] = useState('');
  useEffect(() => {
    let active = true;
    let mapInstance;
    const showMap = async () => {
      setMapStatus('loading');
      setMapMessage('');
      if (loading) return;
      if (error) {
        setMapStatus('error');
        setMapMessage(error);
        return;
      }
      try {
        mapInstance = renderOpportunityMap(mapContainer.current, listings);
        const result = await mapInstance.ready;
        if (!active) return;
        if (result.markerCount === 0) {
          setMapStatus('empty');
          setMapMessage(result.locationCount
            ? 'OpenStreetMap could not locate the published opportunity locations.'
            : 'No published employer or training-center locations are available to map yet.');
        } else {
          setMapStatus('ready');
          if (result.unresolvedCount > 0) {
            setMapMessage('Some published listing locations could not be located.');
          }
        }
      } catch (caught) {
        if (!active) return;
        setMapStatus('error');
        setMapMessage(caught.message);
      }
    };
    showMap();
    return () => {
      active = false;
      mapInstance?.destroy();
    };
  }, [listings, loading, error]);
  return <section className="page-shell"><div className="page-banner"><div><span className="eyebrow">ACROSS ORIENTAL MINDORO</span><h1>Opportunities close to home.</h1><p>View published job and training locations entered by participating organizations.</p></div><span className="banner-mark"><Icon name="pin" /></span></div><div className="page-content"><section className="dashboard-panel opportunity-map-panel"><div className="panel-heading"><div><span className="eyebrow">LIVE LISTINGS</span><h2>Employers and training centers</h2></div></div>{mapStatus === 'loading' && <p className="map-status">Loading opportunity locations…</p>}<div ref={mapContainer} className="opportunity-map" aria-label="Map of published employers and training centers" />{mapMessage && <p className={mapStatus === 'error' ? 'map-status map-status-error' : 'map-status'} role={mapStatus === 'error' ? 'alert' : 'status'}>{mapMessage}</p>}</section><div className="map-note"><span className="feature-icon"><Icon name="pin" /></span><div><strong>Database-backed locations</strong><p>Markers represent published job and training listings. Municipality-level addresses may be approximate; unresolved locations are not shown.</p></div></div></div></section>;
}

export function ProfilePage({ user, onTogglePush, pushEnabled, onEmailChange, onSave, onUploadPhoto }) {
  const navigateFromChild = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', location: user?.location || '', organization: user?.organization || '', qualifications: user?.qualifications || '', experience: user?.experience || '' });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const saved = await onSave({
      name: form.name,
      location: form.location,
      ...(user?.role === 'student' ? { qualifications: form.qualifications, experience: form.experience } : {}),
      ...(user?.role === 'employer' || user?.role === 'provider' ? { organization: form.organization } : {})
    });
    if (saved) setForm((current) => ({ ...current, name: form.name.trim(), location: form.location.trim(), organization: form.organization.trim() }));
    setBusy(false);
  };
  return <section className="page-shell"><div className="page-banner"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Profile and preferences</h1><p>Manage your contact information and notification settings.</p></div><span className="banner-mark"><Icon name="spark" /></span></div><div className="page-content profile-grid"><section className="dashboard-panel"><span className="eyebrow">ACCOUNT DETAILS</span>{user?.profile_image_url ? <img className="profile-avatar profile-avatar-image" src={user.profile_image_url} alt="Profile" /> : <div className="profile-avatar">{user?.name?.[0] || 'U'}</div>}<h2>{user?.name}</h2><p>{roles[user?.role]} · {user?.location || 'Oriental Mindoro'}</p><label className="form-label">Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setPhotoBusy(true); await onUploadPhoto(file); setPhotoBusy(false); event.target.value = ''; }} /> <small>JPG, PNG, or WebP; maximum 2 MB. Your profile photo is publicly viewable.</small></label><form className="form-stack profile-form" onSubmit={submit}><label className="form-label">Name<input required minLength="2" name="name" value={form.name} onChange={update} /></label><label className="form-label">Municipality<input maxLength="160" name="location" value={form.location} onChange={update} /></label>{['employer', 'provider'].includes(user?.role) && <label className="form-label">Organization<input required minLength="2" maxLength="180" name="organization" value={form.organization} onChange={update} /></label>}{user?.role === 'student' && <><label className="form-label">Qualifications<textarea maxLength="2000" rows="3" name="qualifications" value={form.qualifications} onChange={update} placeholder="Certificates, education, or other relevant qualifications" /></label><label className="form-label">Experience<textarea maxLength="5000" rows="4" name="experience" value={form.experience} onChange={update} placeholder="Relevant work, volunteer, or practical experience" /></label></>}<div className="profile-detail"><span>Email</span><strong>{user?.email}</strong></div><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></form>      </section><section className="dashboard-panel"><span className="eyebrow">ALERT PREFERENCES</span><h2>Stay up to date</h2><p>Choose where to receive updates when new jobs and training programs are published.</p><label className="preference-toggle"><span><strong>Email updates</strong><small>Send alerts to {user?.email}</small></span><input type="checkbox" checked={Boolean(user?.email_alerts)} onChange={(event) => onEmailChange(event.target.checked)} /><span className="toggle-track" aria-hidden="true"></span></label><button className={`button ${pushEnabled ? 'button-secondary' : 'button-primary'}`} onClick={onTogglePush}>{pushEnabled ? 'Disable browser alerts' : 'Enable browser alerts'}</button><Link to="/notifications" onNavigate={navigateFromChild} className="text-link profile-notifications">View notification inbox <Icon name="arrow" /></Link></section></div></section>;
}
