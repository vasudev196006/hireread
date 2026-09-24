import type { Candidate, CandidateProject, Skill } from "./types";

export interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  company: string | null;
  blog: string | null;
}

export interface GitHubRepoResponse {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
}

export async function fetchLiveGitHubProfile(username: string): Promise<{
  profile: GitHubUserResponse;
  projects: CandidateProject[];
  extractedSkills: Skill[];
} | null> {
  const cleanUser = username.trim().replace(/^@/, "");
  if (!cleanUser) return null;

  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (!userRes.ok) return null;
    const profile: GitHubUserResponse = await userRes.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=8`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );

    let projects: CandidateProject[] = [];
    const languageCounts: Record<string, number> = {};

    if (reposRes.ok) {
      const repos: GitHubRepoResponse[] = await reposRes.json();
      projects = repos
        .filter((r) => !r.fork)
        .slice(0, 4)
        .map((r) => {
          if (r.language) {
            languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
          }
          return {
            title: r.name,
            description: r.description || `Public open-source repository on GitHub (${r.stargazers_count} stars).`,
            technologies: r.language ? [r.language, "Git", "Open Source"] : ["Git", "Open Source"],
            githubUrl: r.html_url,
            liveUrl: r.homepage || undefined,
          };
        });
    }

    const extractedSkills: Skill[] = Object.entries(languageCounts).map(([lang, count]) => ({
      name: lang,
      proficiency: count >= 3 ? "expert" : count >= 2 ? "advanced" : "intermediate",
      yearsExperience: Math.min(6, Math.max(1, count * 1.5)),
      verified: true,
      verificationScore: 95,
      category: "Programming Language",
    }));

    return {
      profile,
      projects,
      extractedSkills,
    };
  } catch {
    return null;
  }
}
