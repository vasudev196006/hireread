import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  FileCheck2,
  Github,
  Layers,
  Lock,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

interface LandingHeroProps {
  onSelectRole: (role: UserRole) => void;
}

export function LandingHero({ onSelectRole }: LandingHeroProps) {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'seeker' | 'recruiter'>('seeker');
  const [, setLocation] = useLocation();

  const handleEnterRole = (role: UserRole) => {
    onSelectRole(role);
    setLocation(role === 'recruiter' ? '/recruiter/dashboard' : '/seeker/dashboard');
  };

  return (
    <div className="landing-root">
      {/* Top Fixed / Floating Glass Navigation Bar */}
      <header className="landing-top-nav" role="banner">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-badge">
              <ShieldCheck size={18} className="text-zinc-100" />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-title">HireReady</span>
              <span className="landing-brand-sub">Talent Intelligence</span>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Primary Navigation">
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => setActiveTab('seeker')}
            >
              For Candidates
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => setActiveTab('recruiter')}
            >
              For Recruiters
            </button>
            <Link href="/careercope" className="landing-nav-link">
              Market Intelligence
            </Link>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="button button-ghost landing-btn-sm"
              onClick={() => handleEnterRole('seeker')}
              data-testid="btn-nav-seeker"
            >
              Job Seeker Demo
            </button>
            <button
              type="button"
              className="button button-primary landing-btn-sm"
              onClick={() => handleEnterRole('recruiter')}
              data-testid="btn-nav-recruiter"
            >
              Recruiter Demo <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section (Asymmetric Split Screen) */}
      <section className="landing-hero-section" aria-label="Hero">
        <div className="landing-hero-grid">
          {/* Left Column: Focused Value Proposition & Primary CTAs */}
          <motion.div
            className="landing-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 1. Live Telemetry Eyebrow */}
            <div className="landing-hero-eyebrow">
              <span className="landing-live-dot" aria-hidden="true" />
              <span className="landing-live-text">CRYPTOGRAPHIC TALENT PLATFORM</span>
            </div>

            {/* 2. Hero Headline (Max 2 Lines Desktop) */}
            <h1 className="landing-hero-title">
              Verify skills with code. <br />
              <span className="landing-hero-title-accent">Match with explainable AI.</span>
            </h1>

            {/* 3. Hero Subtext (16 words, strict concise constraint) */}
            <p className="landing-hero-subtext">
              Bridge job seekers and hiring teams through cryptographic proofs, GitHub evidence, and transparent AI matching.
            </p>

            {/* 4. Dual Action CTAs with tactile feedback */}
            <div className="landing-hero-actions">
              <button
                type="button"
                className="button button-primary landing-hero-btn-primary"
                onClick={() => handleEnterRole('seeker')}
                data-testid="hero-cta-seeker"
              >
                <Target size={16} />
                <span>Enter Candidate Workspace</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                className="button button-secondary landing-hero-btn-secondary"
                onClick={() => handleEnterRole('recruiter')}
                data-testid="hero-cta-recruiter"
              >
                <Radar size={16} />
                <span>Enter Recruiter Portal</span>
              </button>
            </div>

            {/* 3 Key Proof Points */}
            <div className="landing-hero-proof-chips">
              <div className="landing-proof-chip">
                <CheckCircle2 size={13} className="text-zinc-300" />
                <span>SHA-256 Cryptographic Hashes</span>
              </div>
              <div className="landing-proof-chip">
                <Code2 size={13} className="text-zinc-300" />
                <span>Live GitHub Repo Inspection</span>
              </div>
              <div className="landing-proof-chip">
                <Bot size={13} className="text-zinc-300" />
                <span>Two-Layer Explainable Match</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Product Visual & Live Telemetry Glass Card */}
          <motion.div
            className="landing-hero-visual-wrap"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Interactive Mode Toggle Header on the Frame */}
            <div className="landing-interactive-frame">
              <div className="landing-frame-header">
                <div className="landing-frame-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-amber" />
                  <span className="dot dot-green" />
                </div>
                <div className="landing-frame-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'seeker'}
                    className={`landing-frame-tab ${activeTab === 'seeker' ? 'active' : ''}`}
                    onClick={() => setActiveTab('seeker')}
                  >
                    <Target size={12} /> Candidate View
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'recruiter'}
                    className={`landing-frame-tab ${activeTab === 'recruiter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recruiter')}
                  >
                    <Radar size={12} /> Recruiter View
                  </button>
                </div>
                <div className="landing-frame-meta">
                  <span className="landing-mono-status">v2.4 live</span>
                </div>
              </div>

              {/* Dynamic Visual Stage with generated hero image & contextual interactive telemetry */}
              <div className="landing-frame-stage">
                <img
                  src="/hero-intelligence.jpg"
                  alt="HireReady AI Talent Intelligence and Cryptographic Proofs Visual"
                  className="landing-stage-img"
                  loading="eager"
                />

                <div className="landing-stage-overlay" />

                {/* Floating Telemetry Glass Card 1 (Top-Right: AI Match Score) */}
                <motion.div
                  className="landing-float-chip top-chip"
                  initial={reduceMotion ? false : { y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <div className="landing-chip-row">
                    <div className="landing-score-badge">96.7%</div>
                    <div>
                      <div className="landing-chip-title">Explainable Match</div>
                      <div className="landing-chip-sub">Deterministic: 70/70 + AI: 26.7</div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Telemetry Glass Card 2 (Bottom-Left: Cryptographic Hash) */}
                <motion.div
                  className="landing-float-chip bottom-chip"
                  initial={reduceMotion ? false : { y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                >
                  <div className="landing-chip-row">
                    <div className="landing-hash-icon">
                      <Lock size={13} className="text-zinc-200" />
                    </div>
                    <div>
                      <div className="landing-chip-title">SHA-256 Digest</div>
                      <div className="landing-chip-mono">0x7a8c...d9f2 ✓ Valid</div>
                    </div>
                  </div>
                </motion.div>

                {/* Contextual Interactive Data Card (Swaps dynamically on tab change) */}
                <div className="landing-frame-bottom-drawer">
                  <AnimatePresence mode="wait">
                    {activeTab === 'seeker' ? (
                      <motion.div
                        key="seeker-drawer"
                        className="landing-drawer-inner"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="landing-drawer-left">
                          <span className="landing-drawer-tag">CAREER ROADMAP ACTIVE</span>
                          <strong className="landing-drawer-title">Senior AI & Full-Stack Track</strong>
                          <span className="landing-drawer-meta">
                            6 of 8 Competencies Mastered · 88% Role Readiness
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button button-accent landing-btn-xs"
                          onClick={() => handleEnterRole('seeker')}
                        >
                          View Roadmap <ChevronRight size={13} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="recruiter-drawer"
                        className="landing-drawer-inner"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="landing-drawer-left">
                          <span className="landing-drawer-tag">TALENT SHORTLIST ENGINE</span>
                          <strong className="landing-drawer-title">Senior ML Platform Engineer</strong>
                          <span className="landing-drawer-meta">
                            4 Candidates Ranked · Strict Bounded Semantic Layer
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button button-primary landing-btn-xs"
                          onClick={() => handleEnterRole('recruiter')}
                        >
                          Review Matches <ChevronRight size={13} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Real Logo Wall and Verification Metrics Strip (Located strictly UNDER hero) */}
        <div className="landing-trust-strip">
          <div className="landing-trust-heading">
            <span>VERIFIED STACK INTEGRATIONS & PROOF ARCHITECTURE</span>
          </div>

          <div className="landing-logo-row">
            {/* GitHub */}
            <div className="landing-tech-logo" title="GitHub Code Verification">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-label="GitHub">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </div>

            {/* TypeScript */}
            <div className="landing-tech-logo" title="TypeScript Typesafe Verification">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-label="TypeScript">
                <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zm14.85 11.235h3.045v8.265h-3.045v-8.265zm1.522-4.148c.997 0 1.777.78 1.777 1.777 0 .998-.78 1.778-1.777 1.778-.998 0-1.778-.78-1.778-1.778 0-.997.78-1.777 1.778-1.777zM4.98 13.98h3.315c.18 1.71 1.35 2.655 3.015 2.655 1.575 0 2.565-.855 2.565-2.07 0-1.26-.855-1.89-2.7-2.385l-1.395-.36c-2.385-.63-3.6-1.8-3.6-3.87 0-2.475 2.07-4.185 5.04-4.185 3.06 0 4.95 1.755 5.085 4.32h-3.24c-.18-1.26-1.035-1.935-2.07-1.935-1.215 0-1.98.675-1.98 1.665 0 1.035.72 1.575 2.25 1.98l1.485.36c2.835.72 4.005 1.935 4.005 4.23 0 2.745-2.16 4.41-5.445 4.41-3.33 0-5.265-1.755-5.325-4.785z" />
              </svg>
              <span>TypeScript</span>
            </div>

            {/* Python */}
            <div className="landing-tech-logo" title="Python Data Analysis">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-label="Python">
                <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.008 2.754h5.814v.825H3.94S0 5.766 0 11.896c0 6.13 3.443 5.92 3.443 5.92h2.056v-2.883s-.11-3.442 3.39-3.442h5.803s3.277.052 3.277-3.174V2.656S18.42 0 11.914 0zm-3.21 1.83a1.05 1.05 0 110 2.1 1.05 1.05 0 010-2.1zm3.382 22.17c6.094 0 5.714-2.656 5.714-2.656l-.008-2.754h-5.814v-.825h8.082s3.94.469 3.94-5.661c0-6.13-3.443-5.92-3.443-5.92h-2.056v2.883s.11 3.442-3.39 3.442H9.766s-3.277-.052-3.277 3.174v5.659s-.46 2.658 6.047 2.658zm3.21-1.83a1.05 1.05 0 110-2.1 1.05 1.05 0 010-2.1z" />
              </svg>
              <span>Python</span>
            </div>

            {/* SHA-256 Ledger */}
            <div className="landing-tech-logo" title="SHA-256 Cryptographic Digest">
              <Lock size={16} />
              <span>SHA-256 Ledger</span>
            </div>

            {/* Adzuna Live API */}
            <div className="landing-tech-logo" title="Adzuna Live Market Jobs API">
              <TrendingUp size={16} />
              <span>Adzuna Market</span>
            </div>
          </div>
        </div>

        {/* 2-Column Role Selection Cards */}
        <div className="landing-roles-section">
          <div className="landing-roles-grid">
            {/* Candidate Card */}
            <div
              className="landing-role-card"
              onClick={() => handleEnterRole('seeker')}
              data-testid="card-role-seeker"
            >
              <div className="landing-card-top">
                <div className="landing-role-icon">
                  <Target size={22} className="text-zinc-100" />
                </div>
                <span className="landing-pill-status">Candidate Portal</span>
              </div>

              <h2 className="landing-card-title">Job Seeker Workspace</h2>
              <p className="landing-card-desc">
                Upload cryptographic certifications, track your readiness progression, and follow explainable AI roadmap sprints with live Adzuna market vacancies.
              </p>

              <div className="landing-card-features">
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>SHA-256 certificate hashing and audit inspect</span>
                </div>
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>Topological DAG career roadmap milestones</span>
                </div>
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>Verified GitHub repository code evidence sync</span>
                </div>
              </div>

              <button
                type="button"
                className="button button-accent landing-card-btn"
              >
                Enter Candidate Portal <ArrowRight size={14} />
              </button>
            </div>

            {/* Recruiter Card */}
            <div
              className="landing-role-card"
              onClick={() => handleEnterRole('recruiter')}
              data-testid="card-role-recruiter"
            >
              <div className="landing-card-top">
                <div className="landing-role-icon">
                  <Radar size={22} className="text-zinc-100" />
                </div>
                <span className="landing-pill-status">Employer Portal</span>
              </div>

              <h2 className="landing-card-title">Recruiter Intelligence</h2>
              <p className="landing-card-desc">
                Define required skills with strict proficiency floors, audit candidate GitHub repositories, and review calibrated hybrid match scores.
              </p>

              <div className="landing-card-features">
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>70-point deterministic base + bounded AI bonus</span>
                </div>
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>One-click GitHub code inspection deep links</span>
                </div>
                <div className="landing-feature-row">
                  <CheckCircle2 size={15} className="text-zinc-300" />
                  <span>Zero-hallucination candidate match breakdown</span>
                </div>
              </div>

              <button
                type="button"
                className="button button-primary landing-card-btn"
              >
                Enter Recruiter Portal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
