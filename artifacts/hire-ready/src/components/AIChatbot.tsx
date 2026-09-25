import { useState, useRef, useEffect } from 'react';
import { BotAvatar } from 'bot-avatars';
import { useLocation } from 'wouter';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Target,
  ShieldCheck,
  BriefcaseBusiness,
  Radar,
  ArrowRight,
  RefreshCw,
  Minus,
  Maximize2,
  ChevronRight,
  UserCheck,
  Key,
  Settings2,
  Check,
  Zap,
} from 'lucide-react';
import type { Candidate, Job, UserRole } from '@/lib/types';
import { roleSkillGraphs, availableTargetRoles } from '@/lib/role-skill-graph';
import { generateCareerRoadmap } from '@/lib/roadmap-engine';
import { askGeminiAssistant } from '@/lib/gemini-chatbot';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  isAIModel?: boolean;
  actions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: string;
  }>;
  dataSnippet?: {
    type: 'jobs' | 'skills' | 'candidate' | 'roadmap';
    items: Array<{ title: string; subtitle?: string; badge?: string; link?: string }>;
  };
}

interface AIChatbotProps {
  jobs: Job[];
  candidates: Candidate[];
  learner: Candidate;
  role: UserRole | null;
}

export function AIChatbot({ jobs, candidates, learner, role }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [location, setLocation] = useLocation();

  // API Key management (Environment or LocalStorage)
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hireready_gemini_api_key') || envKey);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello ${learner.name.split(' ')[0]}! I'm your HireReady AI Assistant. Ask me anything about live job postings, verified career roadmaps, cryptographic SHA-256 skill proof, or candidate rankings.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Explore Target Roles', href: '/seeker/roadmap', icon: 'target' },
        { label: 'Browse Open Jobs', href: '/seeker/dashboard', icon: 'job' },
        { label: 'How Verification Works', icon: 'shield' },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    localStorage.setItem('hireready_gemini_api_key', trimmed);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowSettings(false);
    }, 1200);
  };

  const quickPrompts = [
    'What jobs are currently open?',
    'What skills do I need for Machine Learning Engineer?',
    'How does cryptographic skill verification work?',
    'How does AI candidate matching score work?',
    'Who are the top ranked candidates?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    if (apiKey) {
      try {
        const aiResult = await askGeminiAssistant(apiKey, query, messages, {
          jobs,
          candidates,
          learner,
          role,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: aiResult.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: aiResult.actions,
            dataSnippet: aiResult.dataSnippet,
            isAIModel: true,
          },
        ]);
        setIsTyping(false);
        return;
      } catch (err: any) {
        console.warn('Gemini API query failed, falling back to domain engine:', err);
        // Fall back gracefully below
      }
    }

    // Built-in Deterministic Domain Engine Fallback
    setTimeout(() => {
      const botResponse = generateBotResponse(query, { jobs, candidates, learner, role, setLocation });
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <div className="chatbot-trigger-wrapper">
          <button
            className="chatbot-trigger"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            title="Open HireReady AI Assistant"
            aria-label="Open HireReady AI Assistant"
          >
            <div className="chatbot-trigger-avatar">
              <BotAvatar type="ghost" size={36} paused={true} />
            </div>
            <div className="chatbot-trigger-info">
              <span className="chatbot-trigger-title">HireReady AI</span>
              <span className="chatbot-trigger-status">
                <span className="radar-pulse-dot" style={{ width: 6, height: 6 }} />{' '}
                {apiKey ? 'Gemini 1.5 Flash' : 'Domain Engine'}
              </span>
            </div>
            <Sparkles size={14} className="chatbot-trigger-sparkle" />
          </button>
        </div>
      )}

      {/* Floating Chat Sheet Modal */}
      {isOpen && (
        <div className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}>
          {/* Window Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-profile">
              <div className="chatbot-avatar-container">
                <BotAvatar type="ghost" size={32} paused={!isTyping} />
              </div>
              <div>
                <div className="chatbot-header-name">
                  HireReady AI{' '}
                  <span
                    className={`pill ${apiKey ? 'pill-blue' : 'pill-green'}`}
                    style={{ fontSize: 9, padding: '1px 6px' }}
                  >
                    {apiKey ? 'Gemini 1.5' : 'Domain Engine'}
                  </span>
                </div>
                <div className="chatbot-header-sub">
                  Platform Knowledge · Career Roadmaps · Live Jobs
                </div>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                className={`chatbot-icon-btn ${showSettings ? 'active' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="API Key Configuration"
              >
                <Key size={13} color={apiKey ? 'var(--apple-accent)' : 'var(--apple-secondary-text)'} />
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minus size={13} />}
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* API Key Settings Drawer */}
          {showSettings && !isMinimized && (
            <div className="chatbot-settings-drawer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--apple-primary-text)' }}>
                  Google Gemini API Key
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: 'var(--apple-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  Get free key <ExternalLink size={10} />
                </a>
              </div>
              <p style={{ fontSize: 11, color: 'var(--apple-secondary-text)', margin: '0 0 8px', lineHeight: 1.4 }}>
                Get a free key from Google AI Studio and paste it below, or add <code>VITE_GEMINI_API_KEY</code> to your environment.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password"
                  className="chatbot-input"
                  style={{ height: 32, fontSize: 11.5 }}
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <button
                  className="button button-primary"
                  style={{ height: 32, padding: '0 12px', fontSize: 11 }}
                  onClick={handleSaveApiKey}
                >
                  {savedSuccess ? <Check size={12} /> : 'Save'}
                </button>
              </div>
            </div>
          )}

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="chatbot-body">
                {/* Welcome Hero Spotlight Card with requested 96px BotAvatar */}
                {messages.length <= 2 && (
                  <div className="chatbot-welcome-card">
                    <div className="chatbot-welcome-avatar-wrapper">
                      <BotAvatar type="ghost" size={96} paused={!isTyping} />
                    </div>
                    <div className="chatbot-welcome-info">
                      <div className="chatbot-welcome-badge">
                        <Sparkles size={11} color="var(--apple-accent)" /> HireReady Neural Assistant
                      </div>
                      <h4 className="chatbot-welcome-title">How can I help you today?</h4>
                      <p className="chatbot-welcome-desc">
                        Ask about live job openings, skill requirements, cryptographic SHA-256 proofs, candidate rankings, or career roadmap milestones.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chatbot-msg-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="chatbot-bot-avatar-small">
                        <BotAvatar type="ghost" size={24} paused={true} />
                      </div>
                    )}
                    <div className={`chatbot-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                      <div className="chatbot-bubble-text">{msg.text}</div>

                      {/* Interactive Data Snippets */}
                      {msg.dataSnippet && msg.dataSnippet.items.length > 0 && (
                        <div className="chatbot-snippet-grid">
                          {msg.dataSnippet.items.map((item, idx) => (
                            <div key={idx} className="chatbot-snippet-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                <strong style={{ fontSize: 12.5, color: 'var(--apple-primary-text)' }}>{item.title}</strong>
                                {item.badge && <span className="pill pill-green" style={{ fontSize: 9.5 }}>{item.badge}</span>}
                              </div>
                              {item.subtitle && (
                                <div style={{ fontSize: 11, color: 'var(--apple-secondary-text)', marginTop: 2 }}>{item.subtitle}</div>
                              )}
                              {item.link && (
                                <button
                                  className="button button-ghost"
                                  style={{ height: 24, padding: '0 8px', fontSize: 10.5, marginTop: 6, width: 'fit-content' }}
                                  onClick={() => setLocation(item.link!)}
                                >
                                  View Details <ChevronRight size={10} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Action Navigation Pills */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="chatbot-actions-row">
                          {msg.actions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              className="chatbot-action-chip"
                              onClick={() => {
                                if (act.href) {
                                  setLocation(act.href);
                                } else if (act.onClick) {
                                  act.onClick();
                                } else if (act.label.includes('Verification')) {
                                  handleSendMessage('How does cryptographic verification work?');
                                }
                              }}
                            >
                              {act.icon === 'target' && <Target size={11} />}
                              {act.icon === 'job' && <BriefcaseBusiness size={11} />}
                              {act.icon === 'shield' && <ShieldCheck size={11} />}
                              <span>{act.label}</span>
                              {act.href && <ExternalLink size={10} style={{ opacity: 0.7 }} />}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="chatbot-time">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="chatbot-msg-row bot-row">
                    <div className="chatbot-bot-avatar-small">
                      <BotAvatar type="ghost" size={24} paused={false} />
                    </div>
                    <div className="chatbot-bubble bot-bubble chatbot-typing-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Prompts */}
              <div className="chatbot-quick-prompts">
                <div className="chatbot-quick-scroll">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="chatbot-prompt-pill"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <form
                className="chatbot-footer"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  ref={inputRef}
                  className="chatbot-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about jobs, skills, candidates, verification..."
                />
                <button
                  type="submit"
                  className="chatbot-send-btn"
                  disabled={!input.trim()}
                  aria-label="Send query"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ==========================================
// INTELLIGENT BOT QUERY RESOLUTION ENGINE
// ==========================================
function generateBotResponse(
  query: string,
  context: {
    jobs: Job[];
    candidates: Candidate[];
    learner: Candidate;
    role: UserRole | null;
    setLocation: (path: string) => void;
  }
): ChatMessage {
  const q = query.trim().toLowerCase();
  const { jobs, candidates, learner, setLocation } = context;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 0. Greetings & Casual Conversation
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'yo' ||
    q === 'sup' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q.startsWith('hey ') ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q.includes('good evening') ||
    q.includes('how are you') ||
    q.includes('who are you')
  ) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `Hello! Great to connect with you. I'm your HireReady AI Assistant.\n\nI can help you explore active job postings, check your skill readiness for target roles like Full-Stack or Data Science, explain our cryptographic SHA-256 verification system, or find top-ranked candidates. How can I assist you today?`,
      timestamp: time,
      actions: [
        { label: 'Browse Open Jobs', href: '/seeker/dashboard', icon: 'job' },
        { label: 'Check Career Roadmap', href: '/seeker/roadmap', icon: 'target' },
        { label: 'Cryptographic Proofs', href: '/seeker/credentials', icon: 'shield' },
      ],
    };
  }

  // 0.1 Gratitude & Politeness
  if (q.includes('thank') || q.includes('awesome') || q.includes('great') || q.includes('cool') || q.includes('perfect')) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `You're very welcome! Let me know if you need anything else regarding career roadmaps, job matches, or verification proof.`,
      timestamp: time,
      actions: [
        { label: 'Explore Career Tracks', href: '/seeker/roadmap', icon: 'target' },
        { label: 'View Dashboard', href: '/seeker/dashboard', icon: 'job' },
      ],
    };
  }

  // 1. Job queries
  if (q.includes('job') || q.includes('opening') || q.includes('hiring') || q.includes('role') || q.includes('vacancy') || q.includes('position') || q.includes('work') || q.includes('salary')) {
    const activeJobs = jobs.filter((j) => j.status === 'active');
    
    // Check if searching for a specific role keyword
    let matched = activeJobs;
    if (q.includes('react') || q.includes('frontend')) {
      matched = activeJobs.filter((j) => j.title.toLowerCase().includes('react') || j.skills.some((s) => s.name.toLowerCase().includes('react')));
    } else if (q.includes('data') || q.includes('ml') || q.includes('machine learning')) {
      matched = activeJobs.filter((j) => j.title.toLowerCase().includes('data') || j.title.toLowerCase().includes('learning') || j.skills.some((s) => s.name.toLowerCase().includes('python')));
    }

    if (matched.length === 0) matched = activeJobs.slice(0, 3);

    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `We currently have **${activeJobs.length} active roles** on HireReady alongside live Adzuna market listings. Here are top recommended openings:`,
      timestamp: time,
      dataSnippet: {
        type: 'jobs',
        items: matched.slice(0, 3).map((j) => ({
          title: j.title,
          subtitle: `${j.company} · ${j.location} · ₹${(j.salaryMin / 100000).toFixed(1)}L–₹${(j.salaryMax / 100000).toFixed(1)}L`,
          badge: j.workMode,
          link: '/seeker/dashboard',
        })),
      },
      actions: [
        { label: 'View All Live Market Jobs', href: '/seeker/dashboard', icon: 'job' },
        { label: 'Post a New Job Role', href: '/recruiter/create-job', icon: 'job' },
      ],
    };
  }

  // 2. Skill / Roadmap / Target Role queries
  if (
    q.includes('skill') ||
    q.includes('roadmap') ||
    q.includes('learn') ||
    q.includes('path') ||
    q.includes('data scientist') ||
    q.includes('full stack') ||
    q.includes('mlops') ||
    q.includes('prerequisite') ||
    q.includes('become')
  ) {
    const targetRole = availableTargetRoles.find((r) => q.includes(r.toLowerCase())) || learner.targetRole || 'Data Scientist';
    const graph = roleSkillGraphs[targetRole] || roleSkillGraphs['Data Scientist'];
    const roadmap = generateCareerRoadmap(learner, targetRole);

    const topSkills = graph.slice(0, 5).map((n) => `${n.skillName} (Tier ${n.tier}: ${n.expectedProficiency})`).join(', ');

    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `For the **${targetRole}** career track, your current verified readiness is **${roadmap.overallReadiness}%** (${roadmap.masteredCount}/${roadmap.totalSkillsCount} core skills verified). \n\nKey sequenced competencies include: ${topSkills}.`,
      timestamp: time,
      dataSnippet: {
        type: 'skills',
        items: roadmap.milestones.slice(0, 2).map((m) => ({
          title: `${m.title} (${m.timeframe})`,
          subtitle: m.skills.join(' · '),
          badge: `Tier ${m.tier}`,
          link: '/seeker/roadmap',
        })),
      },
      actions: [
        { label: `Open ${targetRole} Roadmap`, href: '/seeker/roadmap', icon: 'target' },
        { label: 'Upload Proof for Missing Skills', href: '/seeker/profile/upload', icon: 'shield' },
      ],
    };
  }

  // 3. Cryptographic Verification & SHA-256
  if (q.includes('verif') || q.includes('sha') || q.includes('crypto') || q.includes('proof') || q.includes('cert') || q.includes('audit')) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `HireReady uses a **3-pillar cryptographic verification system** rather than trusting plain self-reported checkboxes:\n\n1. **SHA-256 Digest**: Each uploaded cert is hashed with recipient metadata and issuer signature.\n2. **URL / Issuer Protocol**: Direct auto-verification against AWS, Coursera, Meta, and Google.\n3. **GitHub Code Evidence**: Live repository analysis extracts technologies and computes practical validation scores.`,
      timestamp: time,
      actions: [
        { label: 'Inspect Verified Credentials', href: '/seeker/credentials', icon: 'shield' },
        { label: 'Upload New Certification / File', href: '/seeker/profile/upload', icon: 'shield' },
      ],
    };
  }

  // 4. Candidate match score / AI algorithm
  if (q.includes('match') || q.includes('score') || q.includes('ranking') || q.includes('algorithm') || q.includes('ai semantic') || q.includes('two layer')) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `HireReady matches candidates using a **Two-Layer Hybrid AI Architecture**:\n\n• **Layer 1 (Deterministic Base 0-100)**: Evaluates hard requirements (mandatory skills, verified certs, minimum years of experience, and project proof).\n• **Layer 2 (Bounded AI Semantic Transferability, max +10 pts)**: Detects transferable competencies (e.g., PyTorch ↔ TensorFlow, React ↔ Vue) with full auditable justification.`,
      timestamp: time,
      actions: [
        { label: 'View Candidate AI Matches', href: '/recruiter/matches', icon: 'radar' },
        { label: 'Recruiter Dashboard Overview', href: '/recruiter/dashboard', icon: 'radar' },
      ],
    };
  }

  // 5. Candidate search / recruiter queries
  if (q.includes('candidate') || q.includes('talent') || q.includes('applicant') || q.includes('shortlist') || q.includes('who') || q.includes('people')) {
    const topCandidates = candidates.slice(0, 3);
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `There are currently **${candidates.length} verified candidates** in the applicant pool with audited GitHub profiles and SHA-256 credential digests:`,
      timestamp: time,
      dataSnippet: {
        type: 'candidate',
        items: topCandidates.map((c) => ({
          title: c.name,
          subtitle: `${c.headline} · ${c.experienceYears}y exp · ${c.skills.slice(0, 3).map((s) => s.name).join(', ')}`,
          badge: `@${c.githubUsername || 'dev'}`,
          link: `/candidate/${c.id}`,
        })),
      },
      actions: [
        { label: 'Open Candidate Ranking Portal', href: '/recruiter/matches', icon: 'radar' },
      ],
    };
  }

  // 6. Navigation / Portal help
  if (q.includes('help') || q.includes('nav') || q.includes('page') || q.includes('switch') || q.includes('portal') || q.includes('what can you do')) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `HireReady is divided into two intuitive portals:\n\n• **Job Seeker Portal**: View personalized AI roadmaps, upload verified GitHub repositories/certificates, and search live Adzuna jobs.\n• **Recruiter Portal**: Post job briefs with proficiency floors, review deterministic + AI match rankings, and analyze talent scarcity.`,
      timestamp: time,
      actions: [
        { label: 'Go to Seeker Dashboard', href: '/seeker/dashboard', icon: 'target' },
        { label: 'Go to Recruiter Dashboard', href: '/recruiter/dashboard', icon: 'radar' },
        { label: 'Upload Evidence', href: '/seeker/profile/upload', icon: 'shield' },
      ],
    };
  }

  // Default Natural Conversational Fallback
  return {
    id: `bot-${Date.now()}`,
    sender: 'bot',
    text: `I'm here to assist you with anything on HireReady!\n\nYou can ask about active job openings, skill roadmap milestones for roles like Full-Stack or Data Science, cryptographic SHA-256 certificate verification, or recruiter candidate rankings. What would you like to explore?`,
    timestamp: time,
    actions: [
      { label: 'Browse Jobs', href: '/seeker/dashboard', icon: 'job' },
      { label: 'Career Roadmaps', href: '/seeker/roadmap', icon: 'target' },
      { label: 'Cryptographic Proofs', href: '/seeker/credentials', icon: 'shield' },
    ],
  };
}
