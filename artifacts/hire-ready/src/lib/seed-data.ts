import type { Candidate, CandidateProject, Job, Skill } from "./types";

const jobRows: Array<
  Omit<Job, "skills" | "id" | "createdAt"> & {
    skills: Array<{ name: string; importance: "required" | "preferred" }>;
  }
> = [
  {
    title: "Frontend Engineer",
    company: "Northstar Labs",
    description:
      "Build accessible, high-performance product experiences for a growing collaboration platform.",
    location: "Bengaluru, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 6,
    education: "bachelors",
    salaryMin: 1800000,
    salaryMax: 2800000,
    status: "active",
    skills: [
      { name: "React", importance: "required" },
      { name: "TypeScript", importance: "required" },
      { name: "JavaScript", importance: "required" },
      { name: "CSS", importance: "required" },
      { name: "Next.js", importance: "preferred" },
      { name: "Accessibility", importance: "preferred" },
    ],
  },
  {
    title: "Senior Frontend Engineer",
    company: "Lattice Health",
    description:
      "Shape thoughtful patient and clinician workflows across a suite of digital health products.",
    location: "Remote, India",
    workMode: "remote",
    employmentType: "full-time",
    minExperience: 5,
    maxExperience: 9,
    education: "bachelors",
    salaryMin: 2600000,
    salaryMax: 3800000,
    status: "active",
    skills: [
      { name: "React", importance: "required" },
      { name: "TypeScript", importance: "required" },
      { name: "Next.js", importance: "required" },
      { name: "Testing", importance: "required" },
      { name: "Accessibility", importance: "preferred" },
      { name: "GraphQL", importance: "preferred" },
    ],
  },
  {
    title: "UI Engineer",
    company: "Morrow Finance",
    description:
      "Deliver precise, responsive interfaces for a modern personal finance product.",
    location: "Mumbai, India",
    workMode: "onsite",
    employmentType: "full-time",
    minExperience: 2,
    maxExperience: 4,
    education: "any",
    salaryMin: 1400000,
    salaryMax: 2200000,
    status: "active",
    skills: [
      { name: "JavaScript", importance: "required" },
      { name: "React", importance: "required" },
      { name: "HTML", importance: "required" },
      { name: "CSS", importance: "required" },
      { name: "Tailwind CSS", importance: "preferred" },
      { name: "Figma", importance: "preferred" },
    ],
  },
  {
    title: "Backend Engineer",
    company: "Relay Commerce",
    description:
      "Design reliable APIs and services that power high-volume commerce experiences.",
    location: "Pune, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 6,
    education: "bachelors",
    salaryMin: 1900000,
    salaryMax: 3000000,
    status: "active",
    skills: [
      { name: "Node.js", importance: "required" },
      { name: "PostgreSQL", importance: "required" },
      { name: "REST APIs", importance: "required" },
      { name: "Docker", importance: "required" },
      { name: "Redis", importance: "preferred" },
      { name: "AWS", importance: "preferred" },
    ],
  },
  {
    title: "Python Backend Developer",
    company: "Aster Analytics",
    description:
      "Build dependable data services and integrations for enterprise analytics teams.",
    location: "Hyderabad, India",
    workMode: "remote",
    employmentType: "full-time",
    minExperience: 2,
    maxExperience: 5,
    education: "bachelors",
    salaryMin: 1600000,
    salaryMax: 2600000,
    status: "active",
    skills: [
      { name: "Python", importance: "required" },
      { name: "PostgreSQL", importance: "required" },
      { name: "REST APIs", importance: "required" },
      { name: "Docker", importance: "required" },
      { name: "Redis", importance: "preferred" },
      { name: "AWS", importance: "preferred" },
    ],
  },
  {
    title: "Platform API Engineer",
    company: "Cirrus Mobility",
    description:
      "Own API reliability and developer tooling for a multi-sided mobility platform.",
    location: "Delhi NCR, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 4,
    maxExperience: 7,
    education: "bachelors",
    salaryMin: 2200000,
    salaryMax: 3400000,
    status: "active",
    skills: [
      { name: "Node.js", importance: "required" },
      { name: "GraphQL", importance: "required" },
      { name: "PostgreSQL", importance: "required" },
      { name: "Redis", importance: "required" },
      { name: "Kubernetes", importance: "preferred" },
      { name: "CI/CD", importance: "preferred" },
    ],
  },
  {
    title: "Data Analyst",
    company: "Goodwell Energy",
    description:
      "Turn operational data into clear reporting that helps teams plan a cleaner grid.",
    location: "Bengaluru, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 2,
    maxExperience: 4,
    education: "bachelors",
    salaryMin: 1300000,
    salaryMax: 2100000,
    status: "active",
    skills: [
      { name: "SQL", importance: "required" },
      { name: "Python", importance: "required" },
      { name: "Tableau", importance: "required" },
      { name: "Excel", importance: "required" },
      { name: "Power BI", importance: "preferred" },
      { name: "Pandas", importance: "preferred" },
    ],
  },
  {
    title: "Product Data Analyst",
    company: "Tandem Learning",
    description:
      "Help product teams understand learner behavior through rigorous analysis and storytelling.",
    location: "Remote, India",
    workMode: "remote",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 6,
    education: "bachelors",
    salaryMin: 1700000,
    salaryMax: 2600000,
    status: "active",
    skills: [
      { name: "SQL", importance: "required" },
      { name: "Python", importance: "required" },
      { name: "Pandas", importance: "required" },
      { name: "Tableau", importance: "required" },
      { name: "dbt", importance: "preferred" },
      { name: "Statistics", importance: "preferred" },
    ],
  },
  {
    title: "Business Intelligence Analyst",
    company: "Cedar Retail",
    description:
      "Create trusted dashboards and datasets for merchandising and operations leaders.",
    location: "Chennai, India",
    workMode: "onsite",
    employmentType: "full-time",
    minExperience: 2,
    maxExperience: 5,
    education: "any",
    salaryMin: 1200000,
    salaryMax: 2000000,
    status: "active",
    skills: [
      { name: "SQL", importance: "required" },
      { name: "Power BI", importance: "required" },
      { name: "Excel", importance: "required" },
      { name: "Data modeling", importance: "required" },
      { name: "Python", importance: "preferred" },
      { name: "Snowflake", importance: "preferred" },
    ],
  },
  {
    title: "DevOps Engineer",
    company: "OrbitStack",
    description:
      "Make deployments safer and infrastructure easier to operate for product teams.",
    location: "Pune, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 6,
    education: "bachelors",
    salaryMin: 2000000,
    salaryMax: 3200000,
    status: "active",
    skills: [
      { name: "AWS", importance: "required" },
      { name: "Docker", importance: "required" },
      { name: "Kubernetes", importance: "required" },
      { name: "Terraform", importance: "required" },
      { name: "Linux", importance: "preferred" },
      { name: "CI/CD", importance: "preferred" },
    ],
  },
  {
    title: "Cloud Infrastructure Engineer",
    company: "Aperture Systems",
    description:
      "Build resilient cloud foundations for teams moving critical workloads to AWS.",
    location: "Remote, India",
    workMode: "remote",
    employmentType: "full-time",
    minExperience: 4,
    maxExperience: 8,
    education: "bachelors",
    salaryMin: 2400000,
    salaryMax: 3800000,
    status: "active",
    skills: [
      { name: "AWS", importance: "required" },
      { name: "Terraform", importance: "required" },
      { name: "Linux", importance: "required" },
      { name: "CI/CD", importance: "required" },
      { name: "Kubernetes", importance: "preferred" },
      { name: "Prometheus", importance: "preferred" },
    ],
  },
  {
    title: "Site Reliability Engineer",
    company: "Beacon Health",
    description:
      "Improve service health, observability, and incident response for a care platform.",
    location: "Hyderabad, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 4,
    maxExperience: 7,
    education: "bachelors",
    salaryMin: 2300000,
    salaryMax: 3600000,
    status: "active",
    skills: [
      { name: "Linux", importance: "required" },
      { name: "AWS", importance: "required" },
      { name: "Docker", importance: "required" },
      { name: "Prometheus", importance: "required" },
      { name: "Kubernetes", importance: "preferred" },
      { name: "Python", importance: "preferred" },
    ],
  },
  {
    title: "Full-Stack Engineer",
    company: "Commonplace",
    description:
      "Build end-to-end features for a platform that helps local communities organize.",
    location: "Bengaluru, India",
    workMode: "hybrid",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 6,
    education: "bachelors",
    salaryMin: 1900000,
    salaryMax: 3000000,
    status: "active",
    skills: [
      { name: "React", importance: "required" },
      { name: "TypeScript", importance: "required" },
      { name: "Node.js", importance: "required" },
      { name: "PostgreSQL", importance: "required" },
      { name: "AWS", importance: "preferred" },
      { name: "GraphQL", importance: "preferred" },
    ],
  },
  {
    title: "Product Engineer",
    company: "Mosaic Studio",
    description:
      "Take product ideas from prototype to production across a modern web stack.",
    location: "Remote, India",
    workMode: "remote",
    employmentType: "full-time",
    minExperience: 2,
    maxExperience: 5,
    education: "any",
    salaryMin: 1700000,
    salaryMax: 2700000,
    status: "active",
    skills: [
      { name: "React", importance: "required" },
      { name: "TypeScript", importance: "required" },
      { name: "Node.js", importance: "required" },
      { name: "REST APIs", importance: "required" },
      { name: "Figma", importance: "preferred" },
      { name: "PostgreSQL", importance: "preferred" },
    ],
  },
  {
    title: "Software Engineer, Full Stack",
    company: "Greenline",
    description:
      "Ship customer-facing features and internal tools for a fast-growing climate company.",
    location: "Mumbai, India",
    workMode: "onsite",
    employmentType: "full-time",
    minExperience: 3,
    maxExperience: 7,
    education: "bachelors",
    salaryMin: 2100000,
    salaryMax: 3400000,
    status: "active",
    skills: [
      { name: "JavaScript", importance: "required" },
      { name: "React", importance: "required" },
      { name: "Node.js", importance: "required" },
      { name: "PostgreSQL", importance: "required" },
      { name: "Docker", importance: "preferred" },
      { name: "Python", importance: "preferred" },
    ],
  },
];

