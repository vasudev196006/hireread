import pytest
from backend.models.schemas import NormalizedJob
from backend.services.statistics_service import calculate_statistics

def test_calculate_statistics_empty():
    stats = calculate_statistics([])
    assert stats.total_jobs == 0
    assert stats.jobs_per_source == {}
    assert stats.top_skills == []
    assert stats.salary_statistics.jobs_with_salary == 0
    assert stats.salary_statistics.salary_avg is None

def test_calculate_statistics_populated():
    jobs = [
        NormalizedJob(
            source="adzuna",
            sources=["adzuna"],
            title="Software Engineer",
            company="Google",
            location="Bengaluru",
            country="IN",
            salary_min=120000,
            salary_max=140000,
            job_type="Full-time",
            category="IT",
            skills=["Python", "SQL"],
            publication_date="2026-09-20",
            description="",
            url="http://example.com/1"
        ),
        NormalizedJob(
            source="muse",
            sources=["muse"],
            title="Senior Software Engineer",
            company="Google",
            location="Bengaluru",
            country="IN",
            salary_min=140000,
            salary_max=160000,
            job_type="Full-time",
            category="Engineering",
            skills=["Python", "Docker", "AWS"],
            publication_date="2026-09-21",
            description="",
            url="http://example.com/2"
        ),
        NormalizedJob(
            source="remotive",
            sources=["remotive"],
            title="Staff Python Engineer",
            company="Meta",
            location="Remote",
            country="GLOBAL",
            salary_min=180000,
            salary_max=200000,
            job_type="Contract",
            category="Software Development",
            skills=["Python", "Docker", "Kubernetes"],
            publication_date="2026-09-22",
            description="",
            url="http://example.com/3"
        )
    ]

    stats = calculate_statistics(jobs)
    assert stats.total_jobs == 3
    assert stats.jobs_per_source["adzuna"] == 1
    assert stats.jobs_per_source["muse"] == 1
    assert stats.jobs_per_source["remotive"] == 1

    # Check companies
    assert stats.jobs_by_company["Google"] == 2
    assert stats.jobs_by_company["Meta"] == 1

    # Check job types
    assert stats.jobs_by_job_type["Full-time"] == 2
    assert stats.jobs_by_job_type["Contract"] == 1

    # Check skills
    # Python in all 3 jobs -> 100%
    skill_names = [s.skill for s in stats.top_skills]
    assert "Python" in skill_names
    python_stat = next(s for s in stats.top_skills if s.skill == "Python")
    assert python_stat.mentions == 3
    assert python_stat.percentage == 100.0

    docker_stat = next(s for s in stats.top_skills if s.skill == "Docker")
    assert docker_stat.mentions == 2
    assert round(docker_stat.percentage, 1) == 66.7

    # Check salary calculations
    # Midpoints: (120k+140k)/2 = 130k, (140k+160k)/2 = 150k, (180k+200k)/2 = 190k
    # Avg: (130 + 150 + 190) / 3 = 156666.67
    assert stats.salary_statistics.jobs_with_salary == 3
    assert stats.salary_statistics.salary_min == 120000
    assert stats.salary_statistics.salary_max == 200000
    assert stats.salary_statistics.salary_avg == 156666.67
    assert stats.salary_statistics.salary_median == 150000.0
