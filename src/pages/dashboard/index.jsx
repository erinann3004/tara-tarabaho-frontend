import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { EmptyState, Icon, Link } from '../../components/ui.jsx';
import { roles } from '../../utils/roles.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);

const CHART_COLORS = ['#2f6b46', '#8fb889', '#d7b46a', '#9d7bc3', '#5fa4b0', '#d57a6a', '#6e8ec6', '#cfb58b'];

const baseBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.y}` } }
  },
  scales: {
    x: { ticks: { color: '#607567', maxRotation: 0 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#607567' }, grid: { color: 'rgba(44,66,53,.06)' } }
  }
};

const horizontalBarOptions = {
  ...baseBarOptions,
  indexAxis: 'y',
  scales: {
    x: { beginAtZero: true, max: 100, ticks: { color: '#607567' }, grid: { color: 'rgba(44,66,53,.06)' } },
    y: { ticks: { color: '#607567' }, grid: { display: false } }
  }
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, color: '#5f7166', boxWidth: 10 }
    },
    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}` } }
  }
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.y}` } }
  },
  scales: {
    x: { ticks: { color: '#607567' }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#607567' }, grid: { color: 'rgba(44,66,53,.06)' } }
  }
};

function chartDataset(labels, values, colors = CHART_COLORS) {
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.slice(0, Math.max(labels.length, 1)).map((color, index) => index % 2 === 0 ? color : `${color}CC`),
      borderColor: '#ffffff',
      borderWidth: 2,
      borderRadius: 8,
      barThickness: 28
    }]
  };
}

function chartDoughnut(labels, values, colors = CHART_COLORS) {
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };
}

function chartLine(labels, values) {
  return {
    labels,
    datasets: [{
      data: values,
      borderColor: '#2f6b46',
      backgroundColor: 'rgba(47,107,70,0.18)',
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#2f6b46',
      pointBorderColor: '#f8fbf8',
      pointRadius: 4,
      pointHoverRadius: 5
    }]
  };
}

function ChartZeroState({ label }) {
  return <div className="chart-zero-state" role="img" aria-label={`0 ${label}`}>
    <span className="chart-zero-ring"><strong>0</strong></span>
    <span className="chart-zero-label">{label}</span>
  </div>;
}

function ChartCard({ title, subtitle, children, empty }) {
  return <section className="dashboard-panel chart-panel">
    <div className="panel-heading chart-heading">
      <div>
        <span className="eyebrow">{subtitle || 'ANALYTICS'}</span>
        <h2>{title}</h2>
      </div>
    </div>
    {empty ? <ChartZeroState label={title} /> : children}
  </section>;
}

function renderChart(data, chartType) {
  if (!data || !data.available && data.available !== undefined) {
    return <ChartZeroState label="Applications" />;
  }

  const labels = data?.labels || [];
  const values = data?.values || [];
  if (!labels.length || !values.length) {
    return <ChartZeroState label="Records" />;
  }

  if (chartType === 'doughnut') {
    return <div className="chart-canvas"><Doughnut data={chartDoughnut(labels, values)} options={doughnutOptions} /></div>;
  }
  if (chartType === 'line') {
    return <div className="chart-canvas"><Line data={chartLine(labels, values)} options={lineOptions} /></div>;
  }
  if (chartType === 'horizontal-bar') {
    return <div className="chart-canvas"><Bar data={chartDataset(labels, values)} options={horizontalBarOptions} /></div>;
  }

  return <div className="chart-canvas"><Bar data={chartDataset(labels, values)} options={baseBarOptions} /></div>;
}

function renderRoleAnalytics(role, analytics) {
  if (role === 'student') {
    const skillMatch = analytics.skill_match || {};
    const status = analytics.application_status || {};
    const recommended = analytics.recommended_opportunities || {};

    return <div className="chart-grid">
      <ChartCard title="Skill match overview" subtitle="YOUR PROFILE" empty={!skillMatch || !skillMatch.labels || !skillMatch.labels.length} emptyMessage={skillMatch?.message || 'No skill match data is available yet.'}>
        <div className="chart-canvas chart-canvas-compact"><Bar data={chartDataset(skillMatch.labels || ['Average match'], skillMatch.values || [0])} options={{ ...horizontalBarOptions, scales: { ...horizontalBarOptions.scales, x: { ...horizontalBarOptions.scales.x, max: 100 } } }} /></div>
      </ChartCard>
      <ChartCard title="Application status" subtitle="MY APPLICATIONS" empty={!status || !status.labels || !status.labels.length} emptyMessage={status?.message || 'No application activity yet.'}>
        {renderChart(status, 'doughnut')}
      </ChartCard>
      <ChartCard title="Recommended opportunities" subtitle="MATCHES" empty={false}>
        <div className="analytics-summary-grid">
          <article className="mini-stat"><span className="mini-stat-value">{Number(recommended.jobs || 0)}</span><span className="mini-stat-label">Matching jobs</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(recommended.trainings || 0)}</span><span className="mini-stat-label">Training options</span></article>
        </div>
      </ChartCard>
    </div>;
  }

  if (role === 'employer') {
    const overview = analytics.job_overview || {};
    const applicationsPerJob = analytics.applications_per_job || {};
    const applicationStatus = analytics.application_status || {};

    return <div className="chart-grid">
      <ChartCard title="Job vacancy overview" subtitle="WORKSPACE" empty={false}>
        <div className="analytics-summary-grid">
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.published || 0)}</span><span className="mini-stat-label">Vacancies</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.applicants || 0)}</span><span className="mini-stat-label">Applicants</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.active || 0)}</span><span className="mini-stat-label">Active</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.closed || 0)}</span><span className="mini-stat-label">Closed</span></article>
        </div>
      </ChartCard>
      <ChartCard title="Applications per job" subtitle="DELIVERY" empty={!applicationsPerJob || !applicationsPerJob.labels || !applicationsPerJob.labels.length} emptyMessage={applicationsPerJob?.message || 'No applicants have been recorded for your vacancies yet.'}>
        {renderChart(applicationsPerJob, 'bar')}
      </ChartCard>
      <ChartCard title="Application status" subtitle="OUTCOMES" empty={!applicationStatus || !applicationStatus.labels || !applicationStatus.labels.length} emptyMessage={applicationStatus?.message || 'No application outcomes available yet.'}>
        {renderChart(applicationStatus, 'doughnut')}
      </ChartCard>
    </div>;
  }

  if (role === 'provider') {
    const overview = analytics.training_overview || {};
    const status = analytics.training_applications_status || {};
    const programs = analytics.popular_training_programs || {};

    return <div className="chart-grid">
      <ChartCard title="Training program overview" subtitle="PROGRAMS" empty={false}>
        <div className="analytics-summary-grid">
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.total_programs || 0)}</span><span className="mini-stat-label">Published</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.published_programs || 0)}</span><span className="mini-stat-label">Live programs</span></article>
          <article className="mini-stat"><span className="mini-stat-value">{Number(overview.applicants || 0)}</span><span className="mini-stat-label">Applicants</span></article>
        </div>
      </ChartCard>
      <ChartCard title="Training applications" subtitle="STATUS" empty={!status || !status.labels || !status.labels.length} emptyMessage={status?.message || 'No training applications have been received yet.'}>
        {renderChart(status, 'doughnut')}
      </ChartCard>
      <ChartCard title="Popular training programs" subtitle="TOP PROGRAMS" empty={!programs || !programs.labels || !programs.labels.length} emptyMessage={programs?.message || 'No training program activity yet.'}>
        {renderChart(programs, 'bar')}
      </ChartCard>
    </div>;
  }

  if (role === 'admin') {
    const userDistribution = analytics.user_distribution || {};
    const industry = analytics.job_vacancies_by_industry || {};
    const skills = analytics.most_demanded_skills || {};
    const status = analytics.application_status || {};
    const trend = analytics.job_vacancy_trend || {};

    return <div className="chart-grid admin-chart-grid">
      <ChartCard title="User distribution" subtitle="ACCOUNTS" empty={!userDistribution || !userDistribution.labels || !userDistribution.labels.length} emptyMessage={userDistribution?.message || 'No user data available.'}>
        {renderChart(userDistribution, 'doughnut')}
      </ChartCard>
      <ChartCard title="Job posts by industry" subtitle="MARKET" empty={!industry || !industry.labels || !industry.labels.length}>
        {renderChart(industry, 'bar')}
      </ChartCard>
      <ChartCard title="Most requested skills" subtitle="WORKFORCE" empty={!skills || !skills.labels || !skills.labels.length}>
        {renderChart(skills, 'horizontal-bar')}
      </ChartCard>
      <ChartCard title="Application status" subtitle="OUTCOMES" empty={!status || !status.labels || !status.labels.length} emptyMessage={status?.message || 'No application outcome data available yet.'}>
        {renderChart(status, 'doughnut')}
      </ChartCard>
      <ChartCard title="Job listing status" subtitle="MODERATION" empty={!trend || !trend.labels || !trend.labels.length}>
        {renderChart(trend, 'doughnut')}
      </ChartCard>
    </div>;
  }

  return null;
}

export function DashboardPage({ user, data, loading, error, onRetry, onNavigate }) {
  const stats = data?.stats || {};
  const listingItems = data?.recent_listings || [];
  const analytics = data?.analytics || {};

  return <section className="page-shell">
    <div className="dashboard-welcome"><div><span className="eyebrow">{roles[user?.role] || 'Your workspace'}</span><h1>Welcome back, {user?.name?.split(' ')[0] || 'there'}.</h1><p>{user?.role === 'student' ? 'Your next opportunity could be one search away.' : 'Here is what is happening in your workspace today.'}</p></div><span className="welcome-mark"><Icon name={user?.role === 'provider' ? 'graduation' : 'spark'} /></span></div>
    {error ? <div className="error-panel"><strong>Dashboard data is unavailable.</strong><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : <>
      <div className="stats-grid">{(user?.role === 'student' ? [['jobs', 'Open jobs', 'briefcase'], ['trainings', 'Training programs', 'graduation'], ['applications', 'My applications', 'arrow'], ['unread', 'New updates', 'bell']] : user?.role === 'admin' ? [['users', 'Accounts', 'spark'], ['jobs', 'Job posts', 'briefcase'], ['trainings', 'Programs', 'graduation'], ['pending', 'Needs review', 'bell']] : [['listings', user?.role === 'provider' ? 'Programs' : 'Job posts', user?.role === 'provider' ? 'graduation' : 'briefcase'], ['applications', 'Applications', 'arrow'], ['pending', 'Pending review', 'bell'], ['published', 'Published', 'check']]).map(([key, label, icon]) => <article className="stat-card" key={key}><span className="stat-icon"><Icon name={icon} /></span><span className="stat-value">{loading && !data ? '—' : Number(stats[key] || 0)}</span><span className="stat-label">{label}</span></article>)}</div>
      <div className="dashboard-grid"><section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">{user?.role === 'student' ? 'RECENTLY ADDED' : 'LATEST ACTIVITY'}</span><h2>{user?.role === 'student' ? 'New opportunities' : 'Recent listings'}</h2></div><Link to={user?.role === 'student' ? '/jobs' : user?.role === 'admin' ? '/review' : '/manage'} onNavigate={onNavigate} className="text-link">View all <Icon name="arrow" /></Link></div>
        {listingItems.length ? listingItems.slice(0, 4).map((item) => <div className="compact-listing" key={`${item.kind}-${item.id}`}><span className="compact-icon"><Icon name={item.kind === 'training' ? 'graduation' : 'briefcase'} /></span><div><strong>{item.title}</strong><small>{item.organization} · {item.location}</small></div><span className="badge badge-open">{item.kind}</span></div>) : <EmptyState title="Nothing to show yet">New listings and activity will appear here.</EmptyState>}
      </section><section className="dashboard-panel quick-panel"><span className="eyebrow">QUICK ACTIONS</span><h2>Keep moving forward.</h2>{user?.role === 'student' ? <><Link to="/jobs" onNavigate={onNavigate} className="quick-link"><span><Icon name="briefcase" /></span><div><strong>Explore job openings</strong><small>Find a role that fits your skills</small></div><Icon name="arrow" /></Link><Link to="/training" onNavigate={onNavigate} className="quick-link"><span><Icon name="graduation" /></span><div><strong>Find training</strong><small>Build in-demand skills</small></div><Icon name="arrow" /></Link><Link to="/skills" onNavigate={onNavigate} className="quick-link"><span><Icon name="spark" /></span><div><strong>Analyze your skills</strong><small>Get personalized job and training recommendations</small></div><Icon name="arrow" /></Link><Link to="/notifications" onNavigate={onNavigate} className="quick-link"><span><Icon name="bell" /></span><div><strong>Notification settings</strong><small>Choose how to stay updated</small></div><Icon name="arrow" /></Link></> : <Link to={user?.role === 'admin' ? '/review' : '/manage'} onNavigate={onNavigate} className="button button-primary">{user?.role === 'admin' ? 'Review new listings' : 'Create a listing'} <Icon name="arrow" /></Link>}</section></div>
      {user && renderRoleAnalytics(user.role, analytics)}
    </>}
  </section>;
}
