import pytest
from backend.services.normalization_service import (
    normalize_adzuna_job,
    normalize_muse_job,
    normalize_remotive_job,
    deduplicate_jobs,
    parse_salary_string
)
from backend.models.schemas import NormalizedJob
from backend.utils.text_processing import extract_skills_from_text, clean_html

def test_clean_html():
    raw = "<p>Join our team as a <b>Software Engineer</b>! &amp; build systems.</p>"
    cleaned = clean_html(raw)
    assert cleaned == "Join our team as a Software Engineer! & build systems."

def test_skill_extraction():
    sample = "We need an engineer proficient in Python, React, AWS, and Docker. Experience with SQL and Kubernetes is a plus."
    skills = extract_skills_from_text(sample)
    assert "Python" in skills
    assert "React" in skills
    assert "AWS" in skills
    assert "Docker" in skills
    assert "SQL" in skills
    assert "Kubernetes" in skills
    assert "Java" not in skills

def test_parse_salary_string():
    s_min, s_max = parse_salary_string("$120,000 - $160,000 a year")
    assert s_min == 120000.0
    assert s_max == 160000.0

    s_min2, s_max2 = parse_salary_string("90k - 110k")
    assert s_min2 == 90000.0
    assert s_max2 == 110000.0

def test_normalize_adzuna_job():
    raw_adzuna = {
        "title": "Senior Python Developer",
        "company": {"display_name": "Tech Corp"},
        "location": {"display_name": "Bengaluru, Karnataka", "area": ["India", "Karnataka"]},
        "description": "Looking for Python, PostgreSQL, and Linux expert.",
        "salary_min": 1500000,
        "salary_max": 2500000,
        "contract_time": "permanent",
        "category": {"label": "IT Jobs"},
        "created": "2026-09-20T10:00:00Z",
        "redirect_url": "https://adzuna.example.com/job/123"
    }
    normalized = normalize_adzuna_job(raw_adzuna, "in")
    assert normalized.source == "adzuna"
    assert normalized.title == "Senior Python Developer"
    assert normalized.company == "Tech Corp"
    assert "Python" in normalized.skills
    assert "PostgreSQL" in normalized.skills
    assert normalized.salary_min == 1500000.0
    assert normalized.salary_max == 2500000.0

def test_normalize_muse_job():
    raw_muse = {
        "name": "Cloud Engineer",
        "company": {"name": "Innovate Ltd"},
        "locations": [{"name": "New York, NY"}],
        "contents": "<p>Experience in AWS, Terraform, and Docker required.</p>",
        "categories": [{"name": "Software Engineering"}],
        "type": "external",
        "publication_date": "2026-09-18T12:00:00Z",
        "refs": {"landing_page": "https://themuse.com/job/456"}
    }
    normalized = normalize_muse_job(raw_muse)
    assert normalized.source == "muse"
    assert normalized.title == "Cloud Engineer"
    assert normalized.company == "Innovate Ltd"
    assert "AWS" in normalized.skills
    assert "Docker" in normalized.skills
    assert normalized.url == "https://themuse.com/job/456"

def test_normalize_remotive_job():
    raw_remotive = {
        "id": 789,
        "title": "Backend Python / Django Specialist",
        "company_name": "RemoteScale",
        "candidate_required_location": "USA Only",
        "category": "Software Development",
        "tags": ["python", "django", "git"],
        "job_type": "full_time",
        "publication_date": "2026-09-22T08:00:00Z",
        "salary": "$130,000 - $160,000",
        "description": "Build high throughput APIs using Python, Git, and SQL.",
        "url": "https://remotive.com/remote-jobs/backend-specialist-789"
    }
    normalized = normalize_remotive_job(raw_remotive)
    assert normalized.source == "remotive"
    assert normalized.title == "Backend Python / Django Specialist"
    assert normalized.company == "RemoteScale"
    assert normalized.salary_min == 130000.0
    assert normalized.salary_max == 160000.0
    assert "Python" in normalized.skills
    assert "Git" in normalized.skills
    assert normalized.url == "https://remotive.com/remote-jobs/backend-specialist-789"

def test_deduplicate_jobs():
    job1 = NormalizedJob(
        source="adzuna",
        sources=["adzuna"],
        title="Full Stack Developer",
        company="Acme Corp",
        location="Bengaluru",
        country="IN",
        salary_min=100000,
        salary_max=120000,
        job_type="Full-time",
        category="Engineering",
        skills=["Python"],
        publication_date="2026-09-20",
        description="Build web applications.",
        url="https://adzuna.com/job/1"
    )
    # Duplicate with slightly different casing and suffix
    job2 = NormalizedJob(
        source="muse",
        sources=["muse"],
        title="Full Stack Developer",
        company="Acme Corp Inc.",
        location="Bengaluru",
        country="IN",
        salary_min=None,
        salary_max=None,
        job_type="Full-time",
        category="Software Engineering",
        skills=["Python", "React"],
        publication_date="2026-09-21",
        description="Build web applications.",
        url="https://themuse.com/job/2"
    )
    job3 = NormalizedJob(
        source="remotive",
        sources=["remotive"],
        title="DevOps Engineer",
        company="Other Corp",
        location="Remote",
        country="GLOBAL",
        salary_min=140000,
        salary_max=160000,
        job_type="Full-time",
        category="DevOps",
        skills=["Kubernetes"],
        publication_date="2026-09-22",
        description="Manage clusters.",
        url="https://remotive.com/job/3"
    )

    deduped = deduplicate_jobs([job1, job2, job3])
    assert len(deduped) == 2
    merged_job = deduped[0]
    assert "adzuna" in merged_job.sources
    assert "muse" in merged_job.sources
    assert merged_job.salary_min == 100000
