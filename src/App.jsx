import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Brand, Link, Toast, OpportunityDialog } from './components/ui.jsx';
import { HomePage, ExplorePage, AuthPage } from './pages/public/index.jsx';
import { DashboardPage } from './pages/dashboard/index.jsx';
import { NotificationsPage, ApplicationsPage as StudentApplicationsPage, SkillsPage, LocationsPage, ProfilePage } from './pages/student/index.jsx';
import { ManagePage as EmployerManagePage, ApplicationsPage as EmployerApplicationsPage } from './pages/employer/index.jsx';
import { ManagePage as ProviderManagePage, ApplicationsPage as ProviderApplicationsPage } from './pages/provider/index.jsx';
import { ReviewPage, ReportsPage } from './pages/admin/index.jsx';
import { api } from './services/api.js';
import { loadSavedListings, storeSavedListings } from './services/saved-listings.js';
import { clearApplicationDraft } from './services/application-drafts.js';

function appPath(path) {
  return `${window.TARA_APP_BASE || ''}${path}` || '/';
}

function registerServiceWorker() {
  return navigator.serviceWorker.register(appPath('/service-worker.js'));
}

function ApplicationShell() {
  const location = useLocation();
  const route = location.pathname;
  const routerNavigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [pageData, setPageData] = useState({});

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    registerServiceWorker().catch((caught) => console.error('Unable to register service worker:', caught));
  }, []);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeOpportunity, setActiveOpportunity] = useState(null);
  const [savedListings, setSavedListings] = useState({ jobs: [], trainings: [] });

  const notify = useCallback((text, type = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const navigate = useCallback((to) => {
    routerNavigate(to);
    setMobileOpen(false);
  }, [routerNavigate]);

  useEffect(() => {
    api.me()
      .then((result) => setUser(result.user || null))
      .catch((caught) => notify(`Couldn't verify your sign-in: ${caught.message}`, 'error'))
      .finally(() => setAuthReady(true));
  }, [notify]);

  useEffect(() => {
    try {
      setSavedListings(loadSavedListings());
    } catch (caught) {
      notify(caught.message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    setMobileOpen(false);
    if (location.hash) {
      window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  const load = useCallback(async (key, task) => {
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));
    try {
      let data;
      try {
        data = await task();
      } catch (caught) {
        if (key !== 'dashboard' || !Number.isInteger(caught.status) || caught.status < 500) throw caught;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        data = await task();
      }
      setPageData((current) => ({ ...current, [key]: data }));
    } catch (caught) {
      setErrors((current) => ({ ...current, [key]: caught.message }));
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, []);

  useEffect(() => {
    const publicPaths = ['/jobs', '/training', '/'];
    if (route === '/jobs') load('jobs', api.jobs);
    else if (route === '/training') load('trainings', api.trainings);
    else if (route === '/locations') {
      load('jobs', api.jobs);
      load('trainings', api.trainings);
    }
    else if (route === '/') {
      load('jobs', api.jobs);
      load('trainings', api.trainings);
    }
    if (publicPaths.includes(route) || route === '/locations') return;
    if (!authReady) return;
    if (route === '/notifications' && user) load('notifications', api.notifications);
    else if (route === '/applications' && user) load('applications', api.applications);
    else if (['/dashboard', '/manage', '/review', '/reports'].includes(route) && user) {
      load('dashboard', api.dashboard);
      if (['employer', 'provider'].includes(user.role) && route === '/manage') load('ownListings', api.ownListings);
    } else if (!publicPaths.includes(route) && !['/login', '/register', '/locations'].includes(route) && !user) {
      navigate('/login');
    } else if (user && (
      (route === '/manage' && !['employer', 'provider'].includes(user.role)) ||
      (['/review', '/reports'].includes(route) && user.role !== 'admin') ||
      (route === '/skills' && user.role !== 'student')
    )) {
      navigate('/dashboard');
    }
  }, [authReady, route, user, load, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'student') return undefined;
    const refresh = () => api.notifications().then((result) => {
      setPageData((current) => ({ ...current, notifications: result }));
    }).catch((caught) => console.error('Unable to refresh notifications:', caught));
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, [user, route]);

  useEffect(() => {
    if (!user || user.role !== 'student' || !('serviceWorker' in navigator)) {
      setPushEnabled(false);
      return undefined;
    }
    let active = true;
    registerServiceWorker().then((registration) => registration.pushManager.getSubscription()).then((subscription) => {
      if (active) setPushEnabled(Boolean(subscription));
    }).catch((caught) => console.error('Unable to read browser push subscription:', caught));
    return () => { active = false; };
  }, [user]);

  const unreadCount = pageData.notifications
    ? (pageData.notifications.notifications || []).filter((notification) => !notification.read_at).length
    : Number(pageData.dashboard?.stats?.unread || 0);
  const locationListings = useMemo(
    () => [...(pageData.jobs?.items || []), ...(pageData.trainings?.items || [])],
    [pageData.jobs?.items, pageData.trainings?.items]
  );
  const navItems = useMemo(() => {
    if (!user) return [{ label: 'Explore jobs', to: '/jobs' }, { label: 'Training', to: '/training' }, { label: 'Opportunity map', to: '/locations' }, { label: 'About', to: '/#about' }];
    if (user.role === 'student') return [{ label: 'Overview', to: '/dashboard' }, { label: 'Find jobs', to: '/jobs' }, { label: 'Training', to: '/training' }, { label: 'Opportunity map', to: '/locations' }, { label: 'Skills gap', to: '/skills' }, { label: 'My applications', to: '/applications' }];
    if (user.role === 'employer') return [{ label: 'Overview', to: '/dashboard' }, { label: 'My job posts', to: '/manage' }, { label: 'Applications', to: '/applications' }, { label: 'Opportunity map', to: '/locations' }];
    if (user.role === 'provider') return [{ label: 'Overview', to: '/dashboard' }, { label: 'Training programs', to: '/manage' }, { label: 'Applications', to: '/applications' }, { label: 'Opportunity map', to: '/locations' }];
    return [{ label: 'Overview', to: '/dashboard' }, { label: 'Review listings', to: '/review' }, { label: 'Reports', to: '/reports' }, { label: 'Opportunity map', to: '/locations' }];
  }, [user]);

  const signOut = async () => {
    try { await api.logout(); } catch (caught) { notify(caught.message, 'error'); return; }
    setUser(null);
    setPageData({});
    navigate('/');
    notify('You have been signed out.');
  };

  const handleApply = async (listing, type) => {
    setActiveOpportunity({ listing, kind: type });
  };

  const toggleSavedListing = (kind, id) => {
    const key = kind === 'training' ? 'trainings' : 'jobs';
    const numericId = Number(id);
    const current = savedListings[key];
    const isSaved = current.includes(numericId);
    const next = {
      ...savedListings,
      [key]: isSaved ? current.filter((savedId) => savedId !== numericId) : [...current, numericId]
    };
    try {
      storeSavedListings(next);
      setSavedListings(next);
      notify(`${kind === 'training' ? 'Training' : 'Job'} ${isSaved ? 'removed from' : 'saved to'} your bookmarks.`);
    } catch (caught) {
      notify(`Could not update saved listings: ${caught.message}`, 'error');
    }
  };

  const submitJobApplication = async (formData) => {
    if (!formData) {
      setActiveOpportunity(null);
      navigate('/login');
      notify('Sign in with a job seeker account to apply.', 'info');
      return false;
    }
    if (user?.role !== 'student') {
      setActiveOpportunity(null);
      notify('Only job seeker accounts can apply for jobs.', 'error');
      return false;
    }
    await api.apply(formData);
    notify(activeOpportunity?.kind === 'training' ? 'Your training registration was submitted.' : 'Your job application and resume were submitted.');
    return true;
  };

  const requestPermission = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Push notifications are not supported by this browser.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Browser notification permission was not granted.');
      const { public_key: publicKey } = await api.pushKey();
      if (!publicKey) throw new Error('Browser push is not configured on the server yet.');
      const registration = await registerServiceWorker();
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
      await api.subscribePush(subscription.toJSON());
      setPushEnabled(true);
      notify('Browser alerts are enabled on this device.');
    } catch (caught) { notify(caught.message, 'error'); }
  };

  const disablePush = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration(appPath('/'));
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api.deletePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      notify('Browser alerts disabled on this device.');
    } catch (caught) { notify(caught.message, 'error'); }
  };

  const markRead = async (id) => {
    try {
      await api.markRead(id);
      setPageData((current) => ({
        ...current,
        notifications: current.notifications ? {
          ...current.notifications,
          notifications: current.notifications.notifications.map((item) => Number(item.id) === Number(id) ? { ...item, read_at: item.read_at || new Date().toISOString(), is_read: 1 } : item)
        } : current.notifications
      }));
      void load('notifications', api.notifications);
    } catch (caught) { notify(caught.message, 'error'); }
  };

  const openNotification = async (item) => {
    await markRead(item.id);
    try {
      const target = new URL(item.url || '/notifications', window.location.origin);
      if (target.origin !== window.location.origin) throw new Error('This notification link is not available.');
      navigate(`${target.pathname}${target.search}${target.hash}`);
    } catch (caught) {
      notify(caught.message, 'error');
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllRead();
      setPageData((current) => ({
        ...current,
        notifications: current.notifications ? {
          ...current.notifications,
          notifications: current.notifications.notifications.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString(), is_read: 1 }))
        } : current.notifications
      }));
      void load('notifications', api.notifications);
      notify('All notifications marked as read.');
    } catch (caught) { notify(caught.message, 'error'); }
  };

  const saveEmailPreference = async (enabled) => {
    try {
      await api.updatePreferences(enabled);
      setUser((current) => current ? { ...current, email_alerts: enabled } : current);
      notify(enabled ? 'Email alerts enabled.' : 'Email alerts disabled.');
    } catch (caught) { notify(caught.message, 'error'); }
  };

  const saveProfile = async (values) => {
    try {
      const result = await api.updateProfile(values);
      setUser(result.user);
      notify('Profile updated.');
      return true;
    } catch (caught) {
      notify(caught.message, 'error');
      return false;
    }
  };

  const uploadProfilePhoto = async (file) => {
    try {
      const result = await api.updateProfilePhoto(file);
      setUser(result.user);
      notify('Profile photo updated.');
      return true;
    } catch (caught) {
      notify(caught.message, 'error');
      return false;
    }
  };

  const togglePush = pushEnabled ? disablePush : requestPermission;

  if (![
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/jobs',
    '/training',
    '/notifications',
    '/applications',
    '/manage',
    '/review',
    '/reports',
    '/skills',
    '/locations',
    '/profile'
  ].includes(route)) {
    return <Navigate replace to="/" />;
  }

  let content;
  if (route === '/login' || route === '/register') {
    content = <AuthPage mode={route.slice(1)} onNavigate={navigate} onAuthenticated={(nextUser) => { setUser(nextUser); navigate('/dashboard'); notify(`Welcome, ${nextUser.name}.`); }} onError={(message) => notify(message, 'error')} />;
  } else if (route === '/jobs' || route === '/training') {
    const isTraining = route === '/training';
    const kind = isTraining ? 'training' : 'job';
    const entries = isTraining ? pageData.trainings?.items : pageData.jobs?.items;
    content = <ExplorePage kind={kind} entries={entries} loading={Boolean(loading[isTraining ? 'trainings' : 'jobs'])} error={errors[isTraining ? 'trainings' : 'jobs']} onRetry={() => load(isTraining ? 'trainings' : 'jobs', isTraining ? api.trainings : api.jobs)} onNavigate={navigate} user={user} savedIds={savedListings[isTraining ? 'trainings' : 'jobs']} onToggleSave={(id) => toggleSavedListing(kind, id)} onApply={handleApply} />;
  } else if (route === '/notifications') {
    content = <NotificationsPage items={pageData.notifications?.notifications || []} loading={Boolean(loading.notifications)} error={errors.notifications} onRead={markRead} onOpen={openNotification} onReadAll={markAllRead} onTogglePush={togglePush} pushEnabled={pushEnabled} onRetry={() => load('notifications', api.notifications)} />;
  } else if (route === '/applications') {
    const ApplicationsPage = user?.role === 'provider'
      ? ProviderApplicationsPage
      : user?.role === 'employer'
        ? EmployerApplicationsPage
        : StudentApplicationsPage;
    content = <ApplicationsPage data={pageData.applications} user={user} loading={Boolean(loading.applications)} error={errors.applications} onUpdate={async (id, status, kind = 'job') => {
      try {
        await api.updateApplication(id, status, kind);
        setPageData((current) => ({ ...current, applications: current.applications ? {
          ...current.applications,
          applications: current.applications.applications.map((item) => Number(item.id) === Number(id) ? { ...item, status } : item)
        } : current.applications }));
        void load('applications', api.applications);
        notify('Application status updated.');
        return true;
      }
      catch (caught) { notify(caught.message, 'error'); return false; }
    }} onWithdraw={async (id, kind = 'job') => {
      try {
        await api.withdrawApplication(id, kind);
        setPageData((current) => current.applications ? {
          ...current,
          applications: {
            ...current.applications,
            applications: current.applications.applications.map((item) => Number(item.id) === Number(id) && item.kind === kind ? { ...item, status: 'Withdrawn' } : item)
          }
        } : current);
        void load('applications', api.applications);
        notify('Application withdrawn.');
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} />;
  } else if (route === '/manage') {
    const ManagePage = user?.role === 'provider' ? ProviderManagePage : EmployerManagePage;
    content = <ManagePage user={user} listings={pageData.ownListings?.items || []} loading={Boolean(loading.ownListings || !pageData.ownListings)} error={errors.ownListings} onRetry={() => load('ownListings', api.ownListings)} onCreate={async (values) => {
      try {
        await api.createListing(values);
        await Promise.all([load('ownListings', api.ownListings), load('dashboard', api.dashboard)]);
        notify('Your listing was submitted for review.');
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} onUpdateJob={async (id, values) => {
      try {
        const result = await api.updateJobListing(id, values);
        await Promise.all([load('ownListings', api.ownListings), load('dashboard', api.dashboard)]);
        notify(`Job listing updated. Status remains ${result.status}.`);
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} onCloseJob={async (id) => {
      try {
        await api.closeJobListing(id);
        await Promise.all([load('ownListings', api.ownListings), load('dashboard', api.dashboard)]);
        notify('Job listing closed. Existing applications are kept.');
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} onCloseTraining={async (id) => {
      try {
        await api.closeTrainingListing(id);
        await Promise.all([load('ownListings', api.ownListings), load('dashboard', api.dashboard)]);
        notify('Training program marked completed. Existing registrations are kept.');
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} />;
  } else if (route === '/review') {
    content = <ReviewPage data={pageData.dashboard} loading={Boolean(loading.dashboard)} error={errors.dashboard} onRetry={() => load('dashboard', api.dashboard)} onModerate={async (id, status, kind = 'job') => {
      try {
        await api.moderateListing(id, status, kind);
        setPageData((current) => ({ ...current, dashboard: current.dashboard ? {
          ...current.dashboard,
          pending_listings: (current.dashboard.pending_listings || []).filter((item) => !(Number(item.id) === Number(id) && item.kind === kind)),
          stats: { ...current.dashboard.stats, pending: Math.max(0, Number(current.dashboard.stats?.pending || 0) - 1) }
        } : current.dashboard }));
        void load('dashboard', api.dashboard);
        notify(`Listing ${status.toLowerCase()}.`);
        return true;
      } catch (caught) {
        notify(caught.message, 'error');
        return false;
      }
    }} />;
  } else if (route === '/skills') {
    content = <SkillsPage
      user={user}
      onAnalyze={() => api.recommendations()}
      onSaveSkills={(skills) => saveProfile({ skills })}
    />;
  } else if (route === '/locations') {
    content = <LocationsPage
      listings={locationListings}
      loading={Boolean(loading.jobs || loading.trainings || !pageData.jobs || !pageData.trainings)}
      error={errors.jobs || errors.trainings}
      onNavigate={navigate}
    />;
  } else if (route === '/profile') {
    content = <ProfilePage
      user={user}
      onTogglePush={togglePush}
      pushEnabled={pushEnabled}
      onEmailChange={saveEmailPreference}
      onSave={saveProfile}
      onUploadPhoto={uploadProfilePhoto}
    />;
  } else if (route === '/reports') {
    content = <ReportsPage data={pageData.dashboard} loading={Boolean(loading.dashboard)} error={errors.dashboard} onRetry={() => load('dashboard', api.dashboard)} />;
  } else if (route === '/' || route === '/#about') {
    content = <HomePage jobs={pageData.jobs?.items || []} trainings={pageData.trainings?.items || []} jobError={errors.jobs} trainingError={errors.trainings} onNavigate={navigate} onApply={handleApply} onToggleSave={(id) => toggleSavedListing('job', id)} savedListings={savedListings} user={user} />;
  } else {
    content = <DashboardPage user={user} data={pageData.dashboard} loading={Boolean(loading.dashboard)} error={errors.dashboard} onRetry={() => load('dashboard', api.dashboard)} onNavigate={navigate} />;
  }

  return <div className="app-shell">
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" onNavigate={navigate} aria-label="Tara-Trabaho home"><Brand /></Link>
        <nav className={`main-nav ${mobileOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => <Link key={item.to} to={item.to} onNavigate={navigate} className={route === item.to ? 'nav-link nav-link-active' : 'nav-link'}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          {!authReady ? <span className="header-auth-loading" role="status">Checking session…</span> : user ? <>
            {user.role === 'student' && <Link to="/notifications" onNavigate={navigate} className="notification-link" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}><Icon name="bell" />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>}
            <Link to="/profile" onNavigate={navigate} className="user-chip"><span className="avatar">{user.name?.[0] || 'U'}</span><span>{user.name}</span></Link>
            <button className="button button-ghost header-signin" onClick={signOut}>Sign out</button>
          </> : <>
            <Link to="/login" onNavigate={navigate} className="button button-ghost header-signin">Sign in</Link>
            <Link to="/register" onNavigate={navigate} className="button button-primary header-join">Create account</Link>
          </>}
        </div>
        <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
      </div>
    </header>
    <main>{!authReady && !['/', '/jobs', '/training', '/locations', '/login', '/register'].includes(route)
      ? <section className="page-shell"><div className="loading-state" role="status"><span className="spinner" /><span>Checking your session…</span></div></section>
      : content}{activeOpportunity && <OpportunityDialog key={`${activeOpportunity.kind}-${activeOpportunity.listing.id}`} listing={activeOpportunity.listing} kind={activeOpportunity.kind} user={user} onClose={() => setActiveOpportunity(null)} onSubmit={submitJobApplication} onClearDraft={(kind, id) => {
      try {
        clearApplicationDraft(kind, id);
      } catch (caught) {
        notify(`Your application was submitted, but the saved draft could not be removed: ${caught.message}`, 'error');
      }
    }} onNotify={(message) => notify(message)} />}</main>
    <footer className="site-footer">
      <div className="footer-inner"><div><Brand /><p>Local opportunity. Real skills. A future that moves.</p></div><div className="footer-links"><Link to="/jobs" onNavigate={navigate}>Find jobs</Link><Link to="/training" onNavigate={navigate}>Training</Link><Link to="/locations" onNavigate={navigate}>Locations</Link><Link to="/#about" onNavigate={navigate}>About</Link></div><small>© {new Date().getFullYear()} TARA-TRABAHO · Oriental Mindoro</small></div>
    </footer>
    <Toast message={toast} onClose={() => setToast(null)} />
  </div>;
}

function decodeVapidKey(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0));
}





























function LegacyRedirect({ to }) {
  const location = useLocation();
  return <Navigate replace to={{ pathname: to, search: location.search, hash: location.hash }} />;
}

function App() {
  return <BrowserRouter basename={window.TARA_APP_BASE || '/'}>
    <Routes>
      <Route path="/index.html" element={<LegacyRedirect to="/" />} />
      <Route path="/dashboard.html" element={<LegacyRedirect to="/dashboard" />} />
      <Route path="/jobs.html" element={<LegacyRedirect to="/jobs" />} />
      <Route path="/training.html" element={<LegacyRedirect to="/training" />} />
      <Route path="/login.html" element={<LegacyRedirect to="/login" />} />
      <Route path="/register.html" element={<LegacyRedirect to="/register" />} />
      <Route path="/notifications.html" element={<LegacyRedirect to="/notifications" />} />
      <Route path="/my-applications.html" element={<LegacyRedirect to="/applications" />} />
      <Route path="/application.html" element={<LegacyRedirect to="/applications" />} />
      <Route path="/profile.html" element={<LegacyRedirect to="/profile" />} />
      <Route path="/skills-gap.html" element={<LegacyRedirect to="/skills" />} />
      <Route path="/map.html" element={<LegacyRedirect to="/locations" />} />
      <Route path="/employer-dashboard.html" element={<LegacyRedirect to="/dashboard" />} />
      <Route path="/employer-jobs.html" element={<LegacyRedirect to="/manage" />} />
      <Route path="/employer-applications.html" element={<LegacyRedirect to="/applications" />} />
      <Route path="/provider-dashboard.html" element={<LegacyRedirect to="/dashboard" />} />
      <Route path="/provider-programs.html" element={<LegacyRedirect to="/manage" />} />
      <Route path="/provider-applications.html" element={<LegacyRedirect to="/applications" />} />
      <Route path="/admin-dashboard.html" element={<LegacyRedirect to="/dashboard" />} />
      <Route path="/admin-jobs.html" element={<LegacyRedirect to="/review" />} />
      <Route path="/admin-programs.html" element={<LegacyRedirect to="/review" />} />
      <Route path="/admin-reports.html" element={<LegacyRedirect to="/reports" />} />
      <Route path="*" element={<ApplicationShell />} />
    </Routes>
  </BrowserRouter>;
}

export default App;
