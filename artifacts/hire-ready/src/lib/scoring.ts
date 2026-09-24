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

const proficiencyMultiplier = {
  expert: 1.0,
  advanced: 0.9,
  intermediate: 0.75,
  beginner: 0.5,
};

/**
 * Deterministic, explainable match score out of 100 based strictly on the job requirements.
 *
 * Weightings:
 * - Required skills match & proficiency (55 pts max)
 * - Preferred skills match (15 pts max)
 * - Experience requirement alignment (15 pts max)
 * - Education floor met (5 pts max)
 * - Stack-relevant verified certification (5 pts max)
 * - Project evidence demonstrating required skills (10 pts max)
 */
export function calculateMatchScore(
  candidate: Candidate,
  job: Job,
): MatchScore {
  const candidateSkills = new Map(
    candidate.skills.map((skill) => [normalize(skill.name), skill]),
  );
  const required = job.skills.filter((skill) => skill.importance === "required");
  const preferred = job.skills.filter((skill) => skill.importance === "preferred");

  // 1. Required Skills Score (0 - 55 pts)
  let requiredScore = 0;
  const matchedRequired: Array<{ name: string; proficiency: string; verified: boolean }> = [];

  if (required.length > 0) {
    let earnedPoints = 0;
    const maxPossiblePerSkill = 1.15; // 1.0 expert + 0.15 verified bonus

    for (const req of required) {
      const candSkill = candidateSkills.get(normalize(req.name));
      if (candSkill) {
        matchedRequired.push({
          name: candSkill.name,
          proficiency: candSkill.proficiency,
          verified: candSkill.verified,
        });

        const profWeight = proficiencyMultiplier[candSkill.proficiency] ?? 0.75;
        const verifBonus = candSkill.verified ? 0.15 : 0;
        earnedPoints += profWeight + verifBonus;
      }
    }

    const totalPossible = required.length * maxPossiblePerSkill;
    requiredScore = clamp(Math.round((earnedPoints / totalPossible) * 55), 55);
  } else {
    requiredScore = 0;
  }

  // 2. Preferred Skills Score (0 - 15 pts)
  let preferredScore = 0;
  const matchedPreferred: string[] = [];

  if (preferred.length > 0) {
    for (const pref of preferred) {
      if (candidateSkills.has(normalize(pref.name))) {
        matchedPreferred.push(pref.name);
      }
    }
    preferredScore = Math.round((matchedPreferred.length / preferred.length) * 15);
  } else {
    preferredScore = 0;
  }

  // 3. Experience Score (0 - 15 pts)
  let experienceScore = 0;
  if (job.minExperience <= 0) {
    // If no min experience specified, grant proportional to experience up to 5y
    experienceScore = clamp(Math.round((candidate.experienceYears / 5) * 15), 15);
  } else if (candidate.experienceYears >= job.minExperience) {
    experienceScore = 15;
  } else {
    experienceScore = clamp(
      Math.round((candidate.experienceYears / job.minExperience) * 15),
      15
    );
  }

  // 4. Education Score (0 - 5 pts)
  const jobEduRank = educationRank[job.education] ?? 0;
  const candEduRank = educationRank[candidate.education] ?? 0;
  const educationScore = candEduRank >= jobEduRank ? 5 : 0;

  // 5. Certification Score (0 - 5 pts) - strictly requires matching the job stack
  const jobStackNames = job.skills.map((s) => normalize(s.name));
  const verifiedCertificates = candidate.certifications.filter((c) => c.verified);
  const matchingCertificate = verifiedCertificates.find((cert) => {
    const certText = normalize(`${cert.name} ${cert.issuer}`);
    return jobStackNames.some((skillNorm) => skillNorm.length > 2 && certText.includes(skillNorm));
  });

  const certificationScore = matchingCertificate ? 5 : 0;

  // 6. Project Evidence Score (0 - 10 pts) - strictly checks if required skills appear in projects
  let projectScore = 0;
  const matchedProjectSkills: string[] = [];

  if (required.length > 0) {
    const candidateProjectTechs = new Set(
      candidate.projects.flatMap((p) => p.technologies.map(normalize))
    );

    for (const req of required) {
      const normReq = normalize(req.name);
      if (candidateProjectTechs.has(normReq)) {
        matchedProjectSkills.push(req.name);
      }
    }

    projectScore = clamp(
      Math.round((matchedProjectSkills.length / required.length) * 10),
      10
    );
  }

  // Calculate total: If candidate has ZERO required skills, cap score at 20% max
  let total = requiredScore + preferredScore + experienceScore + educationScore + certificationScore + projectScore;
  if (required.length > 0 && matchedRequired.length === 0) {
    total = Math.min(total, 15); // Cannot rank high without matching any required skills
  }

  const components: ScoreComponent[] = [
    {
      key: "requiredSkills",
      label: "Required skills",
      score: requiredScore,
      max: 55,
      detail:
        required.length === 0
          ? "No required skills specified."
          : `${matchedRequired.length} of ${required.length} required skills matched (${matchedRequired.map((m) => `${m.name} [${m.proficiency}]`).join(", ") || "None"}).`,
    },
    {
      key: "preferredSkills",
      label: "Preferred skills",
      score: preferredScore,
      max: 15,
      detail:
        preferred.length === 0
          ? "No preferred skills specified."
          : `${matchedPreferred.length} of ${preferred.length} preferred skills matched.`,
    },
    {
      key: "experience",
      label: "Experience",
      score: experienceScore,
      max: 15,
      detail:
        job.minExperience <= 0
          ? `${candidate.experienceYears}y demonstrated background.`
          : `${candidate.experienceYears}y exp against ${job.minExperience}y minimum.`,
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
        ? `Verified certification (${matchingCertificate.name}) directly matches role requirements.`
        : "No stack-relevant verified certifications found.",
    },
    {
      key: "projects",
      label: "Projects",
      score: projectScore,
      max: 10,
      detail:
        required.length === 0
          ? "No required technologies specified."
          : `${matchedProjectSkills.length} of ${required.length} required skills demonstrated with public code repository evidence.`,
    },
  ];

  return {
    total: clamp(total, 100),
    components,
  };
}