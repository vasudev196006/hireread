import { type CSSProperties, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { seedCandidates, seedJobs, currentLearner } from '@/lib/seed-data';
import { calculateMatchScore } from '@/lib/scoring';
import type { Candidate, Job, MatchScore } from '@/lib/types';
import {
  ArrowLeft, ArrowRight, Award, BarChart3, BriefcaseBusiness, Check, CheckCircle2, ChevronRight,
  CircleHelp, ClipboardCheck, ExternalLink, FileCheck2, Filter, Github, LayoutDashboard, ListChecks,
  Plus, Radar, Search, ShieldCheck, Target, UserRound, Users, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type AppContextValue = {
  jobs: Job[];
  candidates: Candidate[];
  shortlisted: string[];
  activeJobId: string;
  addJob: (job: Job) => void;
  setActiveJobId: (id: string) => void;
  toggleShortlist: (id: string) => void;
  notify: (message: string) => void;
  role: 'recruiter' | 'learner';
  setRole: (role: 'recruiter' | 'learner') => void;
};
const AppContext = createContext<AppContextValue | null>(null);
const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('HireReady context is unavailable');
  return context;
};

function initials(name: string) {
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}
function currentJob(jobs: Job[], activeJobId?: string) {
  return jobs.find((job) => job.id === activeJobId && job.status === 'active')
    ?? jobs.find((job) => job.status === 'active')
    ?? jobs[0]!;
}

function readStoredArray<T>(key: string): T[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(stored) ? stored as T[] : [];
  } catch {
    return [];
  }
}

function loadJobs(): Job[] {
  const customJobs = readStoredArray<Job>('hireready-jobs').filter(
    (job) => job && typeof job.id === 'string' && !seedJobs.some((seed) => seed.id === job.id),
  );
  return [...seedJobs, ...customJobs];
}

