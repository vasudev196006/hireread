import statistics
from collections import Counter
from typing import List, Dict, Any, Optional
from backend.models.schemas import NormalizedJob, JobStatistics, SkillStat, SalaryStats

def calculate_statistics(jobs: List[NormalizedJob]) -> JobStatistics:
    total_jobs = len(jobs)
    if total_jobs == 0:
        return JobStatistics(
            total_jobs=0,
            jobs_per_source={},
            jobs_by_country={},
            jobs_by_city={},
            jobs_by_company={},
            jobs_by_job_type={},
            jobs_by_category={},
            salary_statistics=SalaryStats(
                salary_min=None,
                salary_max=None,
                salary_avg=None,
                salary_median=None,
                jobs_with_salary=0,
                currency="USD"
            ),
            top_skills=[],
            recent_activity_count=0
        )

    # Count jobs per source
    source_counter: Counter = Counter()
    for job in jobs:
        for src in (job.sources or [job.source]):
            source_counter[src] += 1

    # Count jobs by country
    country_counter: Counter = Counter()
    for job in jobs:
        cntry = job.country or "GLOBAL"
        country_counter[cntry] += 1

    # Count jobs by city/location
    city_counter: Counter = Counter()
    for job in jobs:
        loc = job.location.strip()
        if loc and loc.lower() not in {"not specified", "various / remote", "worldwide / remote"}:
            city_counter[loc] += 1

    # Count jobs by company
    company_counter: Counter = Counter()
    for job in jobs:
        comp = job.company.strip()
        if comp and comp.lower() != "confidential":
            company_counter[comp] += 1

    # Count jobs by job type
    job_type_counter: Counter = Counter()
    for job in jobs:
        jt = job.job_type.strip() or "Unknown"
        job_type_counter[jt] += 1

    # Count jobs by category
    category_counter: Counter = Counter()
    for job in jobs:
        cat = job.category.strip() or "General"
        category_counter[cat] += 1

    # Calculate salary statistics
    salaries = []
    min_salaries = []
    max_salaries = []
    for job in jobs:
        if job.salary_min is not None:
            min_salaries.append(job.salary_min)
        if job.salary_max is not None:
            max_salaries.append(job.salary_max)

        if job.salary_min is not None and job.salary_max is not None:
            salaries.append((job.salary_min + job.salary_max) / 2.0)
        elif job.salary_min is not None:
            salaries.append(job.salary_min)
        elif job.salary_max is not None:
            salaries.append(job.salary_max)

    jobs_with_salary = len(salaries)
    sal_min = min(min_salaries) if min_salaries else None
    sal_max = max(max_salaries) if max_salaries else None
    sal_avg = round(sum(salaries) / jobs_with_salary, 2) if salaries else None
    sal_median = round(statistics.median(salaries), 2) if len(salaries) >= 3 else sal_avg

    # Calculate skill counts and percentages
    skill_counter: Counter = Counter()
    for job in jobs:
        for s in job.skills:
            skill_counter[s] += 1

    top_skills: List[SkillStat] = []
    for skill_name, count in skill_counter.most_common(15):
        pct = round((count / total_jobs) * 100.0, 1)
        top_skills.append(SkillStat(
            skill=skill_name,
            mentions=count,
            percentage=pct
        ))

    # Recent activity
    recent_count = sum(1 for j in jobs if j.publication_date)

    return JobStatistics(
        total_jobs=total_jobs,
        jobs_per_source=dict(source_counter),
        jobs_by_country=dict(country_counter.most_common(10)),
        jobs_by_city=dict(city_counter.most_common(10)),
        jobs_by_company=dict(company_counter.most_common(10)),
        jobs_by_job_type=dict(job_type_counter.most_common(8)),
        jobs_by_category=dict(category_counter.most_common(8)),
        salary_statistics=SalaryStats(
            salary_min=sal_min,
            salary_max=sal_max,
            salary_avg=sal_avg,
            salary_median=sal_median,
            jobs_with_salary=jobs_with_salary,
            currency="USD"
        ),
        top_skills=top_skills,
        recent_activity_count=recent_count
    )
