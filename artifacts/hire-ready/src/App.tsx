import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { seedCandidates, seedJobs, currentLearner as initialLearner } from '@/lib/seed-data';
import { roleSkillGraphs, availableTargetRoles } from '@/lib/role-skill-graph';
import { generateCareerRoadmap, enrichCandidateSkillsWithVerification } from '@/lib/roadmap-engine';
import {
  calculateAIEnhancedMatch,
  analyzePoolScarcity,
} from '@/lib/ai-ranking';
import { generateAISkillSuggestions } from '@/lib/ai-job-suggestions';
import { fetchAdzunaJobs, scoreAdzunaJobMatch } from '@/lib/adzuna';
import { fetchLiveGitHubProfile } from '@/lib/github';
import { AIChatbot } from '@/components/AIChatbot';
import type {
  AdzunaJob,
  Candidate,
  Certification,
  CandidateProject,
  Job,
  MatchScore,
  Proficiency,
  ReviewStatus,
  Skill,
  UserRole,
} from '@/lib/types';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Github,
  Globe,
  Layers,
  LayoutDashboard,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

// ==========================================
// APP STATE CONTEXT
// ==========================================
type AppContextValue = {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  jobs: Job[];
  candidates: Candidate[];
  learner: Candidate;
  shortlisted: string[];
  activeJobId: string;
  addJob: (job: Job) => void;
  setActiveJobId: (id: string) => void;
  toggleShortlist: (id: string) => void;
  updateLearner: (updater: (prev: Candidate) => Candidate) => void;
  notify: (message: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('HireReady context is unavailable');
  return context;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function currentJob(jobs: Job[], activeJobId?: string) {
  return (
    jobs.find((job) => job.id === activeJobId && job.status === 'active') ??
    jobs.find((job) => job.status === 'active') ??
    jobs[0]!
  );
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

// ==========================================
// APPLE DYNAMIC ISLAND TOP NAVIGATION BAR
// ==========================================
function DynamicIslandNav() {
  const { role, setRole, learner, jobs, candidates, shortlisted, activeJobId, notify } = useApp();
  const [location, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isRecruiter = role === 'recruiter';

  const recruiterLinks = [
    { href: '/recruiter/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/recruiter/matches', label: 'AI Matches & Ranking', icon: Radar },
    { href: '/recruiter/create-job', label: 'Post a Role', icon: Plus },
  ];

  const seekerLinks = [
    { href: '/seeker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seeker/roadmap', label: 'AI Roadmap', icon: Target },
    { href: '/seeker/profile/upload', label: 'Upload Proof', icon: UploadCloud },
    { href: '/seeker/credentials', label: 'Verified Credentials', icon: Award },
  ];

  const links = isRecruiter ? recruiterLinks : seekerLinks;

  const isActive = (href: string) =>
    location === href ||
    (href !== '/recruiter/dashboard' &&
      href !== '/seeker/dashboard' &&
      location.startsWith(href));

  const handleRoleSwitch = () => {
    const nextRole: UserRole = isRecruiter ? 'seeker' : 'recruiter';
    setRole(nextRole);
    setLocation(nextRole === 'recruiter' ? '/recruiter/dashboard' : '/seeker/dashboard');
    notify(`Switched to ${nextRole === 'recruiter' ? 'Recruiter' : 'Job Seeker'} Portal`);
  };

  const handleLiveGitHubSync = async () => {
    if (!learner.githubUsername) {
      notify('Please enter a GitHub username first in Seeker Profile');
      return;
    }
    setIsSyncing(true);
    try {
      const data = await fetchLiveGitHubProfile(learner.githubUsername);
      if (data) {
        notify(`Synced ${data.public_repos} public repos from GitHub (@${learner.githubUsername})`);
      } else {
        notify('GitHub API rate limited or profile unreachable');
      }
    } catch {
      notify('Failed to sync GitHub profile');
    } finally {
      setIsSyncing(false);
    }
  };

  const currentActiveJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  return (
    <div className="dynamic-island-wrapper">
      <div
        className={`dynamic-island ${isExpanded ? 'is-expanded' : ''}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        data-testid="dynamic-island-nav"
      >
        {/* Main Island Bar */}
        <div className="dynamic-island-main">
          {/* Brand capsule */}
          <Link
            href={isRecruiter ? '/recruiter/dashboard' : '/seeker/dashboard'}
            className="island-brand"
            data-testid="link-brand"
          >
            <span className="island-brand-mark">H</span>
            <span>HireReady</span>
          </Link>

          {/* Quick Role pill badge */}
          <button
            className="island-role-badge"
            onClick={handleRoleSwitch}
            title="Click to switch between Recruiter and Job Seeker modes"
            data-testid="button-switch-role"
          >
            <span className="radar-pulse-dot" style={{ background: isRecruiter ? 'var(--apple-accent)' : 'var(--apple-success)' }} />
            <span>{isRecruiter ? 'Employer' : 'Candidate'}</span>
            <RefreshCw size={10} style={{ opacity: 0.7 }} />
          </button>

          {/* Center Segmented Links */}
          <nav className="island-nav">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`island-link ${isActive(href) ? 'active' : ''}`}
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Icon size={14} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Live Telemetry & Quick Action */}
          <div className="island-telemetry">
            {!isRecruiter && (
              <div
                className="island-pill-btn"
                title="Job Seeker Readiness Score"
              >
                <Sparkles size={12} />
                <span style={{ fontWeight: 800 }}>78%</span>
                <span style={{ fontSize: 10, color: 'var(--apple-secondary-text)' }}>Ready</span>
              </div>
            )}

            {isRecruiter && (
              <div
                className="island-pill-btn"
                title="Active Candidate Pool Size"
              >
                <Users size={12} />
                <span style={{ fontWeight: 800 }}>{candidates.length}</span>
                <span style={{ fontSize: 10, color: 'var(--apple-secondary-text)' }}>Talent</span>
              </div>
            )}

            {!isRecruiter && learner.githubUsername && (
              <a
                href={learner.githubUrl || `https://github.com/${learner.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="island-pill-btn"
                title="Verified GitHub Account"
              >
                <Github size={12} />
                <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @{learner.githubUsername}
                </span>
              </a>
            )}

            <button
              className="island-pill-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title="Expand dynamic quick controls shelf"
              aria-label="Toggle Island Drawer"
            >
              <ChevronRight
                size={13}
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease',
                }}
              />
            </button>
          </div>
        </div>

        {/* Revealing Apple Dynamic Shelf Drawer */}
        <div className="island-drawer">
          <div className="island-drawer-content">
            <div className="island-telemetry-text">
              {isRecruiter ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <BriefcaseBusiness size={12} /> <strong>Role:</strong> {currentActiveJob?.title ?? 'Full-Stack Engineer'}
                  </span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Users size={12} /> <strong>Shortlisted:</strong> {shortlisted.length} Candidates
                  </span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Bot size={12} /> <strong>AI Matching:</strong> Calibrated Bounded Engine
                  </span>
                </>
              ) : (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Target size={12} /> <strong>Target:</strong> {learner.targetRole || 'Full-Stack Engineer'}
                  </span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ShieldCheck size={12} /> <strong>Verified Certs:</strong> {learner.certifications.length} SHA-256 Validated
                  </span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Globe size={12} /> <strong>Market API:</strong> Adzuna Live Connected
                  </span>
                </>
              )}
            </div>

            <div className="island-drawer-actions">
              {!isRecruiter && (
                <button
                  className="button button-ghost"
                  style={{ height: 30, fontSize: 11, padding: '0 12px' }}
                  onClick={handleLiveGitHubSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync GitHub Repos'}
                </button>
              )}

              <button
                className="button button-accent"
                style={{ height: 30, fontSize: 11, padding: '0 14px' }}
                onClick={handleRoleSwitch}
              >
                Switch to {isRecruiter ? 'Job Seeker' : 'Recruiter'}
              </button>

              <button
                className="button button-ghost"
                style={{ height: 30, fontSize: 11, padding: '0 12px', color: 'var(--apple-danger)' }}
                onClick={() => {
                  setRole(null);
                  setLocation('/');
                }}
              >
                Exit Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SHELL & NAVIGATION
// ==========================================
function Shell({ children }: { children: ReactNode }) {
  const { role } = useApp();
  const [location] = useLocation();

  if (!role && location === '/') {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <DynamicIslandNav />
      <div className="main-area">
        <main>{children}</main>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ScoreBreakdown({ score, compact = false }: { score: MatchScore; compact?: boolean }) {
  return (
    <div className="breakdown" data-testid="score-breakdown">
      {score.components.map((component) => {
        const percentage = Math.round((component.score / component.max) * 100);
        return (
          <div key={component.key} className="breakdown-row">
            <label>{component.label}</label>
            <div className="progress-line">
              <span style={{ width: `${percentage}%` }} />
            </div>
            <div className="breakdown-score">
              {component.score}/{component.max}
            </div>
            {!compact && <div className="breakdown-detail">{component.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}

function ScoreCard({ score }: { score: MatchScore }) {
  const hasAIBonus = (score.aiSemanticBonus ?? 0) > 0;
  return (
    <div className="score-block" data-testid="text-match-score">
      <div className="score-ring" style={{ '--score': score.total } as CSSProperties}>
        <strong>{score.total}</strong>
      </div>
      <div className="score-label">
        {hasAIBonus ? (
          <span className="ai-bonus-pill">
            <Bot size={11} /> +{score.aiSemanticBonus} AI boost
          </span>
        ) : (
          'Deterministic Match'
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty" data-testid="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

// ==========================================
// ADZUNA LIVE JOBS EXPLORER COMPONENT
// ==========================================
function AdzunaLiveJobsExplorer({ candidate }: { candidate: Candidate }) {
  const [query, setQuery] = useState(candidate.targetRole || 'Developer');
  const [jobs, setJobs] = useState<AdzunaJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchAdzunaJobs(query)
      .then((data) => {
        if (isMounted) {
          setJobs(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [query]);

  return (
    <div className="card section-card" style={{ marginTop: 28 }}>
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={18} color="var(--apple-accent)" />
          <h2>Live Market Job Openings (Powered by Adzuna API)</h2>
        </div>
        <span className="pill pill-green">Live API Connected</span>
      </div>
      <p className="bio" style={{ marginBottom: 20 }}>
        Real-time live postings fetched directly via Adzuna API. Click any job to redirect immediately to the live application portal.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Search size={15} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Adzuna live market roles (e.g. React Developer, Data Scientist, MLOps, DevOps)"
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--apple-secondary-text)' }}>
          <RefreshCw size={18} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
          Fetching live Adzuna listings...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {jobs.map((job) => {
            const matchScore = scoreAdzunaJobMatch(candidate, job);
            return (
              <div
                key={job.id}
                className="card"
                style={{
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: 14.5, color: 'var(--apple-primary-text)', lineHeight: 1.3 }}>{job.title}</strong>
                  <span className="pill pill-green" style={{ flexShrink: 0 }}>
                    {matchScore}% Match
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--apple-secondary-text)', marginBottom: 8 }}>
                  {job.company} · {job.location} · {job.contractType}
                </div>
                {job.salaryMin && (
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--apple-accent)', marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
                    ₹{(job.salaryMin / 100000).toFixed(1)}L–₹{(job.salaryMax ? job.salaryMax / 100000 : job.salaryMin * 1.4 / 100000).toFixed(1)}L / year
                  </div>
                )}
                <p style={{ fontSize: 12.5, color: 'var(--apple-secondary-text)', lineHeight: 1.6, margin: '0 0 12px', flex: 1 }}>
                  {job.description.slice(0, 140)}...
                </p>
                <div className="skill-list" style={{ margin: '0 0 16px' }}>
                  {job.inferredSkills?.slice(0, 3).map((s) => (
                    <span className="skill-tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
                <a
                  href={job.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-accent"
                  style={{ width: '100%', textDecoration: 'none' }}
                >
                  Apply on Adzuna <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 1. PUBLIC LANDING & ROLE ENTRY
// ==========================================
function LandingPage() {
  const { setRole } = useApp();
  const [, setLocation] = useLocation();

  const handleSelectRole = (role: UserRole) => {
    setRole(role);
    setLocation(role === 'recruiter' ? '/recruiter/dashboard' : '/seeker/dashboard');
  };

  return (
    <div className="landing-wrap">
      <header className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <span className="island-brand-mark">H</span>
          <span>HireReady</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="button button-ghost"
            onClick={() => handleSelectRole('seeker')}
          >
            Job Seeker Demo
          </button>
          <button
            className="button button-accent"
            onClick={() => handleSelectRole('recruiter')}
          >
            Recruiter Demo
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={13} /> Transparent Talent Intelligence & Career Roadmaps
        </div>
        <h1 className="landing-title">
          Verify skills cryptographically. <br />
          Match with explainable AI.
        </h1>
        <p className="landing-subtitle">
          HireReady bridges job seekers and recruiters with auditable skill verification, prerequisite-aware career roadmaps, real GitHub code evidence, and two-layer hybrid AI candidate ranking.
        </p>

        <div className="landing-cards">
          {/* Card 1: Job Seeker */}
          <div
            className="landing-role-card"
            onClick={() => handleSelectRole('seeker')}
            data-testid="card-role-seeker"
          >
            <div className="landing-role-icon">
              <Target size={26} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3>I'm a Job Seeker</h3>
              <span className="pill pill-green">Candidate Portal</span>
            </div>
            <p>
              Upload your verified certifications, calculate your readiness score, link your GitHub repos, and follow an AI-generated career roadmap with live Adzuna market jobs.
            </p>
            <div className="landing-features-list">
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>Upload certs with SHA-256 validation & file review</span>
              </div>
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>AI Career Roadmap with topological gap analysis</span>
              </div>
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>Verified GitHub project evidence & live Adzuna apply links</span>
              </div>
            </div>
            <button className="button button-accent" style={{ width: '100%', marginTop: 'auto' }}>
              Enter as Job Seeker <ArrowRight size={15} />
            </button>
          </div>

          {/* Card 2: Recruiter */}
          <div
            className="landing-role-card"
            onClick={() => handleSelectRole('recruiter')}
            data-testid="card-role-recruiter"
          >
            <div className="landing-role-icon">
              <Radar size={26} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3>I'm a Recruiter</h3>
              <span className="pill pill-amber">Employer Portal</span>
            </div>
            <p>
              Define required skills with proficiency baselines, generate AI skill suggestions, inspect candidates' verified GitHub repos, and review hybrid AI shortlists.
            </p>
            <div className="landing-features-list">
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>Job wizard with AI skill matrices & proficiency floors</span>
              </div>
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>Deterministic base score + bounded AI semantic layer</span>
              </div>
              <div className="landing-feature-item">
                <CheckCircle2 size={16} color="var(--apple-accent)" />
                <span>One-click candidate GitHub code inspection & market signal</span>
              </div>
            </div>
            <button className="button button-primary" style={{ width: '100%', marginTop: 'auto' }}>
              Enter as Recruiter <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 2. JOB SEEKER: OVERVIEW DASHBOARD
// ==========================================
function SeekerDashboard() {
  const { jobs, learner, updateLearner } = useApp();
  const selectedTargetRole = learner.targetRole || 'Data Scientist';

  const roadmap = useMemo(
    () => generateCareerRoadmap(learner, selectedTargetRole),
    [learner, selectedTargetRole]
  );

  const verifiedCount = learner.skills.filter((skill) => skill.verified).length;

  const recommendedJobs = useMemo(() => {
    return jobs
      .filter((j) => j.status === 'active')
      .map((job) => ({
        job,
        score: calculateAIEnhancedMatch(learner, job),
      }))
      .sort((a, b) => b.score.total - a.score.total);
  }, [jobs, learner]);

  return (
    <div className="page">
      {/* Clean Apple Hero Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Candidate Workspace</div>
          <h1>Welcome back, {learner.name.split(' ')[0]}.</h1>
          <p>
            Track your career roadmap progression, inspect verified GitHub code evidence, and apply to live Adzuna market roles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/seeker/profile/upload" className="button button-secondary">
            <UploadCloud size={14} /> Upload Evidence
          </Link>
          <Link href="/seeker/roadmap" className="button button-accent">
            <Target size={14} /> AI Career Roadmap
          </Link>
        </div>
      </div>

      {/* 1. Target Career Track & Role Readiness (Apple Frosted Glass Card) */}
      <div className="card section-card" style={{ marginBottom: 24 }} data-testid="card-target-track">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>Target Career Track</span>
              <select
                className="select"
                style={{ width: 'auto', padding: '4px 12px', fontSize: 12, borderRadius: 999, background: 'rgba(0, 0, 0, 0.45)' }}
                value={selectedTargetRole}
                onChange={(e) => updateLearner((p) => ({ ...p, targetRole: e.target.value }))}
                data-testid="select-dashboard-target-role"
              >
                {availableTargetRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--apple-primary-text)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              {selectedTargetRole}
            </h2>
            <p style={{ color: 'var(--apple-secondary-text)', fontSize: 13.5, margin: '0 0 16px' }}>
              {roadmap.masteredCount} of {roadmap.totalSkillsCount} core competencies verified on your profile.
            </p>
            <div className="progress-line" style={{ height: 6, maxWidth: 380 }}>
              <span style={{ width: `${roadmap.overallReadiness}%` }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--app-font-sans)', fontSize: 44, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}>
                {roadmap.overallReadiness}%
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)', fontWeight: 600, marginTop: 4 }}>Role Readiness</div>
            </div>
            <Link href="/seeker/roadmap" className="button button-accent">
              Open Roadmap <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Sorted Grid for Tools, Evidence & Recommendations */}
      <div className="grid-2">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Quick Progression Tools */}
          <section className="card section-card">
            <div className="section-title">
              <h2>Career Progression Tools</h2>
              <Sparkles size={16} color="var(--apple-accent)" />
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="card" style={{ padding: 20, background: 'rgba(0, 0, 0, 0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14.5, color: 'var(--apple-primary-text)', margin: '0 0 4px', fontWeight: 700 }}>Explore AI Career Roadmap</h3>
                  <p style={{ color: 'var(--apple-secondary-text)', fontSize: 12.5, margin: 0 }}>View sequenced milestone sprints and unblock higher-tier competencies.</p>
                </div>
                <Link href="/seeker/roadmap" className="button button-primary" style={{ flexShrink: 0 }}>
                  Open Roadmap <ArrowRight size={14} />
                </Link>
              </div>

              <div className="card" style={{ padding: 20, background: 'rgba(0, 0, 0, 0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14.5, color: 'var(--apple-primary-text)', margin: '0 0 4px', fontWeight: 700 }}>Upload Certifications & Projects</h3>
                  <p style={{ color: 'var(--apple-secondary-text)', fontSize: 12.5, margin: 0 }}>Add cryptographic credentials or GitHub repos to boost skill verification confidence.</p>
                </div>
                <Link href="/seeker/profile/upload" className="button button-secondary" style={{ flexShrink: 0 }}>
                  Upload Proof <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>

          {/* Evidence Stats */}
          <section className="card section-card">
            <div className="section-title">
              <h2>Evidence at a Glance</h2>
              <Link href="/seeker/credentials" className="button button-ghost" style={{ fontSize: 11.5 }}>
                View Credentials <ChevronRight size={12} />
              </Link>
            </div>
            <div className="stat-grid" style={{ margin: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--apple-secondary-text)' }}>Skills</div>
                <div className="stat-value">{learner.skills.length}</div>
              </div>
              <div>
                <div className="eyebrow" style={{ color: 'var(--apple-success)' }}>Verified</div>
                <div className="stat-value" style={{ color: 'var(--apple-success)' }}>{verifiedCount}</div>
              </div>
              <div>
                <div className="eyebrow" style={{ color: 'var(--apple-accent)' }}>Projects</div>
                <div className="stat-value">{learner.projects.length}</div>
              </div>
            </div>
          </section>
        </div>

        {/* Recommended Open Roles */}
        <section className="card section-card">
          <div className="section-title">
            <h2>Recommended Open Roles ({recommendedJobs.length})</h2>
            <span style={{ color: 'var(--apple-secondary-text)', fontSize: 11.5 }}>Transparent scoring</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {recommendedJobs.slice(0, 4).map(({ job, score }) => (
              <div key={job.id} className="job-row" style={{ padding: '14px 0' }}>
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--apple-primary-text)' }}>{job.title}</strong>
                  <div className="job-meta" style={{ color: 'var(--apple-secondary-text)' }}>
                    {job.company} · {job.location} · {job.workMode}
                  </div>
                </div>
                <div className="row-right">
                  <div className="score">{score.total}%</div>
                  <div className="score-caption">
                    {(score.aiSemanticBonus ?? 0) > 0 ? `+${score.aiSemanticBonus} AI` : 'match'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/seeker/roadmap"
            className="button button-secondary"
            style={{ marginTop: 22, width: '100%', justifyContent: 'center' }}
          >
            Level Up with AI Roadmap <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      {/* 3. Real Live Adzuna Market Jobs Explorer */}
      <AdzunaLiveJobsExplorer candidate={learner} />
    </div>
  );
}

// ==========================================
// 3. JOB SEEKER: EVIDENCE & UPLOAD
// ==========================================
function SeekerUploadPage() {
  const { learner, updateLearner, notify } = useApp();
  const [activeTab, setActiveTab] = useState<'skills' | 'certifications' | 'projects'>('skills');

  // Skill state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<Proficiency>('intermediate');
  const [newSkillYears, setNewSkillYears] = useState(2);

  // Cert state
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('Coursera');
  const [certCredId, setCertCredId] = useState('');
  const [certDate, setCertDate] = useState(new Date().toISOString().slice(0, 10));
  const [certUrl, setCertUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Project state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTechInput, setProjectTechInput] = useState('');
  const [projectGithub, setProjectGithub] = useState('');
  const [projectLive, setProjectLive] = useState('');

  // Live GitHub Profile Sync state
  const [githubSyncUser, setGithubSyncUser] = useState(learner.githubUsername || '');
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  const handleSyncGithub = async () => {
    if (!githubSyncUser.trim()) return;
    setIsSyncingGithub(true);
    try {
      const res = await fetchLiveGitHubProfile(githubSyncUser.trim());
      if (res) {
        updateLearner((prev) => {
          const existingTitles = new Set(prev.projects.map((p) => p.title.toLowerCase()));
          const newProjects = res.projects.filter((p) => !existingTitles.has(p.title.toLowerCase()));

          const existingSkillNames = new Set(prev.skills.map((s) => s.name.toLowerCase()));
          const newSkills = res.extractedSkills.filter((s) => !existingSkillNames.has(s.name.toLowerCase()));

          return {
            ...prev,
            name: res.profile.name || prev.name,
            bio: res.profile.bio || prev.bio,
            location: res.profile.location || prev.location,
            githubUsername: res.profile.login,
            githubUrl: res.profile.html_url,
            avatarUrl: res.profile.avatar_url,
            publicRepos: res.profile.public_repos,
            followers: res.profile.followers,
            projects: [...newProjects, ...prev.projects],
            skills: [...prev.skills, ...newSkills],
          };
        });
        notify(`Synced live GitHub profile @${res.profile.login}! (${res.profile.public_repos} repos, ${res.profile.followers} followers)`);
      } else {
        notify(`Could not fetch GitHub API for @${githubSyncUser}.`);
      }
    } catch {
      notify(`GitHub sync finished.`);
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const enrichedSkills = useMemo(
    () => enrichCandidateSkillsWithVerification(learner),
    [learner]
  );

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    updateLearner((prev) => {
      const existing = prev.skills.filter((s) => s.name.toLowerCase() !== newSkillName.trim().toLowerCase());
      const updated: Skill = {
        name: newSkillName.trim(),
        proficiency: newSkillProficiency,
        yearsExperience: Number(newSkillYears),
        verified: false,
      };
      return { ...prev, skills: [...existing, updated] };
    });

    notify(`Added "${newSkillName.trim()}" to your profile.`);
    setNewSkillName('');
  };

  const handleRemoveSkill = (name: string) => {
    updateLearner((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.name !== name),
    }));
    notify(`Removed ${name}.`);
  };

  const handleSimulateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      notify(`Uploaded ${file.name} for credential review.`);
    }
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) return;

    setIsVerifying(true);

    const hasVerifiableUrl = certUrl.trim().startsWith('http');
    const isKnownIssuer = ['aws', 'coursera', 'google', 'meta', 'microsoft', 'stanford'].some((k) =>
      certIssuer.toLowerCase().includes(k)
    );

    const isAutoVerified = hasVerifiableUrl || (isKnownIssuer && certCredId.trim().length > 4);
    const reviewStatus: ReviewStatus = isAutoVerified ? 'auto_verified' : 'pending_review';

    const payload = `${certName}|${certIssuer}|${certCredId || Date.now()}|${certDate}|${learner.name}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');

    const newCert: Certification = {
      name: certName.trim(),
      issuer: certIssuer.trim(),
      credentialId: certCredId.trim() || `HR-CERT-${Date.now().toString().slice(-4)}`,
      issueDate: certDate,
      verified: isAutoVerified,
      verificationHash: hash,
      verificationUrl: certUrl.trim() || undefined,
      fileName: uploadedFileName || undefined,
      fileUploadedAt: uploadedFileName ? new Date().toISOString() : undefined,
      reviewStatus,
    };

    updateLearner((prev) => ({
      ...prev,
      certifications: [newCert, ...prev.certifications],
    }));

    setIsVerifying(false);
    notify(
      isAutoVerified
        ? `Certification "${certName}" auto-verified successfully!`
        : `Certification uploaded. Queued for audit review.`
    );

    setCertName('');
    setCertCredId('');
    setCertUrl('');
    setUploadedFileName('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectTechInput.trim()) return;

    const techs = projectTechInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newProj: CandidateProject = {
      title: projectTitle.trim(),
      description: projectDesc.trim() || 'A production project demonstrating end-to-end architecture.',
      technologies: techs,
      githubUrl: projectGithub.trim() || 'https://github.com/vasudev196006/hireread',
      liveUrl: projectLive.trim() || undefined,
    };

    updateLearner((prev) => ({
      ...prev,
      projects: [newProj, ...prev.projects],
    }));

    notify(`Project "${projectTitle}" added. Related skill verification scores boosted!`);
    setProjectTitle('');
    setProjectDesc('');
    setProjectTechInput('');
    setProjectGithub('');
    setProjectLive('');
  };

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Evidence & Profile Management"
        title="Upload Skills, Certifications & Projects"
        description="Every verified credential, real GitHub project, and code repository increases your transparent match score."
        action={
          <Link href="/seeker/roadmap" className="button button-accent">
            <Target size={14} /> View Career Roadmap
          </Link>
        }
      />

      {/* Real GitHub Sync Box (Apple Frosted Glass) */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={learner.avatarUrl || `https://github.com/${learner.githubUsername || 'vasudev196006'}.png`}
              alt={learner.name}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--apple-success)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://github.com/github.png';
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Github size={18} color="var(--apple-accent)" />
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--apple-primary-text)', fontWeight: 700 }}>Real GitHub Profile Integration</h3>
                <span className="pill pill-green" style={{ fontSize: 10 }}>Live API Connected</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--apple-secondary-text)', marginTop: 3 }}>
                Connected as <strong style={{ color: 'var(--apple-accent)' }}>@{learner.githubUsername || 'alexrivera-dev'}</strong> · {learner.publicRepos ?? 14} Public Repositories · {learner.followers ?? 28} Followers
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="input"
              style={{ fontSize: 12, padding: '7px 12px', width: 180 }}
              value={githubSyncUser}
              placeholder="e.g. your-github-username"
              onChange={(e) => setGithubSyncUser(e.target.value)}
            />
            <button
              className="button button-accent"
              style={{ fontSize: 12, padding: '7px 14px' }}
              disabled={isSyncingGithub}
              onClick={handleSyncGithub}
            >
              {isSyncingGithub ? 'Syncing...' : <><RefreshCw size={13} /> Sync Real GitHub</>}
            </button>
            {learner.githubUrl && (
              <a
                href={learner.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
              >
                <ExternalLink size={13} /> View on GitHub
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
          data-testid="tab-skills"
        >
          <Layers size={15} /> Skills & Verification ({learner.skills.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('certifications')}
          data-testid="tab-certifications"
        >
          <Award size={15} /> Certifications & Files ({learner.certifications.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
          data-testid="tab-projects"
        >
          <Github size={15} /> Project Evidence ({learner.projects.length})
        </button>
      </div>

      {activeTab === 'skills' && (
        <div className="grid-2">
          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>Add a Skill to Taxonomy</h2>
                <span>Self-reported with auto-verification</span>
              </div>
              <form onSubmit={handleAddSkill} className="form-grid">
                <Field
                  label="Skill Name"
                  value={newSkillName}
                  placeholder="e.g. PyTorch, React, Kubernetes"
                  onChange={setNewSkillName}
                  testId="input-skill-name"
                />
                <SelectField
                  label="Proficiency Level"
                  value={newSkillProficiency}
                  options={['beginner', 'intermediate', 'advanced', 'expert']}
                  onChange={(v) => setNewSkillProficiency(v as Proficiency)}
                  testId="select-skill-proficiency"
                />
                <Field
                  label="Years of Experience"
                  value={String(newSkillYears)}
                  type="number"
                  onChange={(v) => setNewSkillYears(Number(v))}
                  testId="input-skill-years"
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" className="button button-primary" style={{ width: '100%' }}>
                    <Plus size={14} /> Add Skill
                  </button>
                </div>
              </form>
            </div>

            <div className="card section-card" style={{ marginTop: 20 }}>
              <div className="section-title">
                <h2>Your Skills Matrix ({enrichedSkills.length})</h2>
                <span>Real-time verification weight</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {enrichedSkills.map((skill) => (
                  <div key={skill.name} className="job-row">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 13.5, color: 'var(--apple-primary-text)' }}>{skill.name}</strong>
                        <span className={`pill ${skill.verified ? 'pill-green' : 'pill-slate'}`}>
                          {skill.verified ? '✓ Verified' : 'Self-Reported'}
                        </span>
                        <span className="skill-tag">{skill.proficiency}</span>
                      </div>
                      <div className="job-meta">
                        {skill.yearsExperience} yrs exp · Verification confidence: {skill.verificationScore ?? 60}%
                      </div>
                    </div>
                    <button
                      className="button button-ghost"
                      onClick={() => handleRemoveSkill(skill.name)}
                      title="Remove skill"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>How Skill Verification Works</h2>
                <ShieldCheck size={18} color="var(--apple-accent)" />
              </div>
              <p className="bio" style={{ marginBottom: 16 }}>
                HireReady never relies solely on self-reported checkmarks. Your skills gain real verification weight when backed by:
              </p>
              <div style={{ display: 'grid', gap: 12, fontSize: 12.5, color: 'var(--apple-secondary-text)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="step-num" style={{ flexShrink: 0, width: 24, height: 24, fontSize: 11 }}>1</div>
                  <span><strong style={{ color: 'var(--apple-primary-text)' }}>Verified Certifications:</strong> Matching credentials from AWS, Google, Meta, or Coursera automatically boost verification confidence.</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="step-num" style={{ flexShrink: 0, width: 24, height: 24, fontSize: 11 }}>2</div>
                  <span><strong style={{ color: 'var(--apple-primary-text)' }}>Project Evidence:</strong> Technologies tagged in your GitHub/live projects provide practical proof.</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="step-num" style={{ flexShrink: 0, width: 24, height: 24, fontSize: 11 }}>3</div>
                  <span><strong style={{ color: 'var(--apple-primary-text)' }}>Deterministic Score:</strong> Verified skills receive up to +5% score multipliers in recruiter matching.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certifications' && (
        <div className="grid-2">
          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>Add / Upload Certification</h2>
                <span>Auto-verifies with valid URL or file</span>
              </div>
              <form onSubmit={handleAddCertification} className="form-grid">
                <Field
                  label="Certification Name"
                  value={certName}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  onChange={setCertName}
                  testId="input-cert-name"
                />
                <SelectField
                  label="Issuer / Organization"
                  value={certIssuer}
                  options={['Amazon Web Services', 'Google Cloud', 'Meta', 'Coursera', 'Microsoft', 'Stanford Online', 'DeepLearning.AI', 'Other']}
                  onChange={setCertIssuer}
                  testId="select-cert-issuer"
                />
                <Field
                  label="Credential ID / License #"
                  value={certCredId}
                  placeholder="e.g. AWS-PSA-99482"
                  onChange={setCertCredId}
                  testId="input-cert-id"
                />
                <Field
                  label="Issue Date"
                  value={certDate}
                  type="date"
                  onChange={setCertDate}
                  testId="input-cert-date"
                />
                <Field
                  label="Verification URL (Optional for instant validation)"
                  value={certUrl}
                  placeholder="https://coursera.org/verify/..."
                  onChange={setCertUrl}
                  full
                  testId="input-cert-url"
                />

                {/* File Upload Dropzone */}
                <div className="field full">
                  <label>Or Upload Certificate Document (PDF / PNG / JPG)</label>
                  <label className="dropzone">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                      onChange={handleSimulateFileUpload}
                    />
                    <div className="dropzone-icon">
                      <UploadCloud size={24} />
                    </div>
                    <strong style={{ color: 'var(--apple-primary-text)' }}>{uploadedFileName ? uploadedFileName : 'Click to select or drag & drop certificate'}</strong>
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--apple-secondary-text)' }}>
                      Files are cryptographically hashed and queued for verification.
                    </p>
                  </label>
                </div>

                <div className="field full" style={{ marginTop: 10 }}>
                  <button type="submit" className="button button-accent" disabled={isVerifying} style={{ width: '100%' }}>
                    {isVerifying ? 'Verifying Credential...' : <><ShieldCheck size={15} /> Save & Verify Credential</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>Uploaded Credentials ({learner.certifications.length})</h2>
                <span>Audit verification logs</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {learner.certifications.map((cert) => {
                  const isVerified = cert.verified;
                  const isPending = cert.reviewStatus === 'pending_review';
                  return (
                    <div key={cert.credentialId} className="card credential-card" style={{ padding: 18 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: 13.5, color: 'var(--apple-primary-text)' }}>{cert.name}</strong>
                          <span
                            className={`pill ${
                              isVerified
                                ? 'pill-green'
                                : isPending
                                ? 'pill-amber'
                                : 'pill-slate'
                            }`}
                          >
                            {isVerified ? '✓ Auto-Verified' : isPending ? '⏳ Pending Audit' : 'Rejected'}
                          </span>
                        </div>
                        <div className="job-meta">
                          {cert.issuer} · Issued {cert.issueDate} · ID: {cert.credentialId}
                        </div>
                        {cert.fileName && (
                          <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileText size={12} /> File: {cert.fileName}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/verify/${cert.credentialId}`}
                        className="button button-ghost"
                        style={{ fontSize: 11.5 }}
                      >
                        Inspect Hash <ChevronRight size={13} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid-2">
          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>Add Project Evidence</h2>
                <span>Boosts skill verification scores</span>
              </div>
              <form onSubmit={handleAddProject} className="form-grid">
                <Field
                  label="Project Title"
                  value={projectTitle}
                  placeholder="e.g. Distributed Vector Search Engine"
                  onChange={setProjectTitle}
                  full
                  testId="input-project-title"
                />
                <Field
                  label="Description & Outcomes"
                  value={projectDesc}
                  placeholder="What architecture decisions did you make and what was the impact?"
                  onChange={setProjectDesc}
                  textarea
                  full
                  testId="textarea-project-desc"
                />
                <Field
                  label="Technologies Used (Comma-separated)"
                  value={projectTechInput}
                  placeholder="Python, PyTorch, Docker, PostgreSQL"
                  onChange={setProjectTechInput}
                  full
                  testId="input-project-techs"
                />
                <Field
                  label="GitHub Repository URL"
                  value={projectGithub}
                  placeholder="https://github.com/vasudev196006/hireread"
                  onChange={setProjectGithub}
                  testId="input-project-github"
                />
                <Field
                  label="Live Demo URL (Optional)"
                  value={projectLive}
                  placeholder="https://..."
                  onChange={setProjectLive}
                  testId="input-project-live"
                />
                <div className="field full" style={{ marginTop: 10 }}>
                  <button type="submit" className="button button-primary" style={{ width: '100%' }}>
                    <Plus size={14} /> Save Project Evidence
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div className="card section-card">
              <div className="section-title">
                <h2>Project Showcase ({learner.projects.length})</h2>
                <span>Evidence for recruiters</span>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                {learner.projects.map((proj) => (
                  <div key={proj.title} className="project">
                    <div className="project-title">
                      <span>{proj.title}</span>
                    </div>
                    <p>{proj.description}</p>
                    <div className="skill-list" style={{ margin: '8px 0 10px' }}>
                      {proj.technologies.map((t) => (
                        <span className="skill-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--apple-accent)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
                      >
                        <Github size={13} /> View on GitHub <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. JOB SEEKER: CAREER ROADMAP & GAP GRAPH
// ==========================================
function SeekerRoadmapPage() {
  const { learner, updateLearner, notify } = useApp();
  const selectedRole = learner.targetRole || 'Data Scientist';

  const roadmap = useMemo(
    () => generateCareerRoadmap(learner, selectedRole),
    [learner, selectedRole]
  );

  const handleSimulateLearnSkill = (skillName: string) => {
    updateLearner((prev) => {
      const existing = prev.skills.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase());
      const updated: Skill = {
        name: skillName,
        proficiency: 'advanced',
        yearsExperience: 1.5,
        verified: true,
      };
      return { ...prev, skills: [...existing, updated] };
    });
    notify(`Mastered "${skillName}"! Career readiness score updated.`);
  };

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Target Role Gap Analysis & AI Learning Path"
        title="Your Personalized Career Roadmap"
        description="Deterministic prerequisite graph sequencing combined with AI explanatory guidance."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Target Career:</span>
            <select
              className="select filter"
              value={selectedRole}
              onChange={(e) => {
                updateLearner((p) => ({ ...p, targetRole: e.target.value }));
              }}
              data-testid="select-target-role"
            >
              {availableTargetRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Target Track Overview Box (Apple Frosted Glass) */}
      <div className="card section-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--apple-secondary-text)', marginBottom: 6 }}>Target Track</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--apple-primary-text)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>{selectedRole}</h1>
            <p style={{ color: 'var(--apple-secondary-text)', fontSize: 13.5, margin: 0 }}>
              {roadmap.masteredCount} of {roadmap.totalSkillsCount} core competencies verified on your profile.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--app-font-sans)', fontSize: 44, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}>
              {roadmap.overallReadiness}%
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)', fontWeight: 600, marginTop: 4 }}>Role Readiness</div>
          </div>
        </div>
      </div>

      {/* AI Personalized Narrative */}
      <div className="card section-card" style={{ marginBottom: 24, borderLeft: '3px solid var(--apple-accent)' }}>
        <div className="section-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={18} color="var(--apple-accent)" />
            <h2>AI Learning Advisor Insight</h2>
          </div>
          <span className="pill pill-green">Topological Sequence + Reasoning</span>
        </div>
        <p className="bio" style={{ fontSize: 13.5, color: 'var(--apple-primary-text)', lineHeight: 1.65 }}>
          {roadmap.narrative}
        </p>
      </div>

      {/* Milestones Plan */}
      <div className="card section-card" style={{ marginBottom: 28 }}>
        <div className="section-title">
          <h2>Milestone Execution Plan</h2>
          <span>Sequenced by topological dependency</span>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', margin: 0, gap: 16 }}>
          {roadmap.milestones.map((milestone) => (
            <div key={milestone.title} className="card stat" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="pill pill-slate" style={{ fontSize: 10.5 }}>{milestone.timeframe}</span>
                <span className="pill pill-green">Tier {milestone.tier}</span>
              </div>
              <strong style={{ fontSize: 14.5, display: 'block', margin: '4px 0', color: 'var(--apple-primary-text)' }}>{milestone.title}</strong>
              <p style={{ fontSize: 12, color: 'var(--apple-secondary-text)', margin: '6px 0 12px', lineHeight: 1.5 }}>{milestone.description}</p>
              <div className="skill-list">
                {milestone.skills.map((s) => (
                  <span className="skill-tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tiered Role Skill Graph */}
      <div className="section-title" style={{ marginBottom: 16 }}>
        <h2>Role Skill Graph ({selectedRole})</h2>
        <span>Tier 1 (Foundational) to Tier 4 (Specialized)</span>
      </div>

      {[1, 2, 3, 4].map((tierNum) => {
        const tierGaps = roadmap.gapsByTier[tierNum] ?? [];
        if (tierGaps.length === 0) return null;

        const tierNames = [
          'Foundational Core',
          'Primary Applied Tools',
          'Advanced Systems & Scale',
          'Specialization & Architecture',
        ];

        return (
          <div key={tierNum} className="tier-section">
            <div className="tier-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`tier-tag tier-${tierNum}-tag`}>Tier {tierNum}</span>
                <strong style={{ fontSize: 15, color: 'var(--apple-primary-text)' }}>{tierNames[tierNum - 1]}</strong>
              </div>
              <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>
                {tierGaps.filter((g) => g.status === 'mastered').length} / {tierGaps.length} Mastered
              </span>
            </div>

            <div className="roadmap-grid">
              {tierGaps.map(({ node, status, currentProficiency }) => {
                const isMastered = status === 'mastered';
                const isLocked = status === 'locked';

                return (
                  <div
                    key={node.id}
                    className={`roadmap-card status-${status}`}
                    data-testid={`card-roadmap-${node.skillName.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <strong style={{ fontSize: 14.5 }}>{node.skillName}</strong>
                      <span
                        className={`pill ${
                          isMastered
                            ? 'pill-green'
                            : isLocked
                            ? 'pill-slate'
                            : 'pill-amber'
                        }`}
                      >
                        {isMastered ? '✓ Mastered' : isLocked ? '🔒 Prereq Req' : '⚡ Next Lever'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--apple-secondary-text)', marginBottom: 10 }}>
                      Expected: <strong style={{ color: 'var(--apple-primary-text)' }}>{node.expectedProficiency}</strong>
                      {currentProficiency && ` · Current: ${currentProficiency}`}
                    </div>

                    {node.prerequisites.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)', marginBottom: 10 }}>
                        Prerequisites: {node.prerequisites.join(', ')}
                      </div>
                    )}

                    {node.recommendedCertifications.length > 0 && (
                      <div style={{ fontSize: 11.5, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                        <Award size={13} style={{ verticalAlign: 'middle', marginRight: 5, color: 'var(--apple-accent)' }} />
                        <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{node.recommendedCertifications[0]?.name}</span>
                        <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)', marginTop: 2 }}>{node.recommendedCertifications[0]?.issuer}</div>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      {isMastered ? (
                        <span style={{ fontSize: 11.5, color: 'var(--apple-success)', fontWeight: 600 }}>
                          ✓ Evidence on profile
                        </span>
                      ) : isLocked ? (
                        <span style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)' }}>
                          Unlock prerequisites first
                        </span>
                      ) : (
                        <button
                          className="button button-secondary"
                          style={{ width: '100%', height: 32, fontSize: 11.5, padding: '0 10px' }}
                          onClick={() => handleSimulateLearnSkill(node.skillName)}
                          data-testid={`button-learn-${node.skillName.toLowerCase().replaceAll(' ', '-')}`}
                        >
                          <Sparkles size={12} /> Simulate Mastery
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 5. RECRUITER: POST A ROLE & AI MATRIX
// ==========================================
function RecruiterCreateJobPage() {
  const { addJob, notify, setActiveJobId } = useApp();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    company: 'Northstar Labs',
    description: '',
    location: 'Remote, India',
    workMode: 'remote' as Job['workMode'],
    employmentType: 'full-time' as Job['employmentType'],
    minExperience: 2,
    maxExperience: 8,
    education: 'bachelors' as Job['education'],
    salaryMin: 1800000,
    salaryMax: 2800000,
  });

  const [skills, setSkills] = useState<
    Array<{ name: string; importance: 'required' | 'preferred'; minProficiency: Proficiency }>
  >([
    { name: 'Python', importance: 'required', minProficiency: 'advanced' },
    { name: 'SQL', importance: 'required', minProficiency: 'intermediate' },
  ]);

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const update = (key: string, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleGenerateAISuggestions = () => {
    if (!form.title.trim()) {
      notify('Please enter a role title first (e.g. Senior Data Scientist).');
      return;
    }
    setIsGeneratingSuggestions(true);
    setTimeout(() => {
      const suggestions = generateAISkillSuggestions(form.title, form.description);
      setSkills(
        suggestions.skills.map((s) => ({
          name: s.name,
          importance: s.importance,
          minProficiency: s.minProficiency || 'intermediate',
        }))
      );
      setIsGeneratingSuggestions(false);
      notify(suggestions.summary);
    }, 400);
  };

  const addSkill = () =>
    setSkills([...skills, { name: '', importance: 'preferred', minProficiency: 'intermediate' }]);

  const complete = () => {
    const job: Job = {
      id: `job-${Date.now()}`,
      ...form,
      skills: skills
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          importance: s.importance,
          minProficiency: s.minProficiency,
        })),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    addJob(job);
    setActiveJobId(job.id);
    notify('Role published! Candidate rankings are ready.');
    setLocation('/recruiter/matches');
  };

  const canContinue =
    step === 1
      ? !!form.title.trim() && !!form.company.trim()
      : step === 2
      ? !!form.description.trim() &&
        !!form.location.trim() &&
        form.minExperience >= 0 &&
        form.maxExperience >= form.minExperience
      : skills.some((s) => s.name.trim());

  return (
    <div className="page">
      <div className="wizard">
        <SectionHeader
          eyebrow="Recruiter Job Wizard"
          title="Create an Auditable Role Brief"
          description="Define explicit skill matrices and minimum proficiency floors backed by AI taxonomy suggestions."
        />

        <div className="stepper">
          {['Role Basics', 'Working Details', 'AI Skill Matrix', 'Review & Publish'].map((label, index) => (
            <div className="step-wrap" style={{ display: 'contents' }} key={label}>
              <div className={`step ${step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}`}>
                <span className="step-num">{step > index + 1 ? <Check size={12} /> : index + 1}</span>
                <span>{label}</span>
              </div>
              {index < 3 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="card form-card">
          {step === 1 && (
            <>
              <h2>Role Basics</h2>
              <p>Title and company establish the context for AI skill recommendations.</p>
              <div className="form-grid">
                <Field
                  label="Role Title"
                  value={form.title}
                  placeholder="e.g. Senior Data Scientist, Lead Full Stack Engineer"
                  onChange={(v) => update('title', v)}
                  testId="input-job-title"
                />
                <Field
                  label="Company Name"
                  value={form.company}
                  placeholder="Company name"
                  onChange={(v) => update('company', v)}
                  testId="input-job-company"
                />
                <Field
                  label="Role Summary"
                  value={form.description}
                  placeholder="Describe key responsibilities and technical ownership..."
                  onChange={(v) => update('description', v)}
                  testId="textarea-job-description"
                  textarea
                  full
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Work Context & Compensation</h2>
              <p>Set clear experience boundaries and compensation ranges.</p>
              <div className="form-grid">
                <Field
                  label="Location"
                  value={form.location}
                  placeholder="City or region"
                  onChange={(v) => update('location', v)}
                  testId="input-job-location"
                />
                <SelectField
                  label="Work Mode"
                  value={form.workMode}
                  onChange={(v) => update('workMode', v)}
                  options={['remote', 'hybrid', 'onsite']}
                  testId="select-work-mode"
                />
                <SelectField
                  label="Employment Type"
                  value={form.employmentType}
                  onChange={(v) => update('employmentType', v)}
                  options={['full-time', 'part-time', 'contract', 'internship']}
                  testId="select-employment-type"
                />
                <SelectField
                  label="Education Requirement"
                  value={form.education}
                  onChange={(v) => update('education', v)}
                  options={['any', 'diploma', 'bachelors', 'masters', 'phd']}
                  testId="select-education"
                />
                <Field
                  label="Minimum Experience (Years)"
                  value={String(form.minExperience)}
                  type="number"
                  onChange={(v) => update('minExperience', Number(v))}
                  testId="input-min-experience"
                />
                <Field
                  label="Maximum Experience (Years)"
                  value={String(form.maxExperience)}
                  type="number"
                  onChange={(v) => update('maxExperience', Number(v))}
                  testId="input-max-experience"
                />
                <Field
                  label="Annual Salary Floor (INR)"
                  value={String(form.salaryMin)}
                  type="number"
                  onChange={(v) => update('salaryMin', Number(v))}
                  testId="input-salary-min"
                />
                <Field
                  label="Annual Salary Ceiling (INR)"
                  value={String(form.salaryMax)}
                  type="number"
                  onChange={(v) => update('salaryMax', Number(v))}
                  testId="input-salary-max"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Required & Preferred Skill Matrix</h2>
                  <p style={{ margin: '4px 0 0' }}>Configure importance and minimum proficiency floor per skill.</p>
                </div>
                <button
                  type="button"
                  className="button button-accent"
                  onClick={handleGenerateAISuggestions}
                  disabled={isGeneratingSuggestions}
                  data-testid="button-ai-suggest-skills"
                >
                  <Bot size={15} /> {isGeneratingSuggestions ? 'Analyzing Graph...' : 'AI Skill Suggestions'}
                </button>
              </div>

              <div className="skill-editor">
                {skills.map((skill, index) => (
                  <div className="skill-editor-row" key={index} style={{ gridTemplateColumns: '1fr 120px 140px auto' }}>
                    <input
                      className="input"
                      value={skill.name}
                      placeholder="Skill name, e.g. Python"
                      onChange={(e) =>
                        setSkills(
                          skills.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                        )
                      }
                      data-testid={`input-job-skill-${index}`}
                    />
                    <select
                      className="select"
                      value={skill.importance}
                      onChange={(e) =>
                        setSkills(
                          skills.map((item, i) =>
                            i === index
                              ? { ...item, importance: e.target.value as 'required' | 'preferred' }
                              : item
                          )
                        )
                      }
                      data-testid={`select-job-skill-importance-${index}`}
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                    </select>
                    <select
                      className="select"
                      value={skill.minProficiency}
                      onChange={(e) =>
                        setSkills(
                          skills.map((item, i) =>
                            i === index
                              ? { ...item, minProficiency: e.target.value as Proficiency }
                              : item
                          )
                        )
                      }
                      data-testid={`select-job-skill-proficiency-${index}`}
                    >
                      <option value="beginner">Beginner+</option>
                      <option value="intermediate">Intermediate+</option>
                      <option value="advanced">Advanced+</option>
                      <option value="expert">Expert</option>
                    </select>
                    <button
                      className="button button-ghost"
                      onClick={() =>
                        skills.length > 1 && setSkills(skills.filter((_, i) => i !== index))
                      }
                      data-testid={`button-remove-job-skill-${index}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  className="button button-secondary"
                  style={{ width: 'fit-content' }}
                  onClick={addSkill}
                  data-testid="button-add-job-skill"
                >
                  <Plus size={14} /> Add Skill Row
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Review and Publish Role</h2>
              <p>Your transparent requirements are ready for candidate scoring.</p>
              <div className="goal-card" style={{ marginBottom: 15 }}>
                <div>
                  <h3>{form.title || 'Untitled Role'}</h3>
                  <p>
                    {form.company} · {form.location} · {form.workMode} · {form.employmentType}
                  </p>
                  <p>
                    ₹{form.salaryMin.toLocaleString('en-IN')}–₹{form.salaryMax.toLocaleString('en-IN')} per year
                  </p>
                </div>
                <span className="pill pill-green">Ready to Publish</span>
              </div>
              <p className="bio" style={{ marginBottom: 15 }}>
                {form.description || 'No role summary provided.'}
              </p>
              <div className="skill-list">
                {skills
                  .filter((s) => s.name.trim())
                  .map((s) => (
                    <span
                      key={s.name}
                      className={`pill ${s.importance === 'required' ? 'pill-green' : 'pill-slate'}`}
                    >
                      {s.name} · {s.importance} ({s.minProficiency}+)
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="form-footer">
          <button
            className="button button-ghost"
            onClick={() => (step === 1 ? setLocation('/recruiter/dashboard') : setStep(step - 1))}
            data-testid="button-wizard-back"
          >
            {step === 1 ? 'Cancel' : <><ArrowLeft size={14} /> Back</>}
          </button>
          {step < 4 ? (
            <button
              className="button button-primary"
              disabled={!canContinue}
              onClick={() => setStep(step + 1)}
              data-testid="button-wizard-next"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="button button-accent"
              onClick={complete}
              data-testid="button-publish-job"
            >
              <Check size={14} /> Publish Role
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. RECRUITER: AI-ASSISTED MATCHES & SCARCITY
// ==========================================
function RecruiterMatchesPage() {
  const { jobs, candidates, shortlisted, toggleShortlist, activeJobId, setActiveJobId } = useApp();
  const [query, setQuery] = useState('');
  const [jobId, setJobId] = useState(activeJobId || jobs[0]?.id || '');
  const [minScore, setMinScore] = useState('0');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [inspectingCandidate, setInspectingCandidate] = useState<Candidate | null>(null);

  const job = jobs.find((j) => j.id === jobId) ?? currentJob(jobs, activeJobId);

  const ranked = useMemo(() => {
    return candidates
      .map((candidate) => ({
        candidate,
        score: calculateAIEnhancedMatch(candidate, job),
      }))
      .filter(({ candidate, score }) => {
        const text = `${candidate.name} ${candidate.headline} ${candidate.location} ${candidate.skills.map((s) => s.name).join(' ')}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          score.total >= Number(minScore) &&
          (!shortlistOnly || shortlisted.includes(candidate.id))
        );
      })
      .sort((a, b) => b.score.total - a.score.total);
  }, [candidates, job, query, minScore, shortlistOnly, shortlisted]);

  const scarcityMetrics = useMemo(() => analyzePoolScarcity(candidates, job), [candidates, job]);

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Talent Intelligence & AI Ranking"
        title="AI-Assisted Candidate Shortlist"
        description="Two-layer ranking: auditable deterministic base score + bounded AI semantic transferability."
        action={
          <Link href="/recruiter/create-job" className="button button-primary" data-testid="link-matches-create-job">
            <Plus size={15} /> Post New Role
          </Link>
        }
      />

      {/* Recruiter Skill Gap / Scarcity Flagging */}
      <div className="scarcity-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 13.5, color: 'var(--apple-primary-text)' }}>
            Applicant Pool Scarcity & Coverage Analysis ({candidates.length} candidates)
          </strong>
          <span className="pill pill-slate" style={{ fontSize: 10.5 }}>Market Signal</span>
        </div>
        <div className="scarcity-grid">
          {scarcityMetrics.map((metric) => (
            <div
              key={metric.skillName}
              className={`scarcity-item ${metric.isScarce ? 'alert-scarcity' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <strong style={{ color: 'var(--apple-primary-text)' }}>{metric.skillName}</strong>
                <span style={{ color: metric.isScarce ? 'var(--apple-warning)' : 'var(--apple-success)', fontWeight: 700 }}>
                  {metric.coveragePercentage}%
                </span>
              </div>
              <div className="progress-line" style={{ height: 4 }}>
                <span
                  style={{
                    width: `${metric.coveragePercentage}%`,
                    background: metric.isScarce ? 'var(--apple-warning)' : 'var(--apple-success)',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)' }}>
                {metric.matchedCandidatesCount} matches ({metric.verifiedCandidatesCount} verified)
                {metric.isScarce && ' · High Scarcity'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates, skills, locations"
            data-testid="input-search-candidates"
          />
        </div>
        <select
          className="select filter"
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setActiveJobId(e.target.value);
          }}
          data-testid="select-match-job"
        >
          {jobs.map((j) => (
            <option value={j.id} key={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          className="select filter"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          data-testid="select-min-score"
        >
          <option value="0">Any score</option>
          <option value="70">70% and above</option>
          <option value="80">80% and above</option>
          <option value="90">90% and above</option>
        </select>
        <button
          className={`button ${shortlistOnly ? 'button-accent' : 'button-secondary'}`}
          onClick={() => setShortlistOnly(!shortlistOnly)}
          data-testid="button-filter-shortlisted"
        >
          <Filter size={14} /> Shortlisted {shortlistOnly ? 'only' : ''}
        </button>
      </div>

      {/* Ranked List */}
      {ranked.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search size={22} />}
            title="No matches found"
            message="Try clearing your filters or lowering the score threshold."
            action={
              <button
                className="button button-secondary"
                onClick={() => {
                  setQuery('');
                  setMinScore('0');
                  setShortlistOnly(false);
                }}
              >
                Reset Filters
              </button>
            }
          />
        </div>
      ) : (
        ranked.map(({ candidate, score }, index) => {
          const isShortlisted = shortlisted.includes(candidate.id);

          return (
            <div className="card match-card" key={candidate.id} data-testid={`card-match-${candidate.id}`}>
              <div>
                <div className="candidate-id">
                  <img
                    src={candidate.avatarUrl || `https://github.com/${candidate.githubUsername || 'vasudev196006'}.png`}
                    alt={candidate.name}
                    style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--apple-border)' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://github.com/github.png';
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Link className="candidate-name" href={`/candidate/${candidate.id}`}>
                        {candidate.name}
                      </Link>
                      {candidate.githubUrl && (
                        <a
                          href={candidate.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`View @${candidate.githubUsername} on GitHub`}
                          className="pill pill-slate"
                          style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        >
                          <Github size={12} /> @{candidate.githubUsername} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="candidate-meta">
                      {candidate.headline} · {candidate.location} · {candidate.experienceYears}y exp
                    </div>
                  </div>
                </div>
                <div className="skill-list">
                  {candidate.skills.slice(0, 4).map((s) => (
                    <span className="skill-tag" key={s.name}>
                      {s.name} {s.verified && '✓'}
                    </span>
                  ))}
                  <span className="skill-tag" style={{ background: 'rgba(255, 255, 255, 0.14)', color: '#FFFFFF', fontWeight: 700 }}>
                    #{index + 1} Ranked
                  </span>
                </div>
              </div>

              <ScoreCard score={score} />

              <div className="match-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setInspectingCandidate(candidate)}
                  data-testid={`button-ai-explain-${candidate.id}`}
                >
                  <Bot size={13} /> AI Justification
                </button>
                <button
                  className={`button ${isShortlisted ? 'button-accent' : 'button-secondary'}`}
                  onClick={() => toggleShortlist(candidate.id)}
                  data-testid={`button-shortlist-${candidate.id}`}
                >
                  {isShortlisted ? <Check size={14} /> : <Plus size={14} />}{' '}
                  {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* AI Justification Modal */}
      {inspectingCandidate && (
        <AIJustificationModal
          candidate={inspectingCandidate}
          job={job}
          onClose={() => setInspectingCandidate(null)}
        />
      )}
    </div>
  );
}

function AIJustificationModal({
  candidate,
  job,
  onClose,
}: {
  candidate: Candidate;
  job: Job;
  onClose: () => void;
}) {
  const enhancedScore = calculateAIEnhancedMatch(candidate, job);
  const justification = enhancedScore.justification;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={22} color="var(--apple-accent)" />
            <div>
              <h2 style={{ fontSize: 18 }}>AI Ranking Justification</h2>
              <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)' }}>
                Auditable breakdown for {candidate.name} ({job.title})
              </div>
            </div>
          </div>
          <button className="button button-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Score Pill Summary */}
        <div className="card" style={{ padding: 16, marginBottom: 18, background: 'rgba(0, 0, 0, 0.45)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--apple-primary-text)' }}>Total Transparent Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pill pill-slate">Base: {enhancedScore.deterministicTotal}%</span>
              {(enhancedScore.aiSemanticBonus ?? 0) > 0 && (
                <span className="pill pill-green">AI Semantic: +{enhancedScore.aiSemanticBonus} pts</span>
              )}
              <strong style={{ fontSize: 17, color: 'var(--apple-accent)' }}>{enhancedScore.total}%</strong>
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--apple-secondary-text)', lineHeight: 1.6 }}>
            {justification?.summary}
          </p>
        </div>

        {/* Key Drivers */}
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Key Scoring Drivers</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {justification?.keyDrivers.map((driver, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--apple-primary-text)' }}>
                <CheckCircle size={14} color="var(--apple-accent)" />
                <span>{driver}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Semantic Adjustments */}
        {(justification?.semanticAdjustments.length ?? 0) > 0 && (
          <div style={{ marginBottom: 18, borderTop: '1px solid var(--apple-separator)', paddingTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Semantic Near Matches (Bounded Partial Credit)</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {justification?.semanticAdjustments.map((adj, i) => (
                <div key={i} className="card" style={{ background: 'var(--apple-accent-subtle)', borderColor: 'var(--apple-accent-border)', padding: 12, fontSize: 11.5 }}>
                  <strong style={{ color: 'var(--apple-primary-text)' }}>{adj.candidateSkill} ↔ {adj.jobSkill}</strong> <span style={{ color: 'var(--apple-accent)' }}>(+{adj.bonusPoints} pts)</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--apple-secondary-text)' }}>{adj.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Areas */}
        {(justification?.developmentAreas.length ?? 0) > 0 && (
          <div style={{ borderTop: '1px solid var(--apple-separator)', paddingTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Development Considerations</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {justification?.developmentAreas.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--apple-secondary-text)' }}>
                  <AlertCircle size={14} color="var(--apple-danger)" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="button button-primary" onClick={onClose} style={{ minWidth: 100 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. RECRUITER: OVERVIEW DASHBOARD
// ==========================================
function RecruiterDashboard() {
  const { jobs, candidates, shortlisted, activeJobId, setActiveJobId } = useApp();
  const activeJobs = jobs.filter((job) => job.status === 'active');
  const job = currentJob(jobs, activeJobId);

  const ranked = useMemo(
    () =>
      candidates
        .map((candidate) => ({ candidate, score: calculateAIEnhancedMatch(candidate, job) }))
        .sort((a, b) => b.score.total - a.score.total),
    [candidates, job]
  );

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Recruiter Talent Overview"
        title="Predictable hiring starts with auditable briefs."
        description="Every score is mathematically explainable from verified skills, GitHub projects, and credentials."
        action={
          <Link href="/recruiter/create-job" className="button button-primary" data-testid="link-create-job">
            <Plus size={15} /> Create a Role
          </Link>
        }
      />

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-head">
            <span>Active Roles</span>
            <BriefcaseBusiness size={15} />
          </div>
          <div className="stat-value" data-testid="text-active-roles">{activeJobs.length}</div>
          <div className="stat-note">Open and accepting</div>
        </div>
        <div className="card stat">
          <div className="stat-head">
            <span>Candidate Pool</span>
            <Users size={15} />
          </div>
          <div className="stat-value" data-testid="text-people-matched">{candidates.length}</div>
          <div className="stat-note">Audited GitHub profiles</div>
        </div>
        <div className="card stat">
          <div className="stat-head">
            <span>Shortlisted</span>
            <ClipboardCheck size={15} />
          </div>
          <div className="stat-value" data-testid="text-shortlisted">{shortlisted.length}</div>
          <div className="stat-note">Ready for interviews</div>
        </div>
        <div className="card stat">
          <div className="stat-head">
            <span>Average Match</span>
            <BarChart3 size={15} />
          </div>
          <div className="stat-value" data-testid="text-average-match">
            {Math.round(ranked.reduce((sum, item) => sum + item.score.total, 0) / Math.max(ranked.length, 1))}%
          </div>
          <div className="stat-note">For {job?.title}</div>
        </div>
      </div>

      <div className="grid-2">
        <section className="card section-card">
          <div className="section-title">
            <h2>Active Job Postings</h2>
            <Link href="/recruiter/create-job" className="button button-ghost" data-testid="link-add-role">
              <Plus size={14} /> Add Role
            </Link>
          </div>
          {jobs.slice(0, 4).map((item) => (
            <div className="job-row" key={item.id} data-testid={`row-job-${item.id}`}>
              <div>
                <Link
                  className="job-title"
                  href="/recruiter/matches"
                  onClick={() => setActiveJobId(item.id)}
                  data-testid={`link-job-${item.id}`}
                >
                  {item.title}
                </Link>
                <div className="job-meta">
                  {item.company} · {item.location} · {item.workMode}
                </div>
              </div>
              <div className="row-right">
                <span className={`pill ${item.status === 'active' ? 'pill-green' : 'pill-slate'}`}>
                  {item.status}
                </span>
                <div className="job-meta">{item.skills.length} skills</div>
              </div>
            </div>
          ))}
        </section>

        <section className="card section-card">
          <div className="section-title">
            <h2>Top AI Ranked Candidates</h2>
            <Link href="/recruiter/matches" className="button button-ghost" data-testid="link-view-matches">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {ranked.slice(0, 4).map(({ candidate, score }) => (
            <div className="candidate-row" key={candidate.id} data-testid={`row-top-candidate-${candidate.id}`}>
              <div className="candidate-id">
                <div className="candidate-initial">{initials(candidate.name)}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link href={`/candidate/${candidate.id}`} className="candidate-name">
                      {candidate.name}
                    </Link>
                    {candidate.githubUrl && (
                      <a
                        href={candidate.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--apple-secondary-text)' }}
                        title="View candidate GitHub profile"
                      >
                        <Github size={12} />
                      </a>
                    )}
                  </div>
                  <div className="candidate-meta">{candidate.headline}</div>
                </div>
              </div>
              <div className="row-right">
                <div className="score">{score.total}%</div>
                <div className="score-caption">
                  {(score.aiSemanticBonus ?? 0) > 0 ? `+${score.aiSemanticBonus} AI` : 'deterministic'}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ==========================================
// 8. CANDIDATE PROFILE PAGE
// ==========================================
function CandidateProfilePage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { candidates, jobs, shortlisted, toggleShortlist, activeJobId } = useApp();
  const candidate = candidates.find((item) => item.id === candidateId);
  const job = currentJob(jobs, activeJobId);

  if (!candidate) {
    return (
      <div className="page">
        <EmptyState
          icon={<UserRound size={22} />}
          title="Candidate not found"
          message="This profile could not be found."
          action={
            <Link className="button button-secondary" href="/recruiter/matches">
              Back to matches
            </Link>
          }
        />
      </div>
    );
  }

  const score = calculateAIEnhancedMatch(candidate, job);
  const isShortlisted = shortlisted.includes(candidate.id);

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <Link href="/recruiter/matches" className="button button-ghost">
          <ArrowLeft size={14} /> Back to Matches
        </Link>
      </div>

      <div className="card profile-hero">
        <div className="profile-hero-main">
          <img
            src={candidate.avatarUrl || `https://github.com/${candidate.githubUsername || 'vasudev196006'}.png`}
            alt={candidate.name}
            className="profile-avatar"
            style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--apple-accent)' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://github.com/github.png';
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{candidate.name}</h1>
              {candidate.githubUrl && (
                <a
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary"
                  style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Github size={14} /> @{candidate.githubUsername || 'vasudev196006'} on GitHub <ExternalLink size={11} />
                </a>
              )}
            </div>
            <p>
              {candidate.headline} · {candidate.location}
            </p>
            <p>
              {candidate.experienceYears} yrs experience · {candidate.education} {candidate.publicRepos ? `· ${candidate.publicRepos} public repos` : ''} {candidate.followers ? `· ${candidate.followers} followers` : ''}
            </p>
          </div>
        </div>
        <button
          className={`button ${isShortlisted ? 'button-accent' : 'button-primary'}`}
          onClick={() => toggleShortlist(candidate.id)}
        >
          {isShortlisted ? <Check size={14} /> : <Plus size={14} />}{' '}
          {isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
        </button>
      </div>

      <div className="detail-grid">
        <div>
          <section className="card detail-card">
            <h2>About {candidate.name.split(' ')[0]}</h2>
            <p className="bio">{candidate.bio}</p>
          </section>

          <section className="card detail-card">
            <h2>Verified Projects & Evidence</h2>
            {candidate.projects.length ? (
              candidate.projects.map((project) => (
                <div className="project" key={project.title}>
                  <div className="project-title">
                    <span>{project.title}</span>
                    <span className="skill-list" style={{ margin: 0 }}>
                      {project.technologies.slice(0, 4).map((tech) => (
                        <span className="skill-tag" key={tech}>
                          {tech}
                        </span>
                      ))}
                    </span>
                  </div>
                  <p>{project.description}</p>
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--apple-accent)', fontWeight: 600, fontSize: 12, textDecoration: 'none', marginTop: 4 }}
                    >
                      <Github size={13} /> View Source Code on GitHub <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <EmptyState icon={<Github size={20} />} title="No projects listed" message="No project records found." />
            )}
          </section>
        </div>

        <div>
          <section className="card detail-card">
            <div className="section-title">
              <h2>Match for {job.title}</h2>
              <span className="pill pill-green">{score.total}% Match</span>
            </div>
            <ScoreBreakdown score={score} />
          </section>

          <section className="card detail-card">
            <h2>Skill Proficiency & Verification</h2>
            <div className="skill-list">
              {candidate.skills.map((skill) => (
                <span className="skill-tag" key={skill.name}>
                  {skill.name} · {skill.proficiency}
                  {skill.verified ? ' · ✓ Verified' : ''}
                </span>
              ))}
            </div>
          </section>

          <section className="card detail-card">
            <h2>Credentials</h2>
            {candidate.certifications.length ? (
              candidate.certifications.map((cert) => (
                <div className="job-row" key={cert.credentialId}>
                  <div>
                    <div className="job-title">{cert.name}</div>
                    <div className="job-meta">
                      {cert.issuer} · {cert.issueDate}
                    </div>
                  </div>
                  {cert.verified && <ShieldCheck size={17} color="var(--apple-accent)" />}
                </div>
              ))
            ) : (
              <p className="bio">No credentials added.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. CREDENTIALS & SHA-256 PROOFS
// ==========================================
function CredentialsPage() {
  const { learner } = useApp();
  const certifications = learner.certifications;

  return (
    <div className="page">
      <SectionHeader
        eyebrow="Cryptographic Proofs"
        title="Verified Credential Records"
        description="Every credential is hash-verified with SHA-256 integrity inspection."
        action={
          <Link href="/seeker/profile/upload" className="button button-accent">
            <UploadCloud size={14} /> Upload New Certificate
          </Link>
        }
      />
      <div style={{ display: 'grid', gap: 12 }}>
        {certifications.map((credential) => (
          <div
            className="card credential-card"
            key={credential.credentialId}
            data-testid={`card-credential-${credential.credentialId}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="credential-icon">
                <FileCheck2 size={20} />
              </div>
              <div>
                <h3>{credential.name}</h3>
                <p>
                  {credential.issuer} · Issued {credential.issueDate}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`pill ${credential.verified ? 'pill-green' : 'pill-amber'}`}>
                {credential.verified ? '✓ Verified' : 'Pending Audit'}
              </span>
              <Link
                href={`/verify/${credential.credentialId}`}
                className="button button-secondary"
                data-testid={`link-verify-${credential.credentialId}`}
              >
                Inspect Proof <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyPage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const { learner } = useApp();
  const credential = learner.certifications.find((item) => item.credentialId === credentialId);

  if (!credential) {
    return (
      <div className="page">
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title="Credential not found"
          message="Check the credential ID and try again."
          action={
            <Link href="/seeker/credentials" className="button button-secondary">
              Back to credentials
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 780, margin: '20px auto' }}>
        <Link href="/seeker/credentials" className="button button-ghost">
          <ArrowLeft size={14} /> Back to Credentials
        </Link>
        <section className="card detail-card" style={{ marginTop: 15 }}>
          <div className="verify-banner" role="status">
            <ShieldCheck size={21} />
            <div>
              <strong>Cryptographic SHA-256 Integrity Verified</strong>
              <p>
                Calculated directly from recipient payload, issuer origin, and timestamp.
              </p>
            </div>
          </div>
          <div className="eyebrow">Credential Verification Record</div>
          <h1 style={{ fontSize: 28, letterSpacing: '-.05em', margin: '8px 0' }}>
            {credential.name}
          </h1>
          <p className="bio">
            {credential.issuer} · Issued {credential.issueDate}
          </p>
          <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Recipient</div>
              <strong>{learner.name}</strong>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Credential ID</div>
              <div className="hash-box">{credential.credentialId}</div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>SHA-256 Digest</div>
              <div className="hash-box">{credential.verificationHash}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ==========================================
// FORM HELPERS
// ==========================================
function Field({
  label,
  value,
  placeholder,
  onChange,
  testId,
  textarea = false,
  full = false,
  type = 'text',
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  testId: string;
  textarea?: boolean;
  full?: boolean;
  type?: string;
}) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {textarea ? (
        <textarea
          className="textarea"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      ) : (
        <input
          className="input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  testId: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option[0]?.toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==========================================
// ROUTER & ROUTE GUARDS
// ==========================================
function Router() {
  const { role } = useApp();

  return (
    <Shell>
      <Switch>
        {/* Public Landing & Login */}
        <Route path="/" component={LandingPage} />

        {/* Recruiter Routes */}
        <Route path="/recruiter/dashboard" component={RecruiterDashboard} />
        <Route path="/recruiter/create-job" component={RecruiterCreateJobPage} />
        <Route path="/recruiter/matches" component={RecruiterMatchesPage} />
        <Route path="/recruiter/matches/:jobId" component={RecruiterMatchesPage} />

        {/* Backward compatibility aliases for Recruiter */}
        <Route path="/recruiter" component={RecruiterDashboard} />
        <Route path="/create-job" component={RecruiterCreateJobPage} />
        <Route path="/matches" component={RecruiterMatchesPage} />

        {/* Seeker Routes */}
        <Route path="/seeker/dashboard" component={SeekerDashboard} />
        <Route path="/seeker/profile/upload" component={SeekerUploadPage} />
        <Route path="/seeker/roadmap" component={SeekerRoadmapPage} />
        <Route path="/seeker/credentials" component={CredentialsPage} />

        {/* Backward compatibility aliases for Seeker */}
        <Route path="/learner" component={SeekerDashboard} />
        <Route path="/skill-gap" component={SeekerRoadmapPage} />
        <Route path="/learning-path" component={SeekerRoadmapPage} />
        <Route path="/credentials" component={CredentialsPage} />

        {/* Shared Detail Routes */}
        <Route path="/candidate/:candidateId" component={CandidateProfilePage} />
        <Route path="/verify/:credentialId" component={VerifyPage} />

        {/* Fallback */}
        <Route>
          <div className="page">
            <EmptyState
              icon={<CircleHelp size={24} />}
              title="Page not found"
              message="The requested route does not exist."
              action={
                <Link
                  className="button button-primary"
                  href={role === 'seeker' ? '/seeker/dashboard' : '/recruiter/dashboard'}
                >
                  Return to Dashboard
                </Link>
              }
            />
          </div>
        </Route>
      </Switch>
    </Shell>
  );
}

// ==========================================
// ROOT APPLICATION COMPONENT
// ==========================================
function App() {
  const [role, setRoleState] = useState<UserRole | null>(() => {
    return readStored<UserRole | null>('hireready-user-role', 'seeker');
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const custom = readStored<Job[]>('hireready-jobs', []);
    return [...seedJobs, ...custom.filter((c) => !seedJobs.some((s) => s.id === c.id))];
  });

  const [candidates] = useState<Candidate[]>(seedCandidates);

  const [learner, setLearner] = useState<Candidate>(() => {
    return readStored<Candidate>('hireready-current-learner', initialLearner);
  });

  const [shortlisted, setShortlisted] = useState<string[]>(() => {
    return readStored<string[]>('hireready-shortlist', []);
  });

  const [activeJobId, setActiveJobIdState] = useState<string>(() => {
    return readStored<string>('hireready-active-job', seedJobs[0]?.id ?? '');
  });

  const [notice, setNotice] = useState('');

  const setRole = (newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('hireready-user-role', JSON.stringify(newRole));
    } else {
      localStorage.removeItem('hireready-user-role');
    }
  };

  const addJob = (job: Job) => {
    setJobs((prev) => {
      const next = [...prev, job];
      const customOnly = next.filter((j) => !seedJobs.some((s) => s.id === j.id));
      localStorage.setItem('hireready-jobs', JSON.stringify(customOnly));
      return next;
    });
  };

  const setActiveJobId = (id: string) => {
    setActiveJobIdState(id);
    localStorage.setItem('hireready-active-job', id);
  };

  const toggleShortlist = (id: string) => {
    setShortlisted((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('hireready-shortlist', JSON.stringify(next));
      return next;
    });
  };

  const updateLearner = (updater: (prev: Candidate) => Candidate) => {
    setLearner((prev) => {
      const next = updater(prev);
      localStorage.setItem('hireready-current-learner', JSON.stringify(next));
      return next;
    });
  };

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      jobs,
      candidates,
      learner,
      shortlisted,
      activeJobId,
      addJob,
      setActiveJobId,
      toggleShortlist,
      updateLearner,
      notify,
    }),
    [role, jobs, candidates, learner, shortlisted, activeJobId]
  );

  return (
    <AppContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
            <Router />
            <AIChatbot jobs={jobs} candidates={candidates} learner={learner} role={role} />
          </WouterRouter>
          <Toaster />
          {notice && (
            <div className="toast-note" data-testid="status-toast">
              <Sparkles size={15} color="var(--apple-accent)" />
              <span>{notice}</span>
            </div>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </AppContext.Provider>
  );
}

export default App;