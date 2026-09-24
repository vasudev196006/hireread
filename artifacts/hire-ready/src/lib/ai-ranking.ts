import { calculateMatchScore } from "./scoring";
import type {
  Candidate,
  Job,
  MatchScore,
  AISemanticAdjustment,
  AIRankingJustification,
} from "./types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Semantic similarity knowledge graph for tech concepts
const semanticEquivalents: Array<{
  terms: string[];
  concept: string;
  similarity: number;
}> = [
  { terms: ["nodejs", "backendjavascript", "typescriptbackend", "expressjs", "nest", "javascriptbackend"], concept: "Backend JavaScript", similarity: 0.92 },
  { terms: ["gcp", "aws", "azure", "cloudplatforms", "cloudinfrastructure", "googlecloud", "amazonwebservices"], concept: "Cloud Platforms", similarity: 0.90 },
  { terms: ["pytorch", "tensorflow", "keras", "deeplearning", "neuralnetworks"], concept: "Deep Learning Frameworks", similarity: 0.94 },
  { terms: ["postgresql", "postgres", "mysql", "sql", "relationaldatabases", "relationaldb"], concept: "Relational SQL Databases", similarity: 0.95 },
  { terms: ["kubernetes", "k8s", "containerorchestration", "dockercompose"], concept: "Container Orchestration", similarity: 0.91 },
  { terms: ["nextjs", "reactframework", "ssrfrontend", "remix", "gatsby"], concept: "Modern React SSR", similarity: 0.93 },
  { terms: ["restapis", "restfulapis", "rest", "graphql", "apidesign"], concept: "API Architecture", similarity: 0.88 },
  { terms: ["tailwindcss", "tailwind", "css", "moderncss", "uistyling", "styledcomponents"], concept: "UI Styling & CSS", similarity: 0.89 },
  { terms: ["pandasnumpy", "pandas", "numpy", "datawrangling", "dataanalysis"], concept: "Data Analysis & Manipulation", similarity: 0.95 },
  { terms: ["terraform", "iac", "infrastructureascode", "cloudformation", "pulumi"], concept: "Infrastructure as Code", similarity: 0.93 },
  { terms: ["machinelearningfundamentals", "scikitlearn", "mlalgorithms", "machinelearning"], concept: "Machine Learning Core", similarity: 0.92 },
  { terms: ["figma", "uiuxdesign", "productdesign", "wireframing", "uidesign"], concept: "Design Tooling & Systems", similarity: 0.90 },
  { terms: ["cicdpipelines", "githubactions", "gitlabci", "jenkins", "devopsautomation"], concept: "CI/CD & Automation", similarity: 0.91 },
];

function findSemanticMatch(candidateSkill: string, jobSkill: string): { matches: boolean; similarity: number; concept: string } {
  const normCandidate = normalize(candidateSkill);
  const normJob = normalize(jobSkill);

  if (!normCandidate || !normJob) return { matches: false, similarity: 0, concept: "" };

  if (normCandidate === normJob) {
    return { matches: true, similarity: 1.0, concept: "Exact Match" };
  }

  for (const group of semanticEquivalents) {
    const hasCandidate = group.terms.includes(normCandidate);
    const hasJob = group.terms.includes(normJob);

    if (hasCandidate && hasJob) {
      return { matches: true, similarity: group.similarity, concept: group.concept };
    }
  }

  return { matches: false, similarity: 0, concept: "" };
}

/**
 * Calculates AI semantic adjustments and natural-language justifications
 * on top of the deterministic base score.
 */