function Shell({ children }: { children: ReactNode }) {
  const { role, setRole } = useApp();
  const [location, setLocation] = useLocation();
  const learnerName = currentLearner.name;
  const recruiterLinks = [
    { href: '/recruiter', label: 'Overview', icon: LayoutDashboard },
    { href: '/matches', label: 'Matches', icon: Radar },
    { href: '/create-job', label: 'Create a role', icon: Plus },
  ];
  const learnerLinks = [
    { href: '/learner', label: 'My overview', icon: LayoutDashboard },
    { href: '/skill-gap', label: 'Skill gaps', icon: Target },
    { href: '/learning-path', label: 'Learning path', icon: ListChecks },
    { href: '/credentials', label: 'Credentials', icon: Award },
  ];
  const links = role === 'recruiter' ? recruiterLinks : learnerLinks;
  const isActive = (href: string) => location === href || (href !== '/recruiter' && location.startsWith(href));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={role === 'recruiter' ? '/recruiter' : '/learner'} className="brand" data-testid="link-brand">
          <span className="brand-mark">H</span><span>HireReady</span>
        </Link>
        <div className="nav-label">Workspace</div>
        <nav className="nav-group">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${isActive(href) ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="role-card">
          <small>Viewing as</small>
          <strong>{role === 'recruiter' ? 'Recruiter' : 'Learner'}</strong>
          <button className="role-switch" data-testid="button-switch-role" onClick={() => { const next = role === 'recruiter' ? 'learner' : 'recruiter'; setRole(next); setLocation(next === 'recruiter' ? '/recruiter' : '/learner'); }}>Switch view</button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="crumb">{role === 'recruiter' ? 'Talent workspace' : 'Learning workspace'} <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /> {role === 'recruiter' ? 'Northstar Labs' : learnerName}</span>
          <div className="top-actions"><CircleHelp size={17} color="#718093" /><div className="avatar">{role === 'recruiter' ? 'NL' : initials(learnerName)}</div></div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function ScoreBreakdown({ score, compact = false }: { score: MatchScore; compact?: boolean }) {
  return <div className="breakdown" data-testid="score-breakdown">
    {score.components.map((component) => {
      const percentage = Math.round((component.score / component.max) * 100);
      return <div key={component.key} className="breakdown-row">
        <label>{component.label}</label>
        <div className="progress-line"><span style={{ width: `${percentage}%` }} /></div>
        <div className="breakdown-score">{component.score}/{component.max}</div>
        {!compact && <div className="breakdown-detail">{component.detail}</div>}
      </div>;
    })}
  </div>;
}

function ScoreCard({ score }: { score: MatchScore }) {
  return <div className="score-block" data-testid="text-match-score">
    <div className="score-ring" style={{ '--score': score.total } as CSSProperties}><strong>{score.total}</strong></div>
    <div className="score-label">transparent match</div>
  </div>;
}

function RecruiterDashboard() {
  const { jobs, candidates, shortlisted, activeJobId, setActiveJobId } = useApp();
  const activeJobs = jobs.filter((job) => job.status === 'active');
  const job = currentJob(jobs, activeJobId);
  const ranked = useMemo(() => candidates.map((candidate) => ({ candidate, score: calculateMatchScore(candidate, job) })).sort((a, b) => b.score.total - a.score.total), [candidates, job]);
  return <div className="page">
    <SectionHeader eyebrow="Recruiter overview" title="Good hiring starts with a clear brief." description="See exactly why each person matches before you reach out." action={<Link href="/create-job" className="button button-primary" data-testid="link-create-job"><Plus size={15} /> Create a role</Link>} />
    <div className="stat-grid">
      <div className="card stat"><div className="stat-head"><span>Active roles</span><BriefcaseBusiness size={15} /></div><div className="stat-value" data-testid="text-active-roles">{activeJobs.length}</div><div className="stat-note">Open and accepting</div></div>
      <div className="card stat"><div className="stat-head"><span>People matched</span><Users size={15} /></div><div className="stat-value" data-testid="text-people-matched">{candidates.length}</div><div className="stat-note">Across your roles</div></div>
      <div className="card stat"><div className="stat-head"><span>Shortlisted</span><ClipboardCheck size={15} /></div><div className="stat-value" data-testid="text-shortlisted">{shortlisted.length}</div><div className="stat-note">Ready for review</div></div>
      <div className="card stat"><div className="stat-head"><span>Average match</span><BarChart3 size={15} /></div><div className="stat-value" data-testid="text-average-match">{Math.round(ranked.reduce((sum, item) => sum + item.score.total, 0) / Math.max(ranked.length, 1))}%</div><div className="stat-note">For {job?.title ?? 'your open roles'}</div></div>
    </div>
    <div className="grid-2">
      <section className="card section-card">
        <div className="section-title"><h2>Recent roles</h2><Link href="/create-job" className="button button-ghost" data-testid="link-add-role"><Plus size={14} /> Add role</Link></div>
        {jobs.length === 0 ? <EmptyState icon={<BriefcaseBusiness size={22} />} title="No roles yet" message="Create a role to start comparing candidates." action={<Link href="/create-job" className="button button-accent" data-testid="link-create-first-role">Create your first role</Link>} /> : jobs.slice(0, 4).map((item) => <div className="job-row" key={item.id} data-testid={`row-job-${item.id}`}><div><Link className="job-title" href="/matches" onClick={() => setActiveJobId(item.id)} data-testid={`link-job-${item.id}`}>{item.title}</Link><div className="job-meta">{item.company} · {item.location} · {item.workMode}</div></div><div className="row-right"><span className={`pill ${item.status === 'active' ? 'pill-green' : 'pill-slate'}`}>{item.status}</span><div className="job-meta">{item.skills.length} skills</div></div></div>)}
      </section>
      <section className="card section-card">
        <div className="section-title"><h2>Top matches</h2><Link href="/matches" className="button button-ghost" data-testid="link-view-matches">View all <ArrowRight size={14} /></Link></div>
        {ranked.slice(0, 4).map(({ candidate, score }) => <div className="candidate-row" key={candidate.id} data-testid={`row-top-candidate-${candidate.id}`}><div className="candidate-id"><div className="candidate-initial">{initials(candidate.name)}</div><div><Link href={`/candidate/${candidate.id}`} className="candidate-name" data-testid={`link-top-candidate-${candidate.id}`}>{candidate.name}</Link><div className="candidate-meta">{candidate.headline}</div></div></div><div className="row-right"><div className="score">{score.total}%</div><div className="score-caption">match</div></div></div>)}
      </section>
    </div>
    <div className="card section-card" style={{ marginTop: 18 }}>
      <div className="section-title"><h2>How scoring works</h2><span>Always visible. Always deterministic.</span></div>
      <div className="grid-2" style={{ gap: 28 }}><p className="bio">HireReady does not make a hidden recommendation. It compares a candidate to the requirements you wrote, component by component. Every score can be traced back to skills, experience, education, and verified credentials.</p><div className="breakdown">{[['Required skills', 50], ['Preferred skills', 15], ['Experience', 15], ['Education', 5], ['Certifications', 5], ['Projects', 10]].map(([label, weight]) => <div className="breakdown-row" key={label as string}><label>{label}</label><div className="progress-line"><span style={{ width: `${weight}%` }} /></div><div className="breakdown-score">{weight} pts</div></div>)}</div></div>
    </div>
  </div>;
}

function MatchesPage() {
  const { jobs, candidates, shortlisted, toggleShortlist, activeJobId, setActiveJobId } = useApp();
  const [query, setQuery] = useState('');
  const [jobId, setJobId] = useState(activeJobId || jobs[0]?.id || '');
  const [minScore, setMinScore] = useState('0');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const job = jobs.find((item) => item.id === jobId) ?? currentJob(jobs, activeJobId);
  const ranked = useMemo(() => candidates.map((candidate) => ({ candidate, score: calculateMatchScore(candidate, job) })).filter(({ candidate, score }) => {
    const haystack = `${candidate.name} ${candidate.headline} ${candidate.location} ${candidate.skills.map((skill) => skill.name).join(' ')}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && score.total >= Number(minScore) && (!shortlistOnly || shortlisted.includes(candidate.id));
  }).sort((a, b) => b.score.total - a.score.total), [candidates, job, minScore, query, shortlistOnly, shortlisted]);
  return <div className="page"><SectionHeader eyebrow="Talent matching" title="The shortlist, with the reasoning attached." description="Ranked for the role you select. Open any profile to inspect every point." action={<Link href="/create-job" className="button button-primary" data-testid="link-matches-create-job"><Plus size={15} /> New role</Link>} />
    <div className="toolbar"><div className="search-wrap"><Search size={15} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates, skills, locations" data-testid="input-search-candidates" /></div><select className="select filter" value={jobId} onChange={(event) => { setJobId(event.target.value); setActiveJobId(event.target.value); }} data-testid="select-match-job">{jobs.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><select className="select filter" value={minScore} onChange={(event) => setMinScore(event.target.value)} data-testid="select-min-score"><option value="0">Any score</option><option value="70">70% and above</option><option value="80">80% and above</option><option value="90">90% and above</option></select><button className={`button ${shortlistOnly ? 'button-accent' : 'button-secondary'}`} onClick={() => setShortlistOnly(!shortlistOnly)} data-testid="button-filter-shortlisted"><Filter size={14} /> Shortlisted {shortlistOnly ? 'only' : ''}</button></div>
    {ranked.length === 0 ? <div className="card"><EmptyState icon={<Search size={22} />} title={shortlistOnly ? 'Your shortlist is empty' : 'No matches found'} message={shortlistOnly ? 'Save candidates from this list to see them here.' : 'Try a broader search or lower the score filter.'} action={<button className="button button-secondary" onClick={() => { setQuery(''); setMinScore('0'); setShortlistOnly(false); }} data-testid="button-clear-filters">Clear filters</button>} /></div> : ranked.map(({ candidate, score }, index) => <div className="card match-card" key={candidate.id} data-testid={`card-match-${candidate.id}`}><div><div className="candidate-id"><div className="candidate-initial">{initials(candidate.name)}</div><div><Link className="candidate-name" href={`/candidate/${candidate.id}`} data-testid={`link-candidate-${candidate.id}`}>{candidate.name}</Link><div className="candidate-meta">{candidate.headline} · {candidate.location} · {candidate.experienceYears} years</div></div></div><div className="skill-list">{candidate.skills.slice(0, 4).map((skill) => <span className="skill-tag" key={skill.name}>{skill.name}</span>)}<span className="skill-tag">#{index + 1} ranked</span></div></div><ScoreCard score={score} /><div className="match-actions"><Link className="button button-secondary" href={`/candidate/${candidate.id}`} data-testid={`link-review-${candidate.id}`}>Review profile</Link><button className={`button ${shortlisted.includes(candidate.id) ? 'button-accent' : 'button-secondary'}`} onClick={() => toggleShortlist(candidate.id)} data-testid={`button-shortlist-${candidate.id}`}>{shortlisted.includes(candidate.id) ? <Check size={14} /> : <Plus size={14} />} {shortlisted.includes(candidate.id) ? 'Shortlisted' : 'Shortlist'}</button></div></div>)}
  </div>;
}

function CandidatePage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { candidates, jobs, shortlisted, toggleShortlist, activeJobId } = useApp();
  const candidate = candidates.find((item) => item.id === candidateId);
  const job = currentJob(jobs, activeJobId);
  if (!candidate) return <div className="page"><EmptyState icon={<UserRound size={22} />} title="Candidate not found" message="This profile may have been removed from the shortlist." action={<Link className="button button-secondary" href="/matches" data-testid="link-back-matches">Back to matches</Link>} /></div>;
  const score = calculateMatchScore(candidate, job);
  return <div className="page"><div style={{ marginBottom: 20 }}><Link href="/matches" className="button button-ghost" data-testid="link-back-to-matches"><ArrowLeft size={14} /> Back to matches</Link></div><div className="card profile-hero"><div className="profile-hero-main"><div className="profile-avatar">{initials(candidate.name)}</div><div><h1>{candidate.name}</h1><p>{candidate.headline} · {candidate.location}</p><p>{candidate.experienceYears} years experience · {candidate.education}</p></div></div><button className={`button ${shortlisted.includes(candidate.id) ? 'button-accent' : 'button-primary'}`} onClick={() => toggleShortlist(candidate.id)} data-testid="button-profile-shortlist">{shortlisted.includes(candidate.id) ? <Check size={14} /> : <Plus size={14} />} {shortlisted.includes(candidate.id) ? 'Shortlisted' : 'Add to shortlist'}</button></div><div className="detail-grid"><div><section className="card detail-card"><h2>About {candidate.name.split(' ')[0]}</h2><p className="bio">{candidate.bio}</p></section><section className="card detail-card"><h2>Selected projects</h2>{candidate.projects.length ? candidate.projects.map((project) => <div className="project" key={project.title}><div className="project-title"><span>{project.title}</span><span className="skill-list" style={{ margin: 0 }}>{project.technologies.slice(0, 3).map((technology) => <span className="skill-tag" key={technology}>{technology}</span>)}</span></div><p>{project.description}</p>{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer" data-testid={`link-project-${project.title}`}>View project <ExternalLink size={11} style={{ verticalAlign: 'middle' }} /></a>}</div>) : <EmptyState icon={<Github size={20} />} title="No projects listed" message="This candidate has not added project evidence yet." />}</section></div><div><section className="card detail-card"><div className="section-title"><h2>Match for {job.title}</h2><span className="pill pill-green">{score.total}%</span></div><ScoreBreakdown score={score} /></section><section className="card detail-card"><h2>Skills</h2><div className="skill-list">{candidate.skills.map((skill) => <span className="skill-tag" key={skill.name}>{skill.name} · {skill.proficiency}{skill.verified ? ' · verified' : ''}</span>)}</div></section><section className="card detail-card"><h2>Credentials</h2>{candidate.certifications.length ? candidate.certifications.map((cert) => <div className="job-row" key={cert.credentialId}><div><div className="job-title">{cert.name}</div><div className="job-meta">{cert.issuer} · {cert.issueDate}</div></div>{cert.verified && <ShieldCheck size={17} color="#287e70" />}</div>) : <p className="bio">No credentials added.</p>}</section></div></div></div>;
}

function CreateJobPage() {
  const { addJob, notify, setActiveJobId } = useApp();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', company: 'Northstar Labs', description: '', location: 'Remote, India', workMode: 'remote' as Job['workMode'], employmentType: 'full-time' as Job['employmentType'], minExperience: 2, maxExperience: 8, education: 'any' as Job['education'], salaryMin: 1400000, salaryMax: 2200000 });
  const [skills, setSkills] = useState([{ name: '', importance: 'required' as 'required' | 'preferred' }]);
  const update = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const canContinue = step === 1 ? !!form.title.trim() && !!form.company.trim() : step === 2 ? !!form.description.trim() && !!form.location.trim() && form.minExperience >= 0 && form.maxExperience >= form.minExperience && form.salaryMin >= 0 && form.salaryMax >= form.salaryMin : skills.some((skill) => skill.name.trim());
  const addSkill = () => setSkills([...skills, { name: '', importance: 'preferred' }]);
  const complete = () => { const job: Job = { id: `job-${Date.now()}`, ...form, skills: skills.filter((skill) => skill.name.trim()).map((skill) => ({ name: skill.name.trim(), importance: skill.importance })), status: 'active' }; addJob(job); setActiveJobId(job.id); notify('Role published. Candidates are ready to compare.'); setLocation('/matches'); };
  return (
    <div className="page">
      <div className="wizard">
        <SectionHeader
          eyebrow="Role builder"
          title="Write the brief your candidates can trust."
          description="A good score starts with requirements that are explicit and weighted."
        />
        <div className="stepper">
          {["Role basics", "Working details", "Requirements", "Review"].map(
            (label, index) => (
              <div className="step-wrap" style={{ display: "contents" }} key={label}>
                <div
                  className={`step ${step === index + 1 ? "active" : step > index + 1 ? "done" : ""}`}
                >
                  <span className="step-num">
                    {step > index + 1 ? <Check size={12} /> : index + 1}
                  </span>
                  <span>{label}</span>
                </div>
                {index < 3 && <div className="step-line" />}
              </div>
            ),
          )}
        </div>
        <div className="card form-card">
          {step === 1 && (
            <>
              <h2>Start with the role</h2>
              <p>These details anchor the candidate comparison.</p>
              <div className="form-grid">
                <Field
                  label="Role title"
                  value={form.title}
                  placeholder="e.g. Product Designer"
                  onChange={(value) => update("title", value)}
                  testId="input-job-title"
                />
                <Field
                  label="Company"
                  value={form.company}
                  placeholder="Company name"
                  onChange={(value) => update("company", value)}
                  testId="input-job-company"
                />
                <Field
                  label="Role summary"
                  value={form.description}
                  placeholder="What will this person own?"
                  onChange={(value) => update("description", value)}
                  testId="textarea-job-description"
                  textarea
                  full
                />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Set the context</h2>
              <p>Give people a realistic view of how, where, and at what range they will work.</p>
              <div className="form-grid">
                <Field
                  label="Location"
                  value={form.location}
                  placeholder="City or region"
                  onChange={(value) => update("location", value)}
                  testId="input-job-location"
                />
                <SelectField
                  label="Work mode"
                  value={form.workMode}
                  onChange={(value) => update("workMode", value)}
                  options={["remote", "hybrid", "onsite"]}
                  testId="select-work-mode"
                />
                <SelectField
                  label="Employment type"
                  value={form.employmentType}
                  onChange={(value) => update("employmentType", value)}
                  options={["full-time", "part-time", "internship", "contract"]}
                  testId="select-employment-type"
                />
                <SelectField
                  label="Education"
                  value={form.education}
                  onChange={(value) => update("education", value)}
                  options={["any", "diploma", "bachelors", "masters", "phd"]}
                  testId="select-education"
                />
                <Field
                  label="Minimum experience (years)"
                  value={String(form.minExperience)}
                  onChange={(value) => update("minExperience", Number(value))}
                  testId="input-min-experience"
                  type="number"
                />
                <Field
                  label="Maximum experience (years)"
                  value={String(form.maxExperience)}
                  onChange={(value) => update("maxExperience", Number(value))}
                  testId="input-max-experience"
                  type="number"
                />
                <Field
                  label="Minimum annual salary (INR)"
                  value={String(form.salaryMin)}
                  onChange={(value) => update("salaryMin", Number(value))}
                  testId="input-salary-min"
                  type="number"
                />
                <Field
                  label="Maximum annual salary (INR)"
                  value={String(form.salaryMax)}
                  onChange={(value) => update("salaryMax", Number(value))}
                  testId="input-salary-max"
                  type="number"
                />
              </div>
              {(form.maxExperience < form.minExperience ||
                form.salaryMax < form.salaryMin) && (
                <p className="field-note" role="alert">
                  Maximum values must be at least as high as minimum values.
                </p>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h2>Make requirements explicit</h2>
              <p>Required skills shape the score more than preferred skills.</p>
              <div className="skill-editor">
                {skills.map((skill, index) => (
                  <div className="skill-editor-row" key={index}>
                    <input
                      className="input"
                      value={skill.name}
                      placeholder="Skill name, e.g. Figma"
                      onChange={(event) =>
                        setSkills(
                          skills.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      data-testid={`input-job-skill-${index}`}
                    />
                    <select
                      className="select"
                      value={skill.importance}
                      onChange={(event) =>
                        setSkills(
                          skills.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  importance: event.target.value as
                                    | "required"
                                    | "preferred",
                                }
                              : item,
                          ),
                        )
                      }
                      data-testid={`select-job-skill-importance-${index}`}
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                    </select>
                    <button
                      className="button button-ghost"
                      onClick={() =>
                        skills.length > 1 &&
                        setSkills(skills.filter((_, itemIndex) => itemIndex !== index))
                      }
                      data-testid={`button-remove-job-skill-${index}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  className="button button-secondary"
                  style={{ width: "fit-content" }}
                  onClick={addSkill}
                  data-testid="button-add-job-skill"
                >
                  <Plus size={14} /> Add skill
                </button>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2>Review and publish</h2>
              <p>Here is what candidates will see in your role brief.</p>
              <div className="goal-card" style={{ marginBottom: 13 }}>
                <div>
                  <h3>{form.title || "Untitled role"}</h3>
                  <p>
                    {form.company} · {form.location} · {form.workMode} ·{" "}
                    {form.employmentType}
                  </p>
                  <p>
                    ₹{form.salaryMin.toLocaleString("en-IN")}–₹
                    {form.salaryMax.toLocaleString("en-IN")} per year
                  </p>
                </div>
                <span className="pill pill-green">Ready to publish</span>
              </div>
              <p className="bio" style={{ marginBottom: 15 }}>
                {form.description || "No role summary added."}
              </p>
              <div className="skill-list">
                {skills
                  .filter((skill) => skill.name.trim())
                  .map((skill) => (
                    <span
                      className={`pill ${skill.importance === "required" ? "pill-green" : "pill-slate"}`}
                      key={skill.name}
                    >
                      {skill.name} · {skill.importance}
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>
        <div className="form-footer">
          <button
            className="button button-ghost"
            onClick={() =>
              step === 1 ? setLocation("/recruiter") : setStep(step - 1)
            }
            data-testid="button-wizard-back"
          >
            {step === 1 ? "Cancel" : <><ArrowLeft size={14} /> Back</>}
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
              <Check size={14} /> Publish role
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onChange, testId, textarea = false, full = false, type = 'text' }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void; testId: string; textarea?: boolean; full?: boolean; type?: string }) {
  return <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>{textarea ? <textarea className="textarea" rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} data-testid={testId} /> : <input className="input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} data-testid={testId} />}</div>;
}
function SelectField({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (value: string) => void; options: string[]; testId: string }) {
  return <div className="field"><label>{label}</label><select className="select" value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId}>{options.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></div>;
}

function LearnerPage() {
  const { jobs, activeJobId } = useApp();
  const job = currentJob(jobs, activeJobId);
  const score = calculateMatchScore(currentLearner, job);
  const verifiedCount = currentLearner.skills.filter((skill) => skill.verified).length;
  return <div className="page"><SectionHeader eyebrow="Learner overview" title={`Keep moving, ${currentLearner.name.split(' ')[0]}.`} description="A clear view of what you know, what is next, and why it matters." action={<Link href="/skill-gap" className="button button-accent" data-testid="link-learner-skill-gap"><Target size={14} /> View skill gaps</Link>} /><div className="learner-hero"><div><div className="eyebrow" style={{ color: '#a9baC9' }}>Your target role</div><h1>{job.title}</h1><p>{job.company} · {job.location} · Match calculated from {job.skills.length} skills</p></div><div className="hero-score"><strong>{score.total}%</strong><span>current match</span></div></div><div className="grid-2"><div><section className="card section-card"><div className="section-title"><h2>Next best action</h2><span>12 min read</span></div><div className="goal-card" style={{ padding: 0 }}><div><h3>Strengthen {score.components.find((component) => component.score < component.max)?.label ?? 'your next skill'}</h3><p>One focused improvement can move your target-role score forward.</p></div><Link href="/learning-path" className="button button-primary" data-testid="link-start-learning">Open path <ArrowRight size={14} /></Link></div></section><section className="card section-card" style={{ marginTop: 17 }}><div className="section-title"><h2>Evidence at a glance</h2><Link href="/credentials" className="button button-ghost" data-testid="link-view-credentials">View credentials</Link></div><div className="stat-grid" style={{ margin: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}><div><div className="eyebrow">Skills</div><div className="stat-value" data-testid="text-learner-skills">{currentLearner.skills.length}</div></div><div><div className="eyebrow">Verified</div><div className="stat-value" data-testid="text-verified-skills">{verifiedCount}</div></div><div><div className="eyebrow">Projects</div><div className="stat-value" data-testid="text-learner-projects">{currentLearner.projects.length}</div></div></div></section></div><section className="card section-card"><div className="section-title"><h2>Match breakdown</h2><span>{job.title}</span></div><ScoreBreakdown score={score} compact /><Link href="/skill-gap" className="button button-secondary" style={{ marginTop: 22, width: '100%' }} data-testid="link-explain-score">Explain this score <ArrowRight size={14} /></Link></section></div></div>;
}

function SkillGapPage() {
  const { jobs, activeJobId, setActiveJobId } = useApp();
  const job = currentJob(jobs, activeJobId);
  const score = calculateMatchScore(currentLearner, job);
  const gaps = job.skills.filter((required) => { const found = currentLearner.skills.find((skill) => skill.name.toLowerCase() === required.name.toLowerCase()); return !found || (required.importance === 'required' && found.proficiency === 'beginner'); });
  return <div className="page"><SectionHeader eyebrow="Skill gaps" title="Know what to work on next." description="Gaps are calculated from the same transparent score recruiters see." action={<select className="select filter" value={job.id} onChange={(event) => setActiveJobId(event.target.value)} data-testid="select-gap-role">{jobs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>} /><div className="detail-grid"><section className="card detail-card"><div className="section-title"><h2>Your score for {job.title}</h2><span className="pill pill-green">{score.total}% match</span></div><ScoreBreakdown score={score} /><div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #edf0f3' }}><div className="eyebrow">What this means</div><p className="bio" style={{ marginTop: 7 }}>This score is not a prediction. It is a weighted comparison of your current evidence against the requirements in this role brief.</p></div></section><section className="card detail-card"><div className="section-title"><h2>Priority gaps</h2><span>{gaps.length} to address</span></div>{gaps.length ? gaps.map((gap) => <div className="job-row" key={gap.name}><div><div className="job-title">{gap.name}</div><div className="job-meta">{gap.importance === 'required' ? 'Required for this role' : 'Preferred for this role'}</div></div><Link href="/learning-path" className="button button-secondary" data-testid={`link-learn-${gap.name}`}>Learn <ArrowRight size={13} /></Link></div>) : <EmptyState icon={<CheckCircle2 size={22} />} title="No priority gaps" message="Your evidence covers every skill in this role brief." />}</section></div></div>;
}

function LearningPathPage() {
  const { jobs, activeJobId } = useApp();
  const job = currentJob(jobs, activeJobId);
  const [completed, setCompleted] = useState<string[]>(() => JSON.parse(localStorage.getItem('hireready-learning') ?? '[]'));
  const lessons = ['Advanced component systems', 'Accessible interaction patterns', 'Ship a portfolio case study'];
  const toggle = (lesson: string) => { const next = completed.includes(lesson) ? completed.filter((item) => item !== lesson) : [...completed, lesson]; setCompleted(next); localStorage.setItem('hireready-learning', JSON.stringify(next)); };
  return <div className="page"><SectionHeader eyebrow="Learning path" title="A small plan for a specific outcome." description={`Built around the gaps for ${job.title}. Complete a lesson and keep the evidence.`} action={<Link href="/skill-gap" className="button button-secondary" data-testid="link-learning-back"><ArrowLeft size={14} /> Back to gaps</Link>} /><div className="card section-card"><div className="section-title"><h2>Recommended sequence</h2><span>{completed.length}/{lessons.length} complete</span></div><div className="path-list">{lessons.map((lesson, index) => <div className="path-item" key={lesson} data-testid={`row-learning-${index}`}><div className="path-index">{completed.includes(lesson) ? <Check size={13} /> : index + 1}</div><div><strong>{lesson}</strong><p>{index === 0 ? 'Build stronger depth in your core toolkit.' : index === 1 ? 'Turn knowledge into verifiable working practice.' : 'Document evidence a recruiter can inspect.'}</p></div><button className={`button ${completed.includes(lesson) ? 'button-accent' : 'button-secondary'}`} onClick={() => toggle(lesson)} data-testid={`button-complete-learning-${index}`}>{completed.includes(lesson) ? 'Completed' : 'Mark complete'}</button></div>)}</div></div></div>;
}

function CredentialsPage() {
  const certifications = currentLearner.certifications;
  return <div className="page"><SectionHeader eyebrow="Credentials" title="Proof you can take with you." description="Sample credential records with a visible SHA-256 integrity check." action={<span className="pill pill-slate">Seeded demo data</span>} /><div style={{ display: 'grid', gap: 11 }}>{certifications.map((credential) => <div className="card credential-card" key={credential.credentialId} data-testid={`card-credential-${credential.credentialId}`}><div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><div className="credential-icon"><FileCheck2 size={19} /></div><div><h3>{credential.name}</h3><p>{credential.issuer} · Issued {credential.issueDate}</p></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className={`pill ${credential.verified ? 'pill-green' : 'pill-amber'}`}>{credential.verified ? 'Seeded record' : 'Pending'}</span><Link href={`/verify/${credential.credentialId}`} className="button button-secondary" data-testid={`link-verify-${credential.credentialId}`}>View proof <ChevronRight size={14} /></Link></div></div>)}</div>{certifications.length === 0 && <div className="card"><EmptyState icon={<Award size={22} />} title="No credentials yet" message="Complete a learning path to start building your evidence." action={<Link href="/learning-path" className="button button-accent" data-testid="link-credentials-learning">View learning path</Link>} /></div>}</div>;
}

async function calculateCredentialFingerprint(
  credential: Candidate["certifications"][number],
  recipient: string,
): Promise<string> {
  const payload = [
    credential.credentialId,
    credential.name,
    credential.issuer,
    credential.issueDate,
    recipient,
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function VerifyPage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const credential = currentLearner.certifications.find((item) => item.credentialId === credentialId);
  if (!credential) return <div className="page"><EmptyState icon={<ShieldCheck size={22} />} title="Credential not found" message="Check the credential ID and try again." action={<Link href="/credentials" className="button button-secondary" data-testid="link-back-credentials">Back to credentials</Link>} /></div>;
  return <VerifyCredentialDetails credential={credential} />;
}

function VerifyCredentialDetails({
  credential,
}: {
  credential: Candidate["certifications"][number];
}) {
  const [hashState, setHashState] = useState<"checking" | "valid" | "invalid">(
    "checking",
  );

  useEffect(() => {
    let mounted = true;
    calculateCredentialFingerprint(credential, currentLearner.name)
      .then((fingerprint) => {
        if (mounted) {
          setHashState(
            fingerprint === credential.verificationHash ? "valid" : "invalid",
          );
        }
      })
      .catch(() => {
        if (mounted) setHashState("invalid");
      });
    return () => {
      mounted = false;
    };
  }, [credential]);

  const statusText =
    hashState === "valid"
      ? "Demo fingerprint matches"
      : hashState === "checking"
        ? "Checking fingerprint…"
        : "Fingerprint could not be verified";

  return (
    <div className="page">
      <div style={{ maxWidth: 780, margin: "20px auto" }}>
        <Link
          href="/credentials"
          className="button button-ghost"
          data-testid="link-back-from-verify"
        >
          <ArrowLeft size={14} /> Credentials
        </Link>
        <section className="card detail-card" style={{ marginTop: 15 }}>
          <div className="verify-banner" role="status">
            <ShieldCheck size={21} />
            <div>
              <strong>{statusText}</strong>
              <p>
                This demo recalculates SHA-256 from the seeded credential details.
                It does not contact the issuer.
              </p>
            </div>
          </div>
          <div className="eyebrow">Verification detail</div>
          <h1 style={{ fontSize: 30, letterSpacing: "-.05em", margin: "7px 0" }}>
            {credential.name}
          </h1>
          <p className="bio">
            {credential.issuer} · Issued {credential.issueDate}
          </p>
          <div style={{ marginTop: 27, display: "grid", gap: 17 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Recipient</div>
              <strong data-testid="text-credential-recipient">
                {currentLearner.name}
              </strong>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Credential ID</div>
              <div className="hash-box" data-testid="text-credential-id">
                {credential.credentialId}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                SHA-256 fingerprint
              </div>
              <div className="hash-box" data-testid="text-verification-hash">
                {credential.verificationHash}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return <div className="empty" data-testid="empty-state">{icon}<h3>{title}</h3><p>{message}</p>{action}</div>;
}

function Home() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/recruiter'); }, [setLocation]);
  return null;
}
function NotFoundPage() {
  return <div className="page"><EmptyState icon={<CircleHelp size={23} />} title="That page is not here" message="Use the workspace navigation to continue." action={<Link className="button button-primary" href="/recruiter" data-testid="link-not-found-home">Go to overview</Link>} /></div>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Home} /><Route path="/recruiter" component={RecruiterDashboard} /><Route path="/create-job" component={CreateJobPage} /><Route path="/matches" component={MatchesPage} /><Route path="/candidate/:candidateId" component={CandidatePage} /><Route path="/learner" component={LearnerPage} /><Route path="/skill-gap" component={SkillGapPage} /><Route path="/learning-path" component={LearningPathPage} /><Route path="/credentials" component={CredentialsPage} /><Route path="/verify/:credentialId" component={VerifyPage} /><Route component={NotFoundPage} /></Switch></Shell></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);
  const [shortlisted, setShortlisted] = useState<string[]>(() => readStoredArray<string>('hireready-shortlist'));
  const [activeJobId, setActiveJobIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('hireready-active-job') ?? seedJobs[0]?.id ?? '';
    } catch {
      return seedJobs[0]?.id ?? '';
    }
  });
  const [role, setRole] = useState<'recruiter' | 'learner'>('recruiter');
  const [notice, setNotice] = useState('');
  const addJob = (job: Job) => { setJobs((current) => { const next = [...current, job]; localStorage.setItem('hireready-jobs', JSON.stringify(next.filter((item) => !seedJobs.some((seed) => seed.id === item.id)))); return next; }); };
  const setActiveJobId = (id: string) => {
    setActiveJobIdState(id);
    try {
      localStorage.setItem('hireready-active-job', id);
    } catch {
      // The current app session still works when browser storage is unavailable.
    }
  };
  const toggleShortlist = (id: string) => setShortlisted((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; localStorage.setItem('hireready-shortlist', JSON.stringify(next)); return next; });
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3000); };
  const value = useMemo(() => ({ jobs, candidates: seedCandidates, shortlisted, activeJobId, addJob, setActiveJobId, toggleShortlist, notify, role, setRole }), [jobs, shortlisted, activeJobId, role]);
  return <AppContext.Provider value={value}><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster />{notice && <div className="toast-note" data-testid="status-toast">{notice}</div>}</TooltipProvider></QueryClientProvider></AppContext.Provider>;
}
export default App;