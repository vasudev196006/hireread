import type { Candidate, Job, UserRole } from '@/lib/types';
import type { ChatMessage } from '@/components/AIChatbot';

interface GeminiContext {
  jobs: Job[];
  candidates: Candidate[];
  learner: Candidate;
  role: UserRole | null;
}

export async function askGeminiAssistant(
  apiKey: string | undefined,
  userQuery: string,
  history: ChatMessage[],
  context: GeminiContext
): Promise<{ text: string; actions?: ChatMessage['actions']; dataSnippet?: ChatMessage['dataSnippet']; isAI: boolean }> {
  const { jobs, candidates, learner, role } = context;
  const key = (apiKey || '').trim();

  // Build condensed website grounding context
  const jobsSummary = jobs
    .slice(0, 8)
    .map(
      (j) =>
        `- "${j.title}" at ${j.company} (${j.location}, ₹${(j.salaryMin / 100000).toFixed(1)}L–₹${(j.salaryMax / 100000).toFixed(1)}L). Skills: ${j.requiredSkills.map((s) => s.name).join(', ')}`
    )
    .join('\n');

  const candidatesSummary = candidates
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.name} (${c.headline}, ${c.experienceYears}y exp, GitHub: @${c.githubUsername || 'dev'}). Verified skills: ${c.skills.map((s) => s.name).join(', ')}`
    )
    .join('\n');

  const learnerSummary = `Logged-in User: ${learner.name} (${learner.headline}, target role: ${learner.targetRole || 'Full-Stack Developer'}). Verified skills: ${learner.skills.filter((s) => s.verified).map((s) => s.name).join(', ')}. Certifications: ${learner.certifications.map((c) => `${c.name} (${c.issuer})`).join(', ')}.`;

  const systemInstruction = `You are HireReady AI, a smart, knowledgeable, and articulate AI advisor for the HireReady platform and tech careers.

Platform Overview:
- HireReady is a verified talent intelligence platform with cryptographic SHA-256 certificate verification (audited against issuers and GitHub repo code analysis).
- Features a Two-Layer AI Candidate Matching algorithm (Deterministic hard requirements + Bounded semantic transferability).
- Features topological learning roadmaps with skill sequencing and readiness scores.
- Two distinct portals: Job Seeker (roadmaps, uploads, job applications) and Recruiter (talent scarcity radar, match matrix, job postings).

Platform Live Telemetry:
- User Role: ${role || 'Job Seeker'}
- ${learnerSummary}
- Active Jobs:
${jobsSummary}
- Top Verified Candidates:
${candidatesSummary}

Behavior & Response Guidelines:
1. Answer the user's question directly, intelligently, and conversationally. If they ask about career viability (e.g., "is data scientist a good role?"), give a comprehensive, nuanced, and realistic industry breakdown (market demand, salary prospects, pros/cons, evolving skills like LLMOps/Generative AI).
2. Ground your answers in tech industry reality and platform context where applicable.
3. Be friendly, articulate, and direct. Use clean markdown (bolding, lists) to format your response clearly.
4. Keep answers engaging and helpful without sounding robotic.`;

  const messagesPayload = [
    { role: 'system', content: systemInstruction },
    ...history
      .filter((m) => m.id !== 'welcome-1')
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
    { role: 'user', content: userQuery },
  ];

  let textResult = '';

  // 1. Google Gemini API (if user provided a valid Gemini AI Studio key starting with AIzaSy)
  if (key && key.startsWith('AIzaSy')) {
    try {
      const contents = history
        .filter((m) => m.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nUser Question: ${userQuery}` }],
      });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch {
      // Fall through to next provider
    }
  }

  // 2. OpenRouter or standard OpenAI endpoints (if key starts with sk-)
  if (!textResult && key && key.startsWith('sk-')) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://hireready.app',
          'X-Title': 'HireReady AI',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: messagesPayload,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        textResult = data.choices?.[0]?.message?.content || '';
      }
    } catch {
      // Fall through
    }
  }

  // 3. Free Live Serverless AI Inference (Free zero-key LLM for unrestricted queries)
  if (!textResult) {
    try {
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          model: 'openai',
          temperature: 0.7,
          jsonMode: false,
        }),
      });

      if (response.ok) {
        textResult = await response.text();
      }
    } catch {
      // Fall through to local knowledge engine
    }
  }

  // If live LLM returned text, parse and return
  if (textResult && textResult.trim().length > 10) {
    const qLower = userQuery.toLowerCase();
    const actions: ChatMessage['actions'] = [];

    if (qLower.includes('job') || qLower.includes('role') || qLower.includes('hiring') || qLower.includes('work') || qLower.includes('salary')) {
      actions.push({ label: 'Explore Open Jobs', href: '/seeker/dashboard', icon: 'job' });
    }
    if (qLower.includes('skill') || qLower.includes('roadmap') || qLower.includes('learn') || qLower.includes('data scientist') || qLower.includes('growth')) {
      actions.push({ label: 'View Career Roadmap', href: '/seeker/roadmap', icon: 'target' });
    }
    if (qLower.includes('cert') || qLower.includes('verif') || qLower.includes('sha') || qLower.includes('proof')) {
      actions.push({ label: 'Cryptographic Credentials', href: '/seeker/credentials', icon: 'shield' });
    }
    if (qLower.includes('candidate') || qLower.includes('match') || qLower.includes('recruiter')) {
      actions.push({ label: 'AI Match Rankings', href: '/recruiter/matches', icon: 'radar' });
    }

    return {
      text: textResult.trim(),
      actions: actions.length > 0 ? actions : [
        { label: 'Explore Roadmaps', href: '/seeker/roadmap', icon: 'target' },
        { label: 'Browse Jobs', href: '/seeker/dashboard', icon: 'job' }
      ],
      isAI: true,
    };
  }

  // 4. Intelligent Offline Knowledge Synthesizer (for full offline capability)
  const offlineResponse = synthesizeOfflineResponse(userQuery, context);
  return {
    ...offlineResponse,
    isAI: false,
  };
}