export const seedJobs: Job[] = jobRows.map((job, index) => ({
  ...job,
  id: `job-${String(index + 1).padStart(3, "0")}`,
  createdAt: "2026-09-18T09:00:00.000Z",
}));

const names = [
  "Aarav Mehta",
  "Mira Shah",
  "Rohan Iyer",
  "Nisha Rao",
  "Kabir Malhotra",
  "Ananya Menon",
  "Dev Patel",
  "Ishita Kapoor",
  "Arjun Nair",
  "Sana Qureshi",
  "Vihaan Kulkarni",
  "Tara Banerjee",
  "Neel Desai",
  "Diya Reddy",
  "Kunal Sethi",
  "Aditi Bose",
  "Ibrahim Khan",
  "Meera Joshi",
  "Aditya Pillai",
  "Saanvi Arora",
  "Rahul Bhat",
  "Pooja Krishnan",
  "Yash Agarwal",
  "Leela Fernandes",
  "Om Prakash",
  "Riya Chawla",
  "Siddharth Roy",
  "Kavya Shetty",
  "Manav Jain",
  "Zoya Thomas",
  "Parth Shah",
  "Maya Suresh",
  "Rehan Siddiqui",
  "Ira Ghosh",
  "Nikhil Verma",
  "Tanvi Deshmukh",
  "Atharv Das",
  "Sia Bhandari",
  "Jayant Rao",
  "Noor Ansari",
];

