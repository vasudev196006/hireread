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
  const key = apiKey.trim();

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

  const systemInstruction = `You are HireReady AI, a smart, friendly, and natural conversational assistant for HireReady.
HireReady is a verified talent intelligence platform with:
1. Cryptographic SHA-256 certificate verification (audited against issuers & live GitHub repos).
2. Two-Layer AI Candidate Matching (Deterministic Base Score 0-100 + Bounded AI Semantic Transferability score).
3. Topological Career Roadmaps with milestone sequencing and skill readiness metrics.
4. Two distinct role portals: Job Seeker Portal and Recruiter Portal.

Current Context:
- Active User Role: ${role || 'Job Seeker'}
- ${learnerSummary}
- Live Jobs in System:
${jobsSummary}
- Top Verified Candidates:
${candidatesSummary}

Tone & Rules:
- Respond naturally, warmly, and concisely like a real tech career & recruiting advisor.
- If the user greets you (e.g. "hi", "hello"), greet them warmly back and mention 2-3 specific things you can help with (like exploring open roles, checking skill gaps, or cryptographic verification).
- Do NOT sound robotic. Keep replies under 3 short paragraphs.`;

  // Format messages for OpenAI / OpenRouter style
  const openAiMessages = [
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

  // Case A: If key starts with AIzaSy (Google Gemini AI Studio API key)
  if (key.startsWith('AIzaSy')) {
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  }

  // Case B: If not Gemini key or if Gemini failed, try OpenRouter / OpenAI compatible endpoint
  if (!textResult) {
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
          messages: openAiMessages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        textResult = data.choices?.[0]?.message?.content || '';
      }
    } catch {
      // ignore
    }
  }

  // Case C: If still no result, attempt direct Gemini with key anyway
  if (!textResult) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser: ${userQuery}` }] },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'API key could not authenticate with AI providers.');
    }
  }

  // Contextual actions
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
    text: textResult,
    actions:
      actions.length > 0
        ? actions
        : [
            { label: 'Explore Roadmap', href: '/seeker/roadmap', icon: 'target' },
            { label: 'Browse Jobs', href: '/seeker/dashboard', icon: 'job' },
          ],
  };
}

