export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export type Education =
  | "any"
  | "diploma"
  | "bachelors"
  | "masters"
  | "phd";

export type SkillImportance = "required" | "preferred";

export type ReviewStatus = "auto_verified" | "pending_review" | "rejected";

export type UserRole = "seeker" | "recruiter";

export interface Skill {
  name: string;
  proficiency: Proficiency;
  yearsExperience: number;
  verified: boolean;
  verificationScore?: number; // 0-100 calculated from matching projects and verified certifications
  category?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  credentialId: string;
  verificationHash: string;
  issueDate: string;
  verified: boolean;
  verificationUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileUploadedAt?: string;
  reviewStatus?: ReviewStatus;
}

export interface CandidateProject {
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface Candidate {
  id: string;
  name: string;
  headline: string;
  location: string;
  experienceYears: number;
  education: Education;
  bio: string;
  skills: Skill[];
  certifications: Certification[];
  projects: CandidateProject[];
  targetRole?: string;
  githubUrl?: string;
  githubUsername?: string;
}

export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  redirectUrl: string;
  salaryMin?: number;
  salaryMax?: number;
  contractType?: string;
  created?: string;
  category?: string;
  inferredSkills?: string[];
  matchScore?: number;
}

export interface JobSkill {
  name: string;
  importance: SkillImportance;
  minProficiency?: Proficiency;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  employmentType: "full-time" | "part-time" | "internship" | "contract";
  minExperience: number;
  maxExperience: number;
  education: Education;
  salaryMin: number;
  salaryMax: number;
  status: "active" | "closed" | "draft";
  skills: JobSkill[];
  createdAt?: string;
}

export interface ScoreComponent {
  key:
    | "requiredSkills"
    | "preferredSkills"
    | "experience"
    | "education"
    | "certifications"
    | "projects";
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface MatchScore {
  total: number;
  deterministicTotal?: number;
  aiSemanticBonus?: number;
  components: ScoreComponent[];
  justification?: AIRankingJustification;
}

export interface AISemanticAdjustment {
  candidateSkill: string;
  jobSkill: string;
  similarity: number;
  bonusPoints: number;
  reason: string;
}

export interface AIRankingJustification {
  summary: string;
  keyDrivers: string[];
  pros: string[];
  developmentAreas: string[];
  semanticAdjustments: AISemanticAdjustment[];
  semanticTotalBonus: number;
}

export interface RoleSkillGraphNode {
  id: string;
  roleName: string;
  skillName: string;
  tier: 1 | 2 | 3 | 4; // 1 = Foundational, 2 = Core, 3 = Advanced, 4 = Specialized
  expectedProficiency: Proficiency;
  prerequisites: string[];
  recommendedCertifications: Array<{
    name: string;
    issuer: string;
    level: string;
    url?: string;
  }>;
  estimatedWeeks: number;
  category: string;
}

export interface RoadmapGap {
  node: RoleSkillGraphNode;
  currentProficiency?: Proficiency;
  isMissing: boolean;
  isProficiencyGap: boolean;
  status: "mastered" | "in_progress" | "gap" | "locked";
  prerequisitesMet: boolean;
}

export interface CareerRoadmap {
  targetRole: string;
  overallReadiness: number;
  masteredCount: number;
  totalSkillsCount: number;
  narrative: string;
  milestones: Array<{
    title: string;
    timeframe: string;
    tier: number;
    skills: string[];
    description: string;
  }>;
  suggestedCertifications: Array<{
    name: string;
    issuer: string;
    skill: string;
    level: string;
  }>;
  gapsByTier: Record<number, RoadmapGap[]>;
  allGaps: RoadmapGap[];
}