const roleTracks = [
  {
    headline: "Frontend engineer",
    skills: [
      "React",
      "TypeScript",
      "JavaScript",
      "CSS",
      "HTML",
      "Next.js",
      "Tailwind CSS",
      "Accessibility",
      "Testing",
      "Figma",
    ],
  },
  {
    headline: "Backend engineer",
    skills: [
      "Node.js",
      "Python",
      "PostgreSQL",
      "REST APIs",
      "Docker",
      "Redis",
      "GraphQL",
      "AWS",
      "Linux",
      "CI/CD",
    ],
  },
  {
    headline: "Data analyst",
    skills: [
      "SQL",
      "Python",
      "Tableau",
      "Excel",
      "Power BI",
      "Pandas",
      "dbt",
      "Statistics",
      "Snowflake",
      "Data modeling",
    ],
  },
  {
    headline: "DevOps engineer",
    skills: [
      "AWS",
      "Docker",
      "Kubernetes",
      "Terraform",
      "Linux",
      "CI/CD",
      "Prometheus",
      "Python",
      "PostgreSQL",
      "GitHub Actions",
    ],
  },
  {
    headline: "Full-stack engineer",
    skills: [
      "React",
      "TypeScript",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker",
      "GraphQL",
      "Next.js",
      "REST APIs",
      "JavaScript",
    ],
  },
];

