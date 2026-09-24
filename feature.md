# HireReady / SkillBridge — Feature Spec: Role-Based Access, Roadmaps & AI Ranking

> **Scope**: This document specifies three new/extended features on top of the existing MVP architecture: (1) role-based login (Job Seeker vs. Recruiter), (2) a seeker-side certification/skill upload + AI-generated career roadmap, and (3) a recruiter-side required-skill definition + AI-assisted candidate ranking. It extends, and does not replace, the base architecture and deterministic scoring engine already defined.

---

## 1. Role-Based Login

At login/signup, the user picks exactly one role. This choice determines which dashboard and routes they land on.

| Role | Landing Route | Core Capability |
| :--- | :--- | :--- |
| **Job Seeker** | `/seeker/dashboard` | Build profile, upload skills/certifications, view career roadmap |
| **Recruiter** | `/recruiter/dashboard` | Post jobs, define required skills, view AI-ranked candidates |

**Flow:**
1. Landing page shows two entry points: **"I'm a Job Seeker"** and **"I'm a Recruiter."**
2. Each opens the same login/signup form, but tags the resulting session with `role`.
3. `role` is stored on the `users` table (already defined as `candidate` / `recruiter` / `admin` — treat `candidate` as the internal value for "Job Seeker" for schema continuity, but surface it as "Job Seeker" everywhere in the UI).
4. Route guards redirect a seeker away from `/recruiter/*` routes and vice versa. Admin remains a separate internal role, not exposed as a third public login option.

No cross-role dashboard should be reachable without switching roles via logout/login (or an explicit role-switch action if you support one account holding both roles later — out of scope for now).

---

## 2. Job Seeker: Certification & Skill Upload

### 2.1 What gets uploaded
- **Skills**: seeker selects from the existing skills taxonomy (`public.skills`) or free-types a new one (added to the taxonomy for admin review), sets proficiency (`beginner` / `intermediate` / `advanced` / `expert`) and years of experience — maps directly to `candidate_skills`.
- **Certifications**: name, issuer, credential ID, issue date, and either a verification URL or an uploaded certificate file (PDF/image). Maps to `certifications`.
- **Projects**: title, description, GitHub/live URL, technologies used — maps to `projects`.

### 2.2 Verification behavior
- A certification with a verification URL or a matching credential ID pattern from a known issuer (Coursera, AWS, Google, etc.) is marked `verified = true` automatically.
- An uploaded file with no verifiable URL is stored but flagged `verified = false` until reviewed — this feeds directly into the existing Section 4 scoring formula's Certifications factor, so verification status has real downstream weight, not just a cosmetic badge.
- Skills gain a `verification_score` bump when backed by at least one verified certification or project that references that technology (e.g., a project tagged `React` lends partial verification weight to a self-reported `React` skill).

### 2.3 New/extended data model

```sql
-- Extend certifications to support uploaded files
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Track review status for unverifiable uploads
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'auto_verified'
  CHECK (review_status IN ('auto_verified', 'pending_review', 'rejected'));
```

### 2.4 New API endpoints
- `POST /api/seeker/skills` — add/update a skill entry for the logged-in seeker.
- `POST /api/seeker/certifications` — add a certification (with optional file upload).
- `GET /api/seeker/profile` — full profile: skills, certifications, projects, verification statuses.

---

## 3. Job Seeker: Career Roadmap ("What Should I Learn Next")

### 3.1 Concept
A seeker selects (or is inferred to have) a **current role or target role** — e.g., "Data Scientist." The system compares their verified + self-reported skills against a **role skill graph** for that target and produces an ordered roadmap: what to learn next, in what sequence, and which certifications are worth pursuing.

### 3.2 Role skill graph
Each target role has a curated, ordered set of skills with prerequisite relationships and tiers:

```
Data Scientist — Example Skill Graph
Tier 1 (Foundational): Python, Statistics, SQL
Tier 2 (Core):         Pandas/NumPy, Data Visualization, Machine Learning Fundamentals
Tier 3 (Advanced):     Deep Learning, MLOps, A/B Testing & Experiment Design
Tier 4 (Specialized):  NLP or Computer Vision (branch), Cloud ML (AWS/GCP/Azure)
```

Stored as a new table:

```sql
CREATE TABLE IF NOT EXISTS public.role_skill_graph (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT NOT NULL,              -- e.g. 'Data Scientist'
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL,                -- 1 = foundational ... 4 = specialized
  prerequisite_skill_id UUID REFERENCES public.skills(id),
  recommended_certifications TEXT[] DEFAULT '{}',
  UNIQUE (role_name, skill_id)
);
```

### 3.3 Roadmap generation logic
1. **Gap detection (deterministic)**: diff the seeker's `candidate_skills` against `role_skill_graph` rows for the target role, ordered by tier. Anything missing or below the expected proficiency becomes a gap.
2. **Sequencing (deterministic)**: gaps are ordered by tier, then by prerequisite chain — a seeker can't be told to learn "MLOps" before "Python" even if both are gaps.
3. **AI layer (generative)**: an LLM call takes the ordered gap list + the seeker's current proficiency levels and produces:
   - A short, personalized narrative ("You're strong on foundations — Python and SQL are solid. Your biggest lever right now is Machine Learning Fundamentals...")
   - Specific certification or course suggestions per gap (pulled from `recommended_certifications`, reworded contextually)
   - A realistic milestone sequence (e.g., "next 4–6 weeks," "next quarter")

