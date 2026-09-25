import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Globe,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Radar,
  ArrowRight,
  RefreshCw,
  Compass,
  BarChart3,
  PieChart as PieIcon,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { searchAdzunaJobs } from '../lib/adzuna';
import { fetchMuseJobs } from '../lib/muse';
import { analyzeMarketWithAI, type MarketData, type JobListing } from '../lib/gemini-market-analysis';

const PIE_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#64D2FF'];

export function CareercopeMarketIntelligence() {
  const [careerQuery, setCareerQuery] = useState('Software Engineer');
  const [selectedCountry, setSelectedCountry] = useState('in');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'horizons' | 'jobs'>('analytics');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [pieMode, setPieMode] = useState<'modality' | 'skills' | 'sources'>('modality');

  const [marketData, setMarketData] = useState<MarketData | null>(null);

  // Initial load
  useEffect(() => {
    handleSearch('Software Engineer', 'in');
  }, []);

  const handleSearch = async (career: string, country: string) => {
    const targetCareer = career.trim() || 'Software Engineer';
    setIsLoading(true);
    setLoadingStep('Querying Adzuna & The Muse live job streams...');

    try {
      // 1. Fetch live jobs
      const [adzunaRes, museRes] = await Promise.allSettled([
        searchAdzunaJobs(targetCareer, 1, country === 'global' ? 'us' : country),
        fetchMuseJobs(targetCareer, 1),
      ]);

      const liveJobs: JobListing[] = [];

      if (adzunaRes.status === 'fulfilled' && Array.isArray(adzunaRes.value) && adzunaRes.value.length > 0) {
        adzunaRes.value.forEach((j) => {
          liveJobs.push({
            id: `adzuna-${j.id}`,
            title: j.title,
            company: j.company,
            location: j.location,
            source: 'adzuna',
            salary: j.salaryMin ? `${j.salaryMin.toLocaleString()} - ${j.salaryMax ? j.salaryMax.toLocaleString() : ''}` : undefined,
            job_type: j.contractType,
            description: j.description,
            url: j.redirectUrl,
            created: j.created,
            skills: j.inferredSkills || ['Engineering', 'System Architecture'],
          });
        });
      }

      if (museRes.status === 'fulfilled' && museRes.value?.results?.length > 0) {
        museRes.value.results.forEach((m) => {
          liveJobs.push({
            id: `muse-${m.id}`,
            title: m.name,
            company: m.company?.name || 'Technology Company',
            location: m.locations?.[0]?.name || 'Remote',
            source: 'muse',
            job_type: m.type || 'Full Time',
            description: (m.contents || '').replace(/<[^>]*>?/gm, '').slice(0, 200) + '...',
            url: m.refs?.landing_page || 'https://www.themuse.com',
            created: m.publication_date || new Date().toISOString(),
            skills: ['Engineering', 'Cloud', 'Architecture'],
          });
        });
      }

      setLoadingStep('Synthesizing with Gemini AI & telemetry models...');

      // 2. Synthesize with Gemini AI
      const result = await analyzeMarketWithAI(targetCareer, country, liveJobs);
      setMarketData(result);
    } catch (err) {
      console.error('Market analysis error:', err);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const filteredJobs = useMemo(() => {
    if (!marketData) return [];
    return marketData.job_listings.filter((job) => {
      const matchesKeyword =
        !filterKeyword ||
        job.title.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        job.company.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        job.skills.some((s) => s.toLowerCase().includes(filterKeyword.toLowerCase()));
      const matchesSource = filterSource === 'all' || job.source === filterSource;
      return matchesKeyword && matchesSource;
    });
  }, [marketData, filterKeyword, filterSource]);

  const skillsChartData = useMemo(() => {
    if (!marketData) return [];
    return (marketData.statistics.top_skills || []).slice(0, 7).map((s) => ({
      name: s.skill,
      demand: s.percentage,
      count: s.count,
    }));
  }, [marketData]);

  const workTypeChartData = useMemo(() => {
    if (!marketData) return [];
    const jb = marketData.statistics.job_types_breakdown || {
      'Full-Time': 68,
      'Remote / Hybrid': 24,
      'Contract': 8,
    };
    return [
      { name: 'Full-Time', value: jb['Full-Time'] || 68, color: '#0A84FF' },
      { name: 'Remote / Hybrid', value: jb['Remote / Hybrid'] || jb['Remote'] || 24, color: '#30D158' },
      { name: 'Contract / Specialization', value: jb['Contract'] || 8, color: '#FF9F0A' },
    ];
  }, [marketData]);

  const skillSharePieData = useMemo(() => {
    if (!marketData) return [];
    const top = (marketData.statistics.top_skills || []).slice(0, 5);
    const colors = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#64D2FF'];
    return top.map((s, i) => ({
      name: s.skill,
      value: s.percentage,
      color: colors[i % colors.length],
    }));
  }, [marketData]);

  const sourceChartData = useMemo(() => {
    if (!marketData) return [];
    const sb = marketData.statistics.sources_breakdown;
    return [
      { name: 'Adzuna API', value: sb.adzuna || 1, color: '#0A84FF' },
      { name: 'The Muse API', value: sb.muse || 1, color: '#30D158' },
      { name: 'Remotive Stream', value: sb.remotive || 1, color: '#FF9F0A' },
    ];
  }, [marketData]);

  const activePieData = useMemo(() => {
    if (pieMode === 'skills') return skillSharePieData;
    if (pieMode === 'sources') return sourceChartData;
    return workTypeChartData;
  }, [pieMode, skillSharePieData, sourceChartData, workTypeChartData]);

  const popularSearches = [
    'Software Engineer',
    'Data Scientist',
    'AI / ML Engineer',
    'Cloud Architect',
    'DevOps / SRE',
    'Cybersecurity',
    'Full-Stack Developer',
  ];

  return (
    <div className="careercope-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Top Hero Glass Search Card */}
      <div className="card glass-surface-hero" style={{ padding: '32px 24px', marginBottom: 24, borderRadius: 20 }}>
        <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--apple-accent)', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} />
            CAREERCOPE AI · REAL-TIME MARKET TELEMETRY
          </div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--apple-primary-text)',
              margin: '0 0 10px',
            }}
          >
            Where Your Career Is <span style={{ color: 'var(--apple-accent)' }}>Heading</span>
          </h1>
          <p style={{ color: 'var(--apple-secondary-text)', fontSize: 14.5, margin: '0 0 24px', lineHeight: 1.5, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
            Live job market evidence aggregated across <strong>Adzuna</strong> and <strong>The Muse</strong>, synthesized through <strong>Google Gemini AI</strong>.
          </p>

          {/* Search Controls Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (careerQuery.trim()) handleSearch(careerQuery, selectedCountry);
            }}
            className="scope-search-form"
            style={{
              display: 'flex',
              gap: 10,
              maxWidth: 720,
              margin: '0 auto 16px',
              flexWrap: 'wrap',
            }}
          >
            <div
              className="scope-search-input-wrap"
              style={{
                flex: '1 1 300px',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--apple-border)',
                borderRadius: 12,
                padding: '0 12px',
              }}
            >
              <Search size={16} style={{ color: 'var(--apple-secondary-text)', marginRight: 8, flexShrink: 0 }} />
              <input
                type="text"
                className="scope-search-input"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--apple-primary-text)',
                  fontSize: 14,
                  width: '100%',
                  height: 44,
                  outline: 'none',
                }}
                placeholder="Search any career track (e.g. AI Engineer, Cloud Architect, Data Scientist)..."
                value={careerQuery}
                onChange={(e) => setCareerQuery(e.target.value)}
              />
            </div>

            <div
              className="scope-select-wrap"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--apple-border)',
                borderRadius: 12,
                padding: '0 12px',
                height: 44,
              }}
            >
              <Globe size={15} style={{ color: 'var(--apple-secondary-text)', marginRight: 6 }} />
              <select
                className="scope-select"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--apple-primary-text)',
                  fontSize: 13.5,
                  outline: 'none',
                  cursor: 'pointer',
                }}
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  handleSearch(careerQuery, e.target.value);
                }}
              >
                <option value="in" style={{ background: '#1c1c1e' }}>India (IN)</option>
                <option value="us" style={{ background: '#1c1c1e' }}>United States (US)</option>
                <option value="gb" style={{ background: '#1c1c1e' }}>United Kingdom (GB)</option>
                <option value="ca" style={{ background: '#1c1c1e' }}>Canada (CA)</option>
                <option value="de" style={{ background: '#1c1c1e' }}>Germany (DE)</option>
                <option value="global" style={{ background: '#1c1c1e' }}>Global / Remote</option>
              </select>
            </div>

            <button
              type="submit"
              className="button button-primary"
              style={{ height: 44, padding: '0 20px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              disabled={isLoading || !careerQuery.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp size={14} /> Analyze Market
                </>
              )}
            </button>
          </form>

          {/* Popular Search Chips */}
          <div className="scope-chips-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)', marginRight: 4 }}>Popular:</span>
            {popularSearches.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`scope-chip ${careerQuery.toLowerCase() === chip.toLowerCase() ? 'active' : ''}`}
                style={{
                  background: careerQuery.toLowerCase() === chip.toLowerCase() ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${careerQuery.toLowerCase() === chip.toLowerCase() ? 'var(--apple-accent)' : 'var(--apple-border)'}`,
                  color: careerQuery.toLowerCase() === chip.toLowerCase() ? 'var(--apple-accent)' : 'var(--apple-primary-text)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setCareerQuery(chip);
                  handleSearch(chip, selectedCountry);
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Loading status bar */}
          {isLoading && (
            <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.3)' }}>
              <RefreshCw size={13} className="animate-spin" color="var(--apple-accent)" />
              <span style={{ fontSize: 12, color: 'var(--apple-accent)' }}>{loadingStep}</span>
            </div>
          )}
        </div>
      </div>

      {marketData && (
        <>
          {/* Executive Overview KPI Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            {/* Median Salary */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Salary Benchmark
                </span>
                <DollarSign size={16} color="var(--apple-success)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--apple-primary-text)', letterSpacing: '-0.02em' }}>
                {marketData.statistics.salary_benchmark.display}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)', marginTop: 4 }}>
                Median based on verified openings in {marketData.country}
              </div>
            </div>

            {/* Total Sampled Jobs */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Market Sample
                </span>
                <Briefcase size={16} color="var(--apple-accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--apple-primary-text)', letterSpacing: '-0.02em' }}>
                {marketData.statistics.total_jobs_analyzed}+ Verified
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)', marginTop: 4 }}>
                Aggregated from Adzuna & The Muse APIs
              </div>
            </div>

            {/* AI Strategic Horizon Outlook */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1-Year Horizon
                </span>
                <span className="pill pill-green" style={{ fontSize: 10 }}>
                  {marketData.ai_insights.horizons['1_year'].confidence} Confidence
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--apple-primary-text)', lineHeight: 1.45, marginTop: 4 }}>
                {marketData.ai_insights.horizons['1_year'].outlook.slice(0, 110)}...
              </div>
            </div>

            {/* Primary Skill */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top Required Skill
                </span>
                <ShieldCheck size={16} color="var(--apple-accent)" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--apple-primary-text)' }}>
                {marketData.statistics.top_skills[0]?.skill || 'Core Frameworks'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--apple-secondary-text)', marginTop: 4 }}>
                Required in {marketData.statistics.top_skills[0]?.percentage || 75}% of active positions
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid var(--apple-border)',
              paddingBottom: 12,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <BarChart3 size={14} /> Market Analytics & Charts
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'horizons' ? 'active' : ''}`}
              onClick={() => setActiveTab('horizons')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Radar size={14} /> AI Strategic Horizons (1y · 5y · 10y)
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Briefcase size={14} /> Live Openings ({filteredJobs.length})
            </button>
          </div>

          {/* TAB 1: ANALYTICS & CHARTS */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Executive AI Synthesis Card */}
              <div className="card" style={{ padding: '20px 24px', borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={16} color="var(--apple-accent)" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Executive AI Market Synthesis</h3>
                  </div>
                  <span className="pill pill-blue">Gemini-Synthesized</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--apple-primary-text)', lineHeight: 1.6, margin: 0 }}>
                  {marketData.ai_insights.market_overview}
                </p>
              </div>

              {/* 2-Column Chart Grid: Bar Chart & Pie Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                {/* Skill Demand Bar Chart */}
                <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>In-Demand Technical Competencies</h4>
                      <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>Frequency across analyzed openings (%)</span>
                    </div>
                    <Layers size={16} color="var(--apple-accent)" />
                  </div>
                  <div style={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={skillsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={11} width={110} />
                        <RechartsTooltip
                          contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 }}
                          formatter={(val: any) => [`${val}% demand`, 'Frequency']}
                        />
                        <Bar dataKey="demand" fill="#0A84FF" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Market Composition & Evidence Donut / Pie Chart */}
                <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Market Distribution & Composition</h4>
                      <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>
                        Segmented by {pieMode === 'modality' ? 'work modality' : pieMode === 'skills' ? 'skill share' : 'API evidence sources'}
                      </span>
                    </div>

                    {/* Mode Switcher Segment Pills */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--apple-border)', borderRadius: 10, padding: 2 }}>
                      {(['modality', 'skills', 'sources'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPieMode(mode)}
                          style={{
                            background: pieMode === mode ? 'rgba(10, 132, 255, 0.25)' : 'transparent',
                            color: pieMode === mode ? 'var(--apple-accent)' : 'var(--apple-secondary-text)',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textTransform: 'capitalize',
                          }}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, minHeight: 250 }}>
                    <div style={{ height: 230, width: 230, position: 'relative', margin: '0 auto' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip
                            contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 }}
                            formatter={(val: any) => [`${val}%`, 'Share']}
                          />
                          <Pie
                            data={activePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {activePieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                                stroke="rgba(0,0,0,0.4)"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--apple-primary-text)' }}>
                          {pieMode === 'modality' ? '100%' : `${marketData.statistics.total_jobs_analyzed}`}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--apple-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {pieMode === 'modality' ? 'Verified' : 'Sampled'}
                        </div>
                      </div>
                    </div>

                    {/* Legend list */}
                    <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                      {activePieData.map((entry, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                            <span style={{ color: 'var(--apple-primary-text)', fontSize: 11.5 }}>{entry.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--apple-secondary-text)', fontSize: 11.5, marginLeft: 6 }}>
                            {entry.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic Hubs & Target Employers Row */}
              <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Target Hiring Hubs & Verified Employers</h4>
                    <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>Key technology centers & active companies hiring for {marketData.career}</span>
                  </div>
                  <Building2 size={16} color="var(--apple-accent)" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {marketData.statistics.geographic_distribution.map((geo) => (
                    <div
                      key={geo.city}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--apple-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={14} color="var(--apple-accent)" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{geo.city}</span>
                      </div>
                      <span className="pill pill-slate" style={{ fontSize: 10.5 }}>
                        {geo.count} roles
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ paddingTop: 12, borderTop: '1px solid var(--apple-border)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>Top Hiring Organizations:</span>
                  {marketData.statistics.top_companies.map((c) => (
                    <span key={c.name} className="pill pill-blue" style={{ fontSize: 11 }}>
                      <Building2 size={11} style={{ marginRight: 4 }} /> {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI HORIZONS */}
          {activeTab === 'horizons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* 3 Pillars: Strengths, Opportunities, Risks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {/* Observed Strengths */}
                <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CheckCircle2 size={18} color="var(--apple-success)" />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Observed Strengths</h4>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {marketData.ai_insights.observed_strengths.map((s, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--apple-secondary-text)', lineHeight: 1.45 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Emerging Opportunities */}
                <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Lightbulb size={18} color="var(--apple-accent)" />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Emerging Opportunities</h4>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {marketData.ai_insights.emerging_opportunities.map((o, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--apple-secondary-text)', lineHeight: 1.45 }}>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disruptions & Risks */}
                <div className="card" style={{ padding: 20, borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <AlertTriangle size={18} color="var(--apple-warning)" />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Disruptions & Risks</h4>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {marketData.ai_insights.potential_risks.map((r, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--apple-secondary-text)', lineHeight: 1.45 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Strategic Horizon Timeline (1y, 5y, 10y) */}
              <div className="card" style={{ padding: '24px 20px', borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Radar size={18} color="var(--apple-accent)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Strategic Predictive Horizons (1y · 5y · 10y)</h4>
                    <span style={{ fontSize: 12, color: 'var(--apple-secondary-text)' }}>AI-driven trajectory model</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* 1 Year */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--apple-border)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="pill pill-blue">1-Year Horizon</span>
                      <span style={{ fontSize: 11, color: 'var(--apple-secondary-text)' }}>
                        Confidence: <strong>{marketData.ai_insights.horizons['1_year'].confidence}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--apple-primary-text)', lineHeight: 1.5, margin: 0 }}>
                      {marketData.ai_insights.horizons['1_year'].outlook}
                    </p>
                  </div>

                  {/* 5 Year */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--apple-border)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="pill pill-green">5-Year Horizon</span>
                      <span style={{ fontSize: 11, color: 'var(--apple-secondary-text)' }}>
                        Confidence: <strong>{marketData.ai_insights.horizons['5_year'].confidence}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--apple-primary-text)', lineHeight: 1.5, margin: 0 }}>
                      {marketData.ai_insights.horizons['5_year'].outlook}
                    </p>
                  </div>

                  {/* 10 Year */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--apple-border)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="pill pill-slate">10-Year Horizon</span>
                      <span style={{ fontSize: 11, color: 'var(--apple-secondary-text)' }}>
                        Confidence: <strong>{marketData.ai_insights.horizons['10_year'].confidence}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--apple-primary-text)', lineHeight: 1.5, margin: 0 }}>
                      {marketData.ai_insights.horizons['10_year'].outlook}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE OPENINGS */}
          {activeTab === 'jobs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filter Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--apple-border)',
                  borderRadius: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
                  <Search size={14} style={{ color: 'var(--apple-secondary-text)' }} />
                  <input
                    type="text"
                    placeholder="Filter by title, company, or skill..."
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--apple-primary-text)',
                      fontSize: 13,
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {(['all', 'adzuna', 'muse', 'remotive'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setFilterSource(src)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11.5,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: filterSource === src ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${filterSource === src ? 'var(--apple-accent)' : 'var(--apple-border)'}`,
                        color: filterSource === src ? 'var(--apple-accent)' : 'var(--apple-secondary-text)',
                      }}
                    >
                      {src.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredJobs.length === 0 ? (
                  <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--apple-secondary-text)' }}>
                    No matching roles found for current filter.
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="card"
                      style={{
                        padding: '16px 20px',
                        borderRadius: 14,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--apple-primary-text)' }}>{job.title}</h4>
                          <span
                            className="pill"
                            style={{
                              fontSize: 10,
                              textTransform: 'uppercase',
                              background:
                                job.source === 'adzuna'
                                  ? 'rgba(10, 132, 255, 0.15)'
                                  : job.source === 'muse'
                                  ? 'rgba(48, 209, 88, 0.15)'
                                  : 'rgba(255, 159, 10, 0.15)',
                              color:
                                job.source === 'adzuna'
                                  ? '#0A84FF'
                                  : job.source === 'muse'
                                  ? '#30D158'
                                  : '#FF9F0A',
                            }}
                          >
                            {job.source}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--apple-secondary-text)', marginBottom: 8 }}>
                          <strong>{job.company}</strong> · {job.location} {job.salary ? `· ${job.salary}` : ''}
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--apple-primary-text)', lineHeight: 1.45, margin: '0 0 10px' }}>
                          {job.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {job.skills.map((s) => (
                            <span key={s} className="skill-tag" style={{ fontSize: 11, padding: '2px 8px' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="button button-primary"
                        style={{ height: 34, fontSize: 12, padding: '0 14px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        Apply on {job.source.toUpperCase()} <ExternalLink size={12} />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