const locations = [
  "Bengaluru, India",
  "Mumbai, India",
  "Hyderabad, India",
  "Pune, India",
  "Delhi NCR, India",
  "Chennai, India",
  "Remote, India",
];

const educationLevels: Candidate["education"][] = [
  "diploma",
  "bachelors",
  "bachelors",
  "masters",
  "bachelors",
  "phd",
];

const proficiencyLevels: Skill["proficiency"][] = [
  "intermediate",
  "advanced",
  "expert",
  "beginner",
];

const certificateTemplates = [
  {
    name: "AWS Certified Developer – Associate",
    issuer: "Amazon Web Services",
  },
  {
    name: "Meta Front-End Developer Professional Certificate",
    issuer: "Meta",
  },
  {
    name: "Google Data Analytics Professional Certificate",
    issuer: "Google",
  },
  {
    name: "Meta Back-End Developer Professional Certificate",
    issuer: "Meta",
  },
  {
    name: "HashiCorp Certified: Terraform Associate",
    issuer: "HashiCorp",
  },
  { name: "Professional Scrum Master I", issuer: "Scrum.org" },
];

function makeCertificate(candidateIndex: number, certIndex: number) {
  const template =
    candidateIndex === 20
      ? {
          name: "Meta Front-End Developer Professional Certificate",
          issuer: "Meta",
        }
      :
    certificateTemplates[(candidateIndex + certIndex * 2) % certificateTemplates.length];
  const suffix = String(candidateIndex + 1).padStart(3, "0");
  const certNumber = String(certIndex + 1).padStart(2, "0");
  const hashSeed = `${candidateIndex + 1}${certIndex + 3}`.padEnd(64, "a");
  const issueDate = `202${(candidateIndex + certIndex) % 5}-0${((candidateIndex + certIndex) % 8) + 1}-15`;
  return {
    ...template,
    credentialId: `HR-${suffix}-${certNumber}`,
    verificationHash:
      candidateIndex === 20 && certIndex === 0
        ? "6c496e723bd8600e4ebbcf7b9afa34fad456c80c0b150c2dc7359a485f4cb716"
        : hashSeed.slice(0, 64),
    issueDate,
    verified: candidateIndex === 20 || (candidateIndex + certIndex) % 5 !== 0,
  };
}

const realGithubProjects = [
  { title: "HireReady Core Engine", repo: "https://github.com/vasudev196006/hireread", demo: "https://hireread.dev" },
  { title: "Distributed ML Training Pipeline", repo: "https://github.com/pytorch/pytorch", demo: "https://pytorch.org" },
  { title: "Next-gen Component Framework", repo: "https://github.com/facebook/react", demo: "https://react.dev" },
  { title: "Enterprise Microservices Platform", repo: "https://github.com/vercel/next.js", demo: "https://nextjs.org" },
  { title: "Predictive Analytics Toolkit", repo: "https://github.com/scikit-learn/scikit-learn", demo: "https://scikit-learn.org" },
  { title: "Automated Cloud Container Mesh", repo: "https://github.com/docker/compose", demo: "https://docker.com" },
  { title: "Cluster Orchestration Controller", repo: "https://github.com/kubernetes/kubernetes", demo: "https://kubernetes.io" },
  { title: "Production RAG Agent System", repo: "https://github.com/langchain-ai/langchain", demo: "https://langchain.com" },
  { title: "Low-Latency In-Memory Cache", repo: "https://github.com/redis/redis", demo: "https://redis.io" },
  { title: "Declarative Infrastructure as Code", repo: "https://github.com/hashicorp/terraform", demo: "https://terraform.io" },
];