export function calculateAIEnhancedMatch(
  candidate: Candidate,
  job: Job
): MatchScore {
  const baseScore = calculateMatchScore(candidate, job);
  const candidateSkills = candidate.skills;
  const candidateSkillNames = new Set(candidateSkills.map((s) => normalize(s.name)));

  const requiredJobSkills = job.skills.filter((s) => s.importance === "required");
  const preferredJobSkills = job.skills.filter((s) => s.importance === "preferred");

  const adjustments: AISemanticAdjustment[] = [];

  // Only consider semantic bonus if candidate already has a solid foundational match (> 25 pts)
  if (baseScore.total > 25) {
    // Check required job skills that lack an exact match
    requiredJobSkills.forEach((reqSkill) => {
      const normReq = normalize(reqSkill.name);
      if (!candidateSkillNames.has(normReq)) {
        // Look for semantic cousin
        for (const candSkill of candidateSkills) {
          const match = findSemanticMatch(candSkill.name, reqSkill.name);
          if (match.matches && match.similarity > 0.8) {
            const bonus = Math.round(match.similarity * 2); // bounded partial credit
            adjustments.push({
              candidateSkill: candSkill.name,
              jobSkill: reqSkill.name,
              similarity: match.similarity,
              bonusPoints: bonus,
              reason: `Near-match: Candidate's ${candSkill.name} relates to ${reqSkill.name} under ${match.concept} (${Math.round(match.similarity * 100)}% similarity).`,
            });
            break;
          }
        }
      }
    });

    // Check preferred job skills
    preferredJobSkills.forEach((prefSkill) => {
      const normPref = normalize(prefSkill.name);
      if (!candidateSkillNames.has(normPref)) {
        for (const candSkill of candidateSkills) {
          const match = findSemanticMatch(candSkill.name, prefSkill.name);
          if (match.matches && match.similarity > 0.8) {
            const bonus = 1;
            adjustments.push({
              candidateSkill: candSkill.name,
              jobSkill: prefSkill.name,
              similarity: match.similarity,
              bonusPoints: bonus,
              reason: `Preferred near-match: ${candSkill.name} maps to ${prefSkill.name}.`,
            });
            break;
          }
        }
      }
    });
  }

  // Semantic adjustment is bounded strictly to +4 maximum
  const rawBonus = adjustments.reduce((sum, a) => sum + a.bonusPoints, 0);
  const boundedBonus = Math.min(4, rawBonus);
  const totalScore = Math.min(100, baseScore.total + boundedBonus);


  // Generate natural language justification
  const verifiedReqCount = candidateSkills.filter(
    (s) => s.verified && requiredJobSkills.some((r) => normalize(r.name) === normalize(s.name))
  ).length;

  const expDelta = candidate.experienceYears - job.minExperience;
  const verifiedCertsCount = candidate.certifications.filter((c) => c.verified).length;

  const keyDrivers: string[] = [];
  const pros: string[] = [];
  const developmentAreas: string[] = [];

  if (verifiedReqCount > 0) {
    keyDrivers.push(`${verifiedReqCount} verified required skill${verifiedReqCount > 1 ? "s" : ""} on file`);
    pros.push(`Demonstrated proficiency in core requirements.`);
  }

  if (expDelta >= 0) {
    keyDrivers.push(`${candidate.experienceYears}y experience (${expDelta > 0 ? `+${expDelta.toFixed(1)}y above min` : "meets minimum"})`);
    pros.push(`Solid career tenure aligned with ${job.title}.`);
  } else {
    developmentAreas.push(`Candidate experience (${candidate.experienceYears}y) is below the ${job.minExperience}y floor.`);
  }

  if (verifiedCertsCount > 0) {
    keyDrivers.push(`${verifiedCertsCount} cryptographic/verified credential${verifiedCertsCount > 1 ? "s" : ""}`);
    pros.push(`Third-party certified evidence reduces verification overhead.`);
  }

  if (adjustments.length > 0) {
    keyDrivers.push(`+${boundedBonus} pts AI semantic assist for complementary toolkit`);
  }

  const missingReqs = requiredJobSkills.filter((r) => !candidateSkillNames.has(normalize(r.name)));
  if (missingReqs.length > 0) {
    developmentAreas.push(`Missing direct evidence for: ${missingReqs.slice(0, 2).map((r) => r.name).join(", ")}.`);
  }

  let summary = `Candidate scored ${baseScore.total}% on the deterministic formula`;
  if (boundedBonus > 0) {
    summary += ` with a +${boundedBonus} pts AI semantic boost for transferrable skills.`;
  } else {
    summary += ` with high audit fidelity across skills and verified credentials.`;
  }

  const justification: AIRankingJustification = {
    summary,
    keyDrivers,
    pros,
    developmentAreas,
    semanticAdjustments: adjustments,
    semanticTotalBonus: boundedBonus,
  };

  return {
    total: totalScore,
    deterministicTotal: baseScore.total,
    aiSemanticBonus: boundedBonus,
    components: baseScore.components,
    justification,
  };
}

/**
 * Computes pool-wide scarcity and gap flagging for recruiters.
 * Identifies which required skills are hardest to find.
 */
export interface PoolScarcityMetric {
  skillName: string;
  importance: "required" | "preferred";
  matchedCandidatesCount: number;
  verifiedCandidatesCount: number;
  totalCandidates: number;
  coveragePercentage: number;
  isScarce: boolean; // e.g. < 25% coverage
}

export function analyzePoolScarcity(candidates: Candidate[], job: Job): PoolScarcityMetric[] {
  const total = Math.max(candidates.length, 1);

  return job.skills.map((jobSkill) => {
    const norm = normalize(jobSkill.name);
    let matched = 0;
    let verified = 0;

    candidates.forEach((cand) => {
      const match = cand.skills.find((s) => normalize(s.name) === norm);
      if (match) {
        matched++;
        if (match.verified) verified++;
      }
    });

    const coveragePercentage = Math.round((matched / total) * 100);

    return {
      skillName: jobSkill.name,
      importance: jobSkill.importance,
      matchedCandidatesCount: matched,
      verifiedCandidatesCount: verified,
      totalCandidates: total,
      coveragePercentage,
      isScarce: coveragePercentage <= 25,
    };
  });
}