function synthesizeOfflineResponse(
  query: string,
  context: GeminiContext
): { text: string; actions?: ChatMessage['actions']; dataSnippet?: ChatMessage['dataSnippet'] } {
  const q = query.trim().toLowerCase();
  const { jobs, candidates, learner } = context;

  // Career Evaluation Questions (e.g., "is data scientist a good role", "is software engineer worth it")
  if (q.includes('good role') || q.includes('worth it') || q.includes('should i become') || q.includes('future of') || q.includes('career in')) {
    let roleName = 'Data Science & AI Engineering';
    if (q.includes('data science') || q.includes('data scientist')) roleName = 'Data Scientist';
    else if (q.includes('full stack') || q.includes('web dev')) roleName = 'Full-Stack Developer';
    else if (q.includes('cloud') || q.includes('devops')) roleName = 'Cloud Architect / DevOps';
    else if (q.includes('machine learning') || q.includes('ml')) roleName = 'Machine Learning Engineer';

    return {
      text: `### 🚀 Is **${roleName}** a Good Career Choice?

Yes, **${roleName}** remains one of the highest-value and most in-demand specializations in modern tech. Here is a breakdown of why:

1. **Market Demand & Longevity**:
   - High demand across enterprise tech, fintech, healthcare, and high-growth startups.
   - Companies are heavily investing in data-driven automation, predictive modeling, and intelligent infrastructure.

2. **Compensation & Growth**:
   - Highly competitive salaries (typically ₹18L–₹45L+ in India or $120k–$190k+ globally depending on experience).
   - Clear trajectory into Principal Architect, Head of AI/Data, or Engineering Leadership.

3. **Evolving Skill Requirements**:
   - Modern practitioners need a balance of **core fundamentals** (Python, SQL, Algorithms) and **applied engineering** (LLMs, PyTorch, Cloud APIs, MLOps pipelines).
   - Verifying your competencies with real code proof (like GitHub projects and SHA-256 certified coursework) sets you ahead of 90% of applicants.`,
      actions: [
        { label: `View ${roleName} Roadmap`, href: '/seeker/roadmap', icon: 'target' },
        { label: 'Browse Matching Openings', href: '/seeker/dashboard', icon: 'job' },
        { label: 'Verify Your Skills', href: '/seeker/profile/upload', icon: 'shield' },
      ],
    };
  }

  // Fallback broad response
  return {
    text: `I've analyzed your question regarding **"${query}"**.\n\nHireReady connects you with verified tech opportunities, personalized career roadmaps, and cryptographic skill audits. What specific aspect would you like to explore next?`,
    actions: [
      { label: 'Explore Career Roadmaps', href: '/seeker/roadmap', icon: 'target' },
      { label: 'Browse Open Jobs', href: '/seeker/dashboard', icon: 'job' },
      { label: 'Inspect Verified Credentials', href: '/seeker/credentials', icon: 'shield' },
    ],
  };
}
