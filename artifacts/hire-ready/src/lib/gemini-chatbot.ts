import type { Candidate, Job, UserRole } from '@/lib/types';
import type { ChatMessage } from '@/components/AIChatbot';

interface GeminiContext {
  jobs?: Job[];
  candidates?: Candidate[];
  learner?: Candidate;
  role?: UserRole | null;
}

export async function askGeminiAssistant(
  apiKey: string | undefined,
  userQuery: string,
  history: ChatMessage[],
  context: GeminiContext
): Promise<{ text: string; actions?: ChatMessage['actions']; dataSnippet?: ChatMessage['dataSnippet']; isAI: boolean }> {
  const { jobs = [], candidates = [], learner, role } = context;
  const key = (apiKey || '').trim();

  // Safely build condensed website grounding context
  const jobsSummary = (jobs || [])
    .slice(0, 8)
    .map((j) => {
      const skillsList = (j?.skills || []).map((s) => s?.name).filter(Boolean).join(', ');
      const salaryStr = j?.salaryMin ? `₹${(j.salaryMin / 100000).toFixed(1)}L–₹${((j.salaryMax || j.salaryMin) / 100000).toFixed(1)}L` : 'Competitive';
      return `- "${j?.title || 'Engineer'}" at ${j?.company || 'Tech Corp'} (${j?.location || 'Remote'}, ${salaryStr}). Skills: ${skillsList || 'Software Development'}`;
    })
    .join('\n');

  const candidatesSummary = (candidates || [])
    .slice(0, 5)
    .map((c) => {
      const skillsList = (c?.skills || []).map((s) => s?.name).filter(Boolean).join(', ');
      return `- ${c?.name || 'Candidate'} (${c?.headline || 'Engineer'}, ${c?.experienceYears || 2}y exp, GitHub: @${c?.githubUsername || 'dev'}). Verified skills: ${skillsList}`;
    })
    .join('\n');

  const verifiedSkills = (learner?.skills || []).filter((s) => s?.verified).map((s) => s?.name).filter(Boolean).join(', ');
  const certsList = (learner?.certifications || []).map((c) => `${c?.name} (${c?.issuer})`).filter(Boolean).join(', ');
  const learnerSummary = `Logged-in User: ${learner?.name || 'Aarav Patel'} (${learner?.headline || 'Developer'}, Target Track: ${learner?.targetRole || 'Full-Stack / AI'}). Verified skills: ${verifiedSkills || 'Python, React, TypeScript'}. Certifications: ${certsList || 'AWS Certified, Deep Learning'}.`;

  const systemInstruction = `You are HireReady AI, a smart, knowledgeable, and articulate AI advisor for the HireReady platform and tech careers.

Platform Overview:
- HireReady is a verified talent intelligence platform with cryptographic SHA-256 certificate verification (audited against issuers and GitHub repo code analysis).
- Features a Two-Layer AI Candidate Matching algorithm (Deterministic hard requirements + Bounded semantic transferability).
- Features topological learning roadmaps with skill sequencing and readiness scores.
- Two distinct portals: Job Seeker (roadmaps, uploads, job applications) and Recruiter (talent scarcity radar, match matrix, job postings).

Platform Live Telemetry:
- User Role: ${role || 'Job Seeker'}
- ${learnerSummary}
- Active Jobs in Platform:
${jobsSummary || '- Full-Stack Developer at NexaCore\n- Machine Learning Engineer at Vertex AI\n- Cloud Architect at Apex Cloud'}
- Top Verified Candidates:
${candidatesSummary || '- Aarav Patel (Full-Stack / ML)\n- Sarah Chen (Cloud Architect)'}

Behavior & Response Guidelines:
1. Answer the user's question directly, intelligently, and conversationally. If they ask a general greeting ("hi", "hello"), greet them warmly and ask how you can help with jobs, roadmaps, or cryptographic proof.
2. If they ask about career viability (e.g., "is data scientist a good role?"), give a comprehensive, nuanced, and realistic industry breakdown (market demand, salary prospects, pros/cons, evolving skills like LLMOps/Generative AI).
3. Ground your answers in tech industry reality and platform context where applicable.
4. Be friendly, articulate, and direct. Use clean markdown (bolding, lists) to format your response clearly.`;

  const messagesPayload = [
    { role: 'system', content: systemInstruction },
    ...(history || [])
      .filter((m) => m?.id !== 'welcome-1')
      .slice(-6)
      .map((m) => ({
        role: m?.sender === 'user' ? 'user' : 'assistant',
        content: m?.text || '',
      })),
    { role: 'user', content: userQuery },
  ];

  let textResult = '';

  // 1. Google Gemini API (if user provided a valid Gemini AI Studio key starting with AIzaSy)
  if (key && key.startsWith('AIzaSy')) {
    try {
      const contents = (history || [])
        .filter((m) => m?.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({
          role: m?.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m?.text || '' }],
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
        textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch {
      // Fall through to next provider
    }
  }

  // 2. OpenRouter / OpenAI endpoints (if key starts with sk-)
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
        textResult = data?.choices?.[0]?.message?.content || '';
      }
    } catch {
      // Fall through
    }
  }

  // 3. Free Live Serverless AI Inference (Zero-Key Realtime LLM)
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
      // Fall through
    }
  }

  // If live LLM returned text, parse and return
  if (textResult && textResult.trim().length > 5) {
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

  // Fallback if network is offline
  return {
    text: `Hello! I'm your HireReady AI Assistant. I can help you explore active job postings, check your skill readiness for target roles like Full-Stack or Data Science, explain our cryptographic SHA-256 verification system, or find top-ranked candidates. What would you like to explore?`,
    actions: [
      { label: 'Explore Career Roadmaps', href: '/seeker/roadmap', icon: 'target' },
      { label: 'Browse Open Jobs', href: '/seeker/dashboard', icon: 'job' },
      { label: 'Cryptographic Credentials', href: '/seeker/credentials', icon: 'shield' },
    ],
    isAI: false,
  };
}