This keeps the **ranking/ordering deterministic and auditable** (same as the recruiter-side matching engine) while using AI only for the **explanatory and suggestion layer**, not for deciding what's a gap — that stays rule-based so it can't hallucinate a wrong prerequisite.

### 3.4 New API endpoint
- `GET /api/seeker/roadmap?targetRole={role}` — returns `{ currentSkills, gapsByTier, narrative, suggestedCertifications, milestones }`.

### 3.5 New route
- `/seeker/roadmap` (extends the existing `/skill-gap` and `/learning-path` concepts from the base spec into one unified, role-driven view) — radar chart of current vs. required skills, plus the tiered roadmap list with AI-generated narrative and certification suggestions inline.

---

## 4. Recruiter: Define Required Skills

Already partially covered by the base spec's Job Wizard (`/create-job`, Step 2: Skill Matrix). This section extends it:

- Recruiter selects skills from the shared taxonomy and marks each **Required** or **Preferred** (existing `job_skills.importance`).
- Recruiter can additionally set a **minimum proficiency** per required skill (new field) so "React, intermediate+" is distinguishable from just "React."
- **AI Suggestions** (already named in the base spec's Step 2) becomes concrete here: given a job title + description, an LLM call suggests a starter skill list (e.g., typing "Senior Data Scientist" suggests Python, SQL, Machine Learning, MLOps, Cloud ML as required, with Deep Learning and NLP as preferred) — pulled from the same `role_skill_graph` used on the seeker side, so both sides of the platform reference one consistent taxonomy.

```sql
ALTER TABLE public.job_skills
  ADD COLUMN IF NOT EXISTS min_proficiency TEXT
  CHECK (min_proficiency IN ('beginner', 'intermediate', 'advanced', 'expert'));
```

---

## 5. Recruiter: AI-Assisted Candidate Ranking

### 5.1 Two-layer ranking model
Ranking stays **hybrid**, not purely AI, so it remains explainable (per the base spec's "deterministic, transparent" philosophy):

1. **Deterministic base score** — the existing Section 4 formula (Required 50% / Preferred 15% / Experience 15% / Education 5% / Certifications 5% / Projects 10%) runs first and produces the auditable 0–100 score already specified.
2. **AI semantic layer (adjustment, not replacement)** — an embedding-based similarity pass catches near-matches the deterministic exact-match logic would otherwise miss: e.g., a candidate listing "Node.js" against a job requiring "Backend JavaScript," or "GCP" against "Cloud Platforms." This layer can add a small bounded adjustment (e.g., up to ±5 points, clearly labeled "AI-adjusted") rather than silently overriding the base score.

### 5.2 Why hybrid, not AI-only
A pure LLM ranking is not reproducible or explainable — two identical candidates could get different scores on different runs, and recruiters (and regulators) generally want to know *why* someone ranked where they did. Keeping the deterministic formula as the score of record, with AI strictly as (a) an explanatory narrative and (b) a small, capped semantic-matching assist, preserves the platform's core differentiator from Section 0/1 of the base spec: verifiable, explainable matching — not a black box.

### 5.3 What the AI layer actually does
- **Semantic skill matching**: embed each candidate skill and each job-required skill; if a candidate lacks an exact match but has a high-similarity skill (e.g., cosine similarity above a set threshold), count it as a partial match in the Required Skills factor rather than a zero.
- **Ranking justification**: for each ranked candidate, generate a short natural-language explanation of the top 2–3 factors driving their score ("Ranked #2 primarily due to 4/5 verified required skills and 3 years above the experience minimum").
- **Recruiter-side gap flagging**: surface which required skills are hardest to find across the full ranked pool ("Only 2 of 40 candidates have verified Kubernetes experience") — useful signal for adjusting the job posting.

### 5.4 New API endpoints
- `GET /api/recruiter/matches/:jobId` — returns ranked candidates with both the deterministic score and any AI semantic adjustment, clearly separated in the response payload.
- `GET /api/recruiter/matches/:jobId/:candidateId/explain` — returns the AI-generated natural-language justification for that candidate's rank.

---

## 6. Route Summary (New/Extended)

| Route | Role | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Two entry points: Job Seeker login / Recruiter login |
| `/seeker/dashboard` | Job Seeker | Profile summary, readiness score, quick links |
| `/seeker/profile/upload` | Job Seeker | Upload skills, certifications, projects |
| `/seeker/roadmap` | Job Seeker | Target-role gap analysis + AI-generated learning roadmap |
| `/recruiter/dashboard` | Recruiter | Active jobs, quick stats |
| `/recruiter/create-job` | Recruiter | Job wizard with required/preferred skill matrix + AI skill suggestions |
| `/recruiter/matches/:jobId` | Recruiter | AI-assisted ranked candidate list with per-candidate explanation |

---

## 7. Summary of New Tables/Columns

- `role_skill_graph` (new) — tiered, prerequisite-aware skill map per target role, shared by both the seeker roadmap and the recruiter AI-suggestion feature.
- `certifications.file_url`, `certifications.file_uploaded_at`, `certifications.review_status` (new columns) — support uploaded, not-yet-verified credentials.
- `job_skills.min_proficiency` (new column) — required proficiency floor per skill.

No existing tables, columns, or behavior from the base architecture spec are removed or changed — everything above is additive.
