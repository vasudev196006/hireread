export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export type Education =
  | "any"
  | "diploma"
  | "bachelors"
  | "masters"
  | "phd";

export type SkillImportance = "required" | "preferred";

export interface Skill {
  name: string;
  proficiency: Proficiency;
  yearsExperience: number;
  verified: boolean;
}

export interface Certification {
  name: string;
  issuer: string;
  credentialId: string;
  verificationHash: string;
  issueDate: string;
  verified: boolean;
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
}

export interface JobSkill {
  name: string;
  importance: SkillImportance;
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
  components: ScoreComponent[];
}