const githubProfiles = [
  "vasudev196006",
  "gaearon",
  "antirez",
  "kelseyhightower",
  "mrdoob",
  "shadcn",
  "sindresorhus",
  "tj",
  "bkeepers",
  "mattt",
];

function makeProjects(
  candidateIndex: number,
  skills: Skill[],
): CandidateProject[] {
  const count = candidateIndex % 3 === 0 ? 2 : 1;

  return Array.from({ length: count }, (_, projectIndex) => {
    const projData = realGithubProjects[(candidateIndex + projectIndex * 3) % realGithubProjects.length]!;
    const stackStart = (candidateIndex + projectIndex * 2) % Math.max(skills.length, 1);
    const projectSkills = skills
      .slice(stackStart, stackStart + 4)
      .map((skill) => skill.name);
    const technologies =
      projectSkills.length > 0 ? projectSkills : skills.map((skill) => skill.name);
    return {
      title: projData.title,
      description:
        projectIndex === 0
          ? "A production project focused on verifiable architecture, automated CI/CD, and high throughput."
          : "An open-source library built with comprehensive unit test coverage and production documentation.",
      technologies,
      githubUrl: candidateIndex === 20 && projectIndex === 0
        ? "https://github.com/vasudev196006/hireread"
        : projData.repo,
      liveUrl: projData.demo,
    };
  });
}

function makeCandidate(index: number): Candidate {
  const trackIndex = index % roleTracks.length;
  const variation = Math.floor(index / roleTracks.length);
  const track = roleTracks[trackIndex];
  const count = 4 + ((variation + trackIndex) % 5);
  const offset = (variation * 2 + trackIndex) % track.skills.length;
  const selectedSkillNames = Array.from(
    { length: count },
    (_, skillIndex) => track.skills[(offset + skillIndex) % track.skills.length],
  );
  const experienceYears = Number(
    (0.8 + ((index * 7) % 105) / 10).toFixed(1),
  );
  const skills: Skill[] = selectedSkillNames.map((name, skillIndex) => ({
    name,
    proficiency: proficiencyLevels[(index + skillIndex * 2) % proficiencyLevels.length],
    yearsExperience: Number(
      Math.max(0.2, experienceYears - skillIndex * 0.55).toFixed(1),
    ),
    verified: (index + skillIndex) % 4 !== 0,
  }));
  const certificationCount =
    index === 20 ? 1 : index % 4 === 0 ? 0 : index % 3 === 0 ? 2 : 1;
  const certifications = Array.from({ length: certificationCount }, (_, certIndex) =>
    makeCertificate(index, certIndex),
  );

  const ghUsername = index === 20
    ? "vasudev196006"
    : `${names[index]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "dev"}-${(index + 1) * 7}`;

  const ghUrl = index === 20
    ? "https://github.com/vasudev196006"
    : `https://github.com/${githubProfiles[index % githubProfiles.length] || "vasudev196006"}`;

  return {
    id: `candidate-${String(index + 1).padStart(3, "0")}`,
    name: names[index],
    headline: track.headline,
    location: locations[index % locations.length],
    experienceYears,
    education: educationLevels[(index * 5) % educationLevels.length],
    bio: `${track.headline} with ${experienceYears} years of experience building dependable products. Open source contributor with verifiable code evidence.`,
    skills,
    certifications,
    projects: makeProjects(index, skills),
    githubUsername: ghUsername,
    githubUrl: ghUrl,
  };
}

export const seedCandidates: Candidate[] = Array.from(
  { length: names.length },
  (_, index) => makeCandidate(index),
);

export const currentLearner: Candidate =
  seedCandidates.find((candidate) => candidate.id === "candidate-021") ??
  seedCandidates[0];