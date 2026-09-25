import type { Candidate, Job, UserRole } from '@/lib/types';
import type { ChatMessage } from '@/components/AIChatbot';

interface GeminiContext {
  jobs: Job[];
  candidates: Candidate[];
  learner: Candidate;
  role: UserRole | null;
}

export async function askGeminiAssistant(
  apiKey: string,
  userQuery: string,
  history: ChatMessage[],
  context: GeminiContext
): Promise<{ text: string; actions?: ChatMessage['actions']; dataSnippet?: ChatMessage['dataSnippet'] }> {
  const { jobs, candidates, learner, role } = context;

  // Build condensed website grounding context
  const jobsSummary = jobs
    .slice(0, 8)
    .map(
      (j) =>
        `- "${j.title}" at ${j.company} (${j.location}, $${j.salaryMin?.toLocaleString()}-$${j.salaryMax?.toLocaleString()}). Required skills: ${j.requiredSkills.map((s) => s.name).join(', ')}`
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

  const systemInstruction = `You are HireReady AI, the intelligent recruitment, career guidance, and verification assistant for the HireReady platform.
HireReady is a verified talent intelligence platform featuring:
1. Cryptographic SHA-256 certificate verification (no self-reported fluff, audited against issuers & live GitHub repos).
2. Two-Layer AI Candidate Matching (Deterministic Base Score 0-100 + Bounded AI Semantic Transferability score).
3. Topological Career Roadmaps with milestone sequencing and skill readiness metrics.
4. Two distinct role portals: Job Seeker Portal (roadmaps, uploads, job search) and Recruiter Portal (talent scarcity radar, match matrix, job posting).

Current Platform State:
- Active User Role: ${role || 'Job Seeker'}
- ${learnerSummary}

Current Live Jobs in System:
${jobsSummary}

Top Verified Candidates:
${candidatesSummary}

Guidelines:
- Give concise, helpful, friendly, and highly factual answers directly grounded in HireReady data.
- If the user asks about jobs, recommend matching active positions from the system.
- If asked about career growth or skills, reference the learning roadmap and verification system.
- If asked about cryptographic proofs, explain the SHA-256 verification hash and live code analysis.
- Use markdown formatting with bullet points where appropriate. Keep answers crisp (2-4 paragraphs max).`;

  // Format past history for Gemini
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I processed your query with Gemini, but didn't receive a valid response. Please try again.";

  // Generate dynamic contextual actions
  const actions: ChatMessage['actions'] = [];
  const qLower = userQuery.toLowerCase();

  if (qLower.includes('job') || qLower.includes('role') || qLower.includes('hiring') || qLower.includes('work')) {
    actions.push({ label: 'Explore Open Jobs', href: '/seeker/dashboard', icon: 'job' });
  }
  if (qLower.includes('skill') || qLower.includes('roadmap') || qLower.includes('learn') || qLower.includes('growth')) {
    actions.push({ label: 'View Career Roadmap', href: '/seeker/roadmap', icon: 'target' });
  }
  if (qLower.includes('cert') || qLower.includes('verif') || qLower.includes('sha') || qLower.includes('proof')) {
    actions.push({ label: 'Cryptographic Credentials', href: '/seeker/credentials', icon: 'shield' });
  }
  if (qLower.includes('candidate') || qLower.includes('match') || qLower.includes('recruiter')) {
    actions.push({ label: 'AI Match Rankings', href: '/recruiter/matches', icon: 'radar' });
  }

  return {
    text,
    actions: actions.length > 0 ? actions : [
      { label: 'Explore Roadmap', href: '/seeker/roadmap', icon: 'target' },
      { label: 'Browse Jobs', href: '/seeker/dashboard', icon: 'job' }
    ],
  };
}
