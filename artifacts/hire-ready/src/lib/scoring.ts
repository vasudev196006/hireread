import type { Candidate, Job, MatchScore, ScoreComponent } from "./types";

const educationRank: Record<Candidate["education"], number> = {
  any: 0,
  diploma: 1,
  bachelors: 2,
  masters: 3,
  phd: 4,
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

/**
 * Deterministic, explainable match score out of 100.
 *
 * Required skills (50), preferred skills (15), experience (15), education
 * (5), verified certifications (5), and project evidence (10) are scored
 * independently so the same breakdown can power recruiter and learner views.
 */
export function calculateMatchScore(
  candidate: Candidate,
  job: Job,
): MatchScore {
  const candidateSkills = new Map(
    candidate.skills.map((skill) => [normalize(skill.name), skill]),
  );
  const required = job.skills.filter((skill) => skill.importance === "required");
  const preferred = job.skills.filter(
    (skill) => skill.importance === "preferred",
  );

  const requiredWeight = required.reduce((sum, requiredSkill) => {
    const candidateSkill = candidateSkills.get(normalize(requiredSkill.name));
    if (!candidateSkill) return sum;
    return (
      sum +
      1 +
      (candidateSkill.verified ? 0.05 : 0) +
      (candidateSkill.proficiency === "expert" ? 0.05 : 0)
    );
  }, 0);
  const requiredScore =
    required.length === 0
      ? 50
      : clamp(Math.round((requiredWeight / required.length) * 50), 50);
  const matchedRequired = required.filter((skill) =>
    candidateSkills.has(normalize(skill.name)),
  );

  const matchedPreferred = preferred.filter((skill) =>
    candidateSkills.has(normalize(skill.name)),
  );
  const preferredScore =
    preferred.length === 0
      ? 15
      : Math.round((matchedPreferred.length / preferred.length) * 15);

  const experienceScore =
    job.minExperience <= 0
      ? 15
      : candidate.experienceYears >= job.minExperience
        ? 15
        : Math.round((candidate.experienceYears / job.minExperience) * 15);

  const educationScore =
    educationRank[candidate.education] >= educationRank[job.education] ? 5 : 0;

  const stackNames = job.skills.map((skill) => skill.name);
  const verifiedCertificates = candidate.certifications.filter(
    (certification) => certification.verified,
  );
  const matchingCertificate = verifiedCertificates.some((certification) => {
    const certificateText = normalize(
      `${certification.name} ${certification.issuer}`,
    );
    return stackNames.some((skillName) =>
      certificateText.includes(normalize(skillName)),
    );
  });
  const certificationScore = matchingCertificate
    ? 5
    : verifiedCertificates.length > 0
      ? 2
      : 0;

  const requiredNames = new Set(required.map((skill) => normalize(skill.name)));
  const projectTechnologies = new Set(
    candidate.projects.flatMap((project) =>
      project.technologies.map(normalize),
    ),
  );
  const matchedProjectTags = [...requiredNames].filter((name) =>
    projectTechnologies.has(name),
  );
  const projectScore =
    required.length === 0
      ? 10
      : clamp(Math.round((matchedProjectTags.length / required.length) * 10), 10);

  const components: ScoreComponent[] = [
    {
      key: "requiredSkills",
      label: "Required skills",
      score: requiredScore,
      max: 50,
      detail:
        required.length === 0
          ? "No required skills were specified."
          : `${matchedRequired.length} of ${required.length} required skills matched. Verification and expert proficiency add up to 5% per matched skill.`,
    },
    {
      key: "preferredSkills",
      label: "Preferred skills",
      score: preferredScore,
      max: 15,
      detail:
        preferred.length === 0
          ? "No preferred skills were specified, so all 15 points are included."
          : `${matchedPreferred.length} of ${preferred.length} preferred skills matched.`,
    },
    {
      key: "experience",
      label: "Experience",
      score: experienceScore,
      max: 15,
      detail:
        job.minExperience <= 0
          ? "No minimum experience requirement."
          : `${candidate.experienceYears} years of experience against a ${job.minExperience}-year minimum.`,
    },
    {
      key: "education",
      label: "Education",
      score: educationScore,
      max: 5,
      detail: `${candidate.education} education ${
        educationScore > 0 ? "meets" : "does not meet"
      } the ${job.education} requirement.`,
    },
    {
      key: "certifications",
      label: "Certifications",
      score: certificationScore,
      max: 5,
      detail: matchingCertificate
        ? "A verified certification matches the role's technology stack."
        : verifiedCertificates.length > 0
          ? "Verified certifications are present, but none match the role's stack."
          : "No verified certifications on file.",
    },
    {
      key: "projects",
      label: "Projects",
      score: projectScore,
      max: 10,
      detail:
        required.length === 0
          ? "No required stack was specified."
          : `${matchedProjectTags.length} of ${required.length} required technologies appear in project evidence.`,
    },
  ];

  return {
    total: components.reduce((sum, component) => sum + component.score, 0),
    components,
  };
}