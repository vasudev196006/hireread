import { roleSkillGraphs } from "./role-skill-graph";
import type {
  Candidate,
  CareerRoadmap,
  Proficiency,
  RoadmapGap,
  RoleSkillGraphNode,
  Skill,
} from "./types";

const proficiencyRank: Record<Proficiency, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Calculates dynamic verification scores and flags for candidate skills based on:
 * 1. Matching verified certifications.
 * 2. Matching projects that use the technology.
 */
export function enrichCandidateSkillsWithVerification(candidate: Candidate): Skill[] {
  const verifiedCerts = candidate.certifications.filter((cert) => cert.verified);
  const projectTechs = new Set(
    candidate.projects.flatMap((p) => p.technologies.map(normalize))
  );

  return candidate.skills.map((skill) => {
    const normSkill = normalize(skill.name);
    const hasProjectEvidence = projectTechs.has(normSkill);
    const hasCertEvidence = verifiedCerts.some((cert) => {
      const fullText = normalize(`${cert.name} ${cert.issuer}`);
      return fullText.includes(normSkill) || normSkill.includes(normalize(cert.name));
    });

    let verificationScore = skill.verified ? 70 : 30;
    if (hasCertEvidence) verificationScore = Math.min(100, verificationScore + 30);
    if (hasProjectEvidence) verificationScore = Math.min(100, verificationScore + 20);

    const isVerified = skill.verified || (hasCertEvidence && hasProjectEvidence);

    return {
      ...skill,
      verified: isVerified,
      verificationScore,
    };
  });
}

/**
 * Deterministic gap detection and topological sequencing for a candidate against a target role.
 */
export function generateCareerRoadmap(
  candidate: Candidate,
  targetRole: string = "Data Scientist"
): CareerRoadmap {
  const graph = roleSkillGraphs[targetRole] ?? roleSkillGraphs["Data Scientist"] ?? [];
  const candidateSkills = enrichCandidateSkillsWithVerification(candidate);
  const candidateSkillMap = new Map(
    candidateSkills.map((s) => [normalize(s.name), s])
  );

  const masteredSkillNames = new Set<string>();

  // Evaluate each node
  const analyzedNodes: RoadmapGap[] = graph.map((node) => {
    const normNodeName = normalize(node.skillName);
    const userSkill = candidateSkillMap.get(normNodeName);

    const hasSkill = !!userSkill;
    const currentProf = userSkill?.proficiency;
    const meetsProficiency =
      currentProf &&
      proficiencyRank[currentProf] >= proficiencyRank[node.expectedProficiency];

    const isMissing = !hasSkill;
    const isProficiencyGap = hasSkill && !meetsProficiency;

    if (hasSkill && meetsProficiency) {
      masteredSkillNames.add(node.skillName);
    }

    return {
      node,
      currentProficiency: currentProf,
      isMissing,
      isProficiencyGap,
      status: (hasSkill && meetsProficiency
        ? "mastered"
        : hasSkill
        ? "in_progress"
        : "gap") as "mastered" | "in_progress" | "gap" | "locked",
      prerequisitesMet: false,
    };
  });

  // Check prerequisites
  analyzedNodes.forEach((gap) => {
    const prereqs = gap.node.prerequisites;
    if (prereqs.length === 0) {
      gap.prerequisitesMet = true;
    } else {
      gap.prerequisitesMet = prereqs.every((req) => masteredSkillNames.has(req));
    }
    if (gap.status !== "mastered" && !gap.prerequisitesMet) {
      gap.status = "locked";
    }
  });

  // Group by tier
  const gapsByTier: Record<number, RoadmapGap[]> = {
    1: analyzedNodes.filter((n) => n.node.tier === 1),
    2: analyzedNodes.filter((n) => n.node.tier === 2),
    3: analyzedNodes.filter((n) => n.node.tier === 3),
    4: analyzedNodes.filter((n) => n.node.tier === 4),
  };

  const masteredCount = analyzedNodes.filter((n) => n.status === "mastered").length;
  const inProgressCount = analyzedNodes.filter((n) => n.status === "in_progress").length;
  const totalSkillsCount = Math.max(analyzedNodes.length, 1);
  const overallReadiness = Math.round(
    ((masteredCount * 1.0 + inProgressCount * 0.5) / totalSkillsCount) * 100
  );

  // High priority gaps (unlocked gaps ordered by tier)
  const priorityGaps = analyzedNodes.filter((n) => n.status === "gap" || n.status === "in_progress");
  const unlockedGaps = priorityGaps.filter((n) => n.prerequisitesMet);

  // Generate AI narrative
  const masteredList = analyzedNodes
    .filter((n) => n.status === "mastered")
    .map((n) => n.node.skillName);
  const nextTargetList = (unlockedGaps.length > 0 ? unlockedGaps : priorityGaps)
    .slice(0, 3)
    .map((n) => n.node.skillName);

  let narrative = "";
  if (masteredList.length > 0) {
    narrative += `You have established solid capability in ${masteredList.slice(0, 3).join(", ")}. `;
  } else {
    narrative += `You're beginning your learning journey for ${targetRole}. `;
  }

  if (nextTargetList.length > 0) {
    narrative += `Your highest-leverage priority right now is mastering ${nextTargetList.join(" and ")}, which directly unblocks advanced competencies in Tier 3.`;
  } else {
    narrative += `Your profile exhibits high readiness across all tiers for this career track!`;
  }

  // Milestones sequence
  const milestones = [
    {
      title: "Sprint 1: Core Foundation & Next Lever",
      timeframe: "Next 4–6 Weeks",
      tier: 1,
      skills: (unlockedGaps.filter((g) => g.node.tier <= 2).map((g) => g.node.skillName).slice(0, 2)),
      description: "Close direct prerequisite gaps and solidify practical implementation patterns.",
    },
    {
      title: "Sprint 2: Core Engineering & System Design",
      timeframe: "Next Quarter (Months 2–3)",
      tier: 2,
      skills: (priorityGaps.filter((g) => g.node.tier === 2 || g.node.tier === 3).map((g) => g.node.skillName).slice(0, 3)),
      description: "Build end-to-end evidence and earn verified certification badges for high-impact capabilities.",
    },
    {
      title: "Sprint 3: Advanced Architecture & Specialization",
      timeframe: "6-Month Target Horizon",
      tier: 3,
      skills: (priorityGaps.filter((g) => g.node.tier >= 3).map((g) => g.node.skillName).slice(0, 3)),
      description: "Master distributed patterns, production deployment, and domain-specific specialization.",
    },
  ].filter((m) => m.skills.length > 0);

  // Curated suggested certifications
  const suggestedCertifications: CareerRoadmap["suggestedCertifications"] = [];
  priorityGaps.slice(0, 4).forEach((gap) => {
    gap.node.recommendedCertifications.forEach((cert) => {
      suggestedCertifications.push({
        name: cert.name,
        issuer: cert.issuer,
        skill: gap.node.skillName,
        level: cert.level,
      });
    });
  });

  return {
    targetRole,
    overallReadiness,
    masteredCount,
    totalSkillsCount,
    narrative,
    milestones: milestones.length > 0 ? milestones : [
      {
        title: "Ongoing Excellence & Production Portfolio",
        timeframe: "Continuous",
        tier: 4,
        skills: ["Production Hardening", "Mentorship", "Specialized Architecture"],
        description: "Maintain your verified credentials and publish case studies.",
      }
    ],
    suggestedCertifications: suggestedCertifications.slice(0, 6),
    gapsByTier,
    allGaps: analyzedNodes,
  };
}
