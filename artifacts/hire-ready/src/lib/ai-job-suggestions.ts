import { roleSkillGraphs } from "./role-skill-graph";
import type { JobSkill, Proficiency } from "./types";

export interface AISkillSuggestionResult {
  suggestedRole: string;
  skills: Array<JobSkill & { reason: string; tier: number }>;
  summary: string;
}

export function generateAISkillSuggestions(
  title: string,
  description: string = ""
): AISkillSuggestionResult {
  const query = `${title} ${description}`.toLowerCase();

  let matchedRoleKey = "Full Stack Developer";
  if (query.includes("data") || query.includes("analytics") || query.includes("machine learning") || query.includes("ml")) {
    if (query.includes("engineer") || query.includes("llm") || query.includes("ai")) {
      matchedRoleKey = "AI & Machine Learning Engineer";
    } else {
      matchedRoleKey = "Data Scientist";
    }
  } else if (query.includes("devops") || query.includes("cloud") || query.includes("infra") || query.includes("sre") || query.includes("kubernetes")) {
    matchedRoleKey = "Cloud & DevOps Engineer";
  } else if (query.includes("frontend") || query.includes("react") || query.includes("ui")) {
    matchedRoleKey = "Full Stack Developer";
  }

  const nodes = roleSkillGraphs[matchedRoleKey] ?? roleSkillGraphs["Full Stack Developer"] ?? [];

  const skills: Array<JobSkill & { reason: string; tier: number }> = nodes.map((node) => {
    const isTier1Or2 = node.tier <= 2;
    const importance: "required" | "preferred" = isTier1Or2 ? "required" : "preferred";
    const minProf: Proficiency = isTier1Or2 ? (node.tier === 1 ? "advanced" : "intermediate") : "intermediate";

    return {
      name: node.skillName,
      importance,
      minProficiency: minProf,
      tier: node.tier,
      reason: isTier1Or2
        ? `Foundational requirement for ${matchedRoleKey} roles (Tier ${node.tier})`
        : `High-value specialized capability for senior contribution (Tier ${node.tier})`,
    };
  });

  return {
    suggestedRole: matchedRoleKey,
    skills,
    summary: `Generated ${skills.length} role-aligned skill requirements with recommended proficiency baselines based on the "${matchedRoleKey}" benchmark.`,
  };
}
