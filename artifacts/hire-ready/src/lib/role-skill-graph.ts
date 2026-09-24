import type { RoleSkillGraphNode, Proficiency } from "./types";

export const roleSkillGraphs: Record<string, RoleSkillGraphNode[]> = {
  "Data Scientist": [
    // Tier 1: Foundational
    {
      id: "ds-t1-1",
      roleName: "Data Scientist",
      skillName: "Python",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: [],
      category: "Programming",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Python for Everybody Specialization", issuer: "Coursera / Univ. of Michigan", level: "Foundational" },
      ],
    },
    {
      id: "ds-t1-2",
      roleName: "Data Scientist",
      skillName: "SQL",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: [],
      category: "Data Management",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "SQL for Data Science", issuer: "UC Davis / Coursera", level: "Foundational" },
      ],
    },
    {
      id: "ds-t1-3",
      roleName: "Data Scientist",
      skillName: "Statistics & Probability",
      tier: 1,
      expectedProficiency: "intermediate",
      prerequisites: [],
      category: "Mathematics",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Applied Statistics with Python", issuer: "Stanford Online", level: "Core" },
      ],
    },

    // Tier 2: Core
    {
      id: "ds-t2-1",
      roleName: "Data Scientist",
      skillName: "Pandas & NumPy",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Python"],
      category: "Data Analysis",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Google Data Analytics Professional Certificate", issuer: "Google", level: "Professional" },
      ],
    },
    {
      id: "ds-t2-2",
      roleName: "Data Scientist",
      skillName: "Data Visualization",
      tier: 2,
      expectedProficiency: "intermediate",
      prerequisites: ["Python", "Pandas & NumPy"],
      category: "Data Analysis",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "Data Visualization with Tableau & Seaborn", issuer: "Tableau", level: "Core" },
      ],
    },
    {
      id: "ds-t2-3",
      roleName: "Data Scientist",
      skillName: "Machine Learning Fundamentals",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Python", "Statistics & Probability", "Pandas & NumPy"],
      category: "Machine Learning",
      estimatedWeeks: 6,
      recommendedCertifications: [
        { name: "Machine Learning Specialization", issuer: "DeepLearning.AI / Stanford", level: "Essential" },
      ],
    },

    // Tier 3: Advanced
    {
      id: "ds-t3-1",
      roleName: "Data Scientist",
      skillName: "Deep Learning",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["Machine Learning Fundamentals"],
      category: "AI & Deep Learning",
      estimatedWeeks: 6,
      recommendedCertifications: [
        { name: "Deep Learning Specialization", issuer: "DeepLearning.AI", level: "Advanced" },
      ],
    },
    {
      id: "ds-t3-2",
      roleName: "Data Scientist",
      skillName: "MLOps & Model Deployment",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["Machine Learning Fundamentals", "SQL"],
      category: "Engineering",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Machine Learning Engineering for Production (MLOps)", issuer: "DeepLearning.AI", level: "Advanced" },
      ],
    },
    {
      id: "ds-t3-3",
      roleName: "Data Scientist",
      skillName: "A/B Testing & Experiment Design",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["Statistics & Probability"],
      category: "Experimentation",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Experimentation & Causal Inference", issuer: "HarvardX", level: "Advanced" },
      ],
    },

    // Tier 4: Specialized
    {
      id: "ds-t4-1",
      roleName: "Data Scientist",
      skillName: "Natural Language Processing (NLP)",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["Deep Learning"],
      category: "Specialization",
      estimatedWeeks: 5,
      recommendedCertifications: [
        { name: "Natural Language Processing Specialization", issuer: "DeepLearning.AI", level: "Expert" },
      ],
    },
    {
      id: "ds-t4-2",
      roleName: "Data Scientist",
      skillName: "Cloud ML (AWS / GCP / Azure)",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["MLOps & Model Deployment"],
      category: "Cloud Engineering",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "AWS Certified Machine Learning – Specialty", issuer: "Amazon Web Services", level: "Specialty" },
        { name: "Google Professional Machine Learning Engineer", issuer: "Google Cloud", level: "Specialty" },
      ],
    },
  ],

  "Full Stack Developer": [
    // Tier 1: Foundational
    {
      id: "fs-t1-1",
      roleName: "Full Stack Developer",
      skillName: "JavaScript",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: [],
      category: "Core Web",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Meta Front-End Developer Professional Certificate", issuer: "Meta", level: "Foundational" },
      ],
    },
    {
      id: "fs-t1-2",
      roleName: "Full Stack Developer",
      skillName: "TypeScript",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: ["JavaScript"],
      category: "Core Web",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "TypeScript Core Concepts", issuer: "Microsoft Learn", level: "Core" },
      ],
    },
    {
      id: "fs-t1-3",
      roleName: "Full Stack Developer",
      skillName: "HTML & CSS",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: [],
      category: "Core Web",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "Responsive Web Design Certification", issuer: "freeCodeCamp", level: "Foundational" },
      ],
    },

    // Tier 2: Core
    {
      id: "fs-t2-1",
      roleName: "Full Stack Developer",
      skillName: "React",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["JavaScript", "TypeScript", "HTML & CSS"],
      category: "Frontend",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Advanced React", issuer: "Meta", level: "Core" },
      ],
    },
    {
      id: "fs-t2-2",
      roleName: "Full Stack Developer",
      skillName: "Node.js",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["JavaScript", "TypeScript"],
      category: "Backend",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Node.js Application Development (LFW211)", issuer: "OpenJS Foundation", level: "Core" },
      ],
    },
    {
      id: "fs-t2-3",
      roleName: "Full Stack Developer",
      skillName: "PostgreSQL & SQL",
      tier: 2,
      expectedProficiency: "intermediate",
      prerequisites: [],
      category: "Database",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "PostgreSQL for Everybody", issuer: "Univ. of Michigan", level: "Core" },
      ],
    },
    {
      id: "fs-t2-4",
      roleName: "Full Stack Developer",
      skillName: "REST & GraphQL APIs",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Node.js"],
      category: "API Design",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "Building Scalable APIs with GraphQL", issuer: "Apollo GraphQL", level: "Core" },
      ],
    },

    // Tier 3: Advanced
    {
      id: "fs-t3-1",
      roleName: "Full Stack Developer",
      skillName: "Next.js & Modern SSR",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["React", "Node.js"],
      category: "Full Stack Framework",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Next.js Enterprise Certification", issuer: "Vercel", level: "Advanced" },
      ],
    },
    {
      id: "fs-t3-2",
      roleName: "Full Stack Developer",
      skillName: "Docker & Containerization",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["Node.js"],
      category: "DevOps",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "Docker Certified Associate", issuer: "Mirantis / Docker", level: "Advanced" },
      ],
    },
    {
      id: "fs-t3-3",
      roleName: "Full Stack Developer",
      skillName: "Redis & System Caching",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["Node.js", "PostgreSQL & SQL"],
      category: "Architecture",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "Redis Certified Developer", issuer: "Redis University", level: "Advanced" },
      ],
    },

    // Tier 4: Specialized
    {
      id: "fs-t4-1",
      roleName: "Full Stack Developer",
      skillName: "Cloud Architecture (AWS/GCP)",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["Docker & Containerization"],
      category: "Cloud",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", level: "Professional" },
      ],
    },
    {
      id: "fs-t4-2",
      roleName: "Full Stack Developer",
      skillName: "Microservices & Distributed Systems",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["Next.js & Modern SSR", "Docker & Containerization"],
      category: "Architecture",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Software Architecture & Design", issuer: "Georgia Tech", level: "Expert" },
      ],
    },
  ],

  "Cloud & DevOps Engineer": [
    // Tier 1: Foundational
    {
      id: "dev-t1-1",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Linux Administration",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: [],
      category: "Systems",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Red Hat Certified System Administrator (RHCSA)", issuer: "Red Hat", level: "Foundational" },
      ],
    },
    {
      id: "dev-t1-2",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Bash & Python Scripting",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: ["Linux Administration"],
      category: "Scripting",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Automating with Python & Shell", issuer: "Google", level: "Core" },
      ],
    },
    {
      id: "dev-t1-3",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Networking & DNS Fundamentals",
      tier: 1,
      expectedProficiency: "intermediate",
      prerequisites: [],
      category: "Infrastructure",
      estimatedWeeks: 2,
      recommendedCertifications: [
        { name: "CompTIA Network+", issuer: "CompTIA", level: "Foundational" },
      ],
    },

    // Tier 2: Core
    {
      id: "dev-t2-1",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Docker & Containerization",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Linux Administration"],
      category: "Containers",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Docker Certified Associate", issuer: "Docker", level: "Core" },
      ],
    },
    {
      id: "dev-t2-2",
      roleName: "Cloud & DevOps Engineer",
      skillName: "AWS Cloud Infrastructure",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Networking & DNS Fundamentals"],
      category: "Cloud",
      estimatedWeeks: 5,
      recommendedCertifications: [
        { name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", level: "Core" },
      ],
    },
    {
      id: "dev-t2-3",
      roleName: "Cloud & DevOps Engineer",
      skillName: "CI/CD Pipelines (GitHub Actions/GitLab)",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Bash & Python Scripting", "Docker & Containerization"],
      category: "Automation",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "GitHub Actions Automation Certification", issuer: "GitHub", level: "Core" },
      ],
    },

    // Tier 3: Advanced
    {
      id: "dev-t3-1",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Kubernetes (K8s)",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["Docker & Containerization", "AWS Cloud Infrastructure"],
      category: "Orchestration",
      estimatedWeeks: 6,
      recommendedCertifications: [
        { name: "Certified Kubernetes Administrator (CKA)", issuer: "Cloud Native Computing Foundation", level: "Advanced" },
      ],
    },
    {
      id: "dev-t3-2",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Terraform & IaC",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["AWS Cloud Infrastructure"],
      category: "Infrastructure as Code",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "HashiCorp Certified: Terraform Associate", issuer: "HashiCorp", level: "Advanced" },
      ],
    },
    {
      id: "dev-t3-3",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Observability (Prometheus / Grafana)",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["Kubernetes (K8s)"],
      category: "Monitoring",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Prometheus Certified Associate (PCA)", issuer: "CNCF", level: "Advanced" },
      ],
    },

    // Tier 4: Specialized
    {
      id: "dev-t4-1",
      roleName: "Cloud & DevOps Engineer",
      skillName: "GitOps & ArgoCD",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["Kubernetes (K8s)", "CI/CD Pipelines (GitHub Actions/GitLab)"],
      category: "GitOps",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "GitOps Fundamentals", issuer: "Codefresh / CNCF", level: "Specialized" },
      ],
    },
    {
      id: "dev-t4-2",
      roleName: "Cloud & DevOps Engineer",
      skillName: "Cloud Security & DevSecOps",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["AWS Cloud Infrastructure", "Kubernetes (K8s)"],
      category: "Security",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "AWS Certified Security – Specialty", issuer: "Amazon Web Services", level: "Specialty" },
        { name: "Certified Kubernetes Security Specialist (CKS)", issuer: "CNCF", level: "Specialty" },
      ],
    },
  ],

  "AI & Machine Learning Engineer": [
    // Tier 1: Foundational
    {
      id: "ai-t1-1",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Python",
      tier: 1,
      expectedProficiency: "expert",
      prerequisites: [],
      category: "Programming",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Google Professional Data Engineer", issuer: "Google", level: "Foundational" },
      ],
    },
    {
      id: "ai-t1-2",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Linear Algebra & Optimization",
      tier: 1,
      expectedProficiency: "intermediate",
      prerequisites: [],
      category: "Mathematics",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Mathematics for Machine Learning", issuer: "Imperial College London", level: "Foundational" },
      ],
    },
    {
      id: "ai-t1-3",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Data Structures & Algorithms",
      tier: 1,
      expectedProficiency: "advanced",
      prerequisites: ["Python"],
      category: "CS Fundamentals",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Algorithms Specialization", issuer: "Stanford", level: "Core" },
      ],
    },

    // Tier 2: Core
    {
      id: "ai-t2-1",
      roleName: "AI & Machine Learning Engineer",
      skillName: "PyTorch",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Python", "Linear Algebra & Optimization"],
      category: "Deep Learning Framework",
      estimatedWeeks: 5,
      recommendedCertifications: [
        { name: "Deep Neural Networks with PyTorch", issuer: "IBM / DeepLearning.AI", level: "Core" },
      ],
    },
    {
      id: "ai-t2-2",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Scikit-Learn & Feature Engineering",
      tier: 2,
      expectedProficiency: "advanced",
      prerequisites: ["Python"],
      category: "Machine Learning",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "Applied Machine Learning in Python", issuer: "Univ. of Michigan", level: "Core" },
      ],
    },

    // Tier 3: Advanced
    {
      id: "ai-t3-1",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Transformer Architecture & LLMs",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["PyTorch"],
      category: "Generative AI",
      estimatedWeeks: 5,
      recommendedCertifications: [
        { name: "Generative AI with Large Language Models", issuer: "AWS & DeepLearning.AI", level: "Advanced" },
      ],
    },
    {
      id: "ai-t3-2",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Vector Databases & RAG Pipelines",
      tier: 3,
      expectedProficiency: "advanced",
      prerequisites: ["Transformer Architecture & LLMs", "Python"],
      category: "AI Engineering",
      estimatedWeeks: 3,
      recommendedCertifications: [
        { name: "LangChain & LlamaIndex for Production RAG", issuer: "DeepLearning.AI", level: "Advanced" },
      ],
    },
    {
      id: "ai-t3-3",
      roleName: "AI & Machine Learning Engineer",
      skillName: "MLOps & Model Serving",
      tier: 3,
      expectedProficiency: "intermediate",
      prerequisites: ["PyTorch"],
      category: "Deployment",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Full Stack LLM Application Engineering", issuer: "Weights & Biases", level: "Advanced" },
      ],
    },

    // Tier 4: Specialized
    {
      id: "ai-t4-1",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Autonomous Agents & Tool Calling",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["Vector Databases & RAG Pipelines"],
      category: "Advanced AI",
      estimatedWeeks: 4,
      recommendedCertifications: [
        { name: "Building Multi-Agent AI Systems", issuer: "DeepLearning.AI", level: "Specialty" },
      ],
    },
    {
      id: "ai-t4-2",
      roleName: "AI & Machine Learning Engineer",
      skillName: "Distributed Model Training & vLLM",
      tier: 4,
      expectedProficiency: "intermediate",
      prerequisites: ["PyTorch", "MLOps & Model Serving"],
      category: "Performance",
      estimatedWeeks: 5,
      recommendedCertifications: [
        { name: "Scaling Deep Learning Systems", issuer: "NVIDIA Deep Learning Institute", level: "Specialty" },
      ],
    },
  ],
};

export const availableTargetRoles = Object.keys(roleSkillGraphs);
