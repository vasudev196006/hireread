import re
import logging
from typing import List, Dict, Any, Optional
from backend.models.schemas import NormalizedJob
from backend.utils.text_processing import (
    clean_html,
    normalize_text_for_comparison,
    extract_skills_from_text
)

logger = logging.getLogger("careercope.normalization")

def parse_salary_string(salary_str: str) -> tuple[Optional[float], Optional[float]]:
    """Attempts to extract min and max salary from free-text strings like '$100,000 - $140,000' or '80k-120k'."""
    if not salary_str:
        return None, None
    cleaned = salary_str.replace(",", "").lower()
    
    # Check for 'k' notation e.g. 100k - 150k
    k_matches = re.findall(r"(\d+(?:\.\d+)?)\s*k", cleaned)
    if k_matches:
        numbers = [float(n) * 1000 for n in k_matches]
        if len(numbers) >= 2:
            return min(numbers), max(numbers)
        elif len(numbers) == 1:
            return numbers[0], numbers[0]

    # Look for standard number patterns
    matches = re.findall(r"\b(\d{4,7})\b", cleaned)
    if len(matches) >= 2:
        nums = [float(m) for m in matches[:2]]
        return min(nums), max(nums)
    elif len(matches) == 1:
        val = float(matches[0])
        return val, val
        
    return None, None

def normalize_adzuna_job(raw: Dict[str, Any], country_code: str) -> NormalizedJob:
    title = clean_html(raw.get("title") or "Untitled Position")
    company = raw.get("company", {}).get("display_name") or "Confidential"
    
    loc_obj = raw.get("location", {})
    location = loc_obj.get("display_name") or ", ".join(loc_obj.get("area", [])) or "Not specified"
    
    desc = clean_html(raw.get("description") or "")
    cat_label = raw.get("category", {}).get("label") or "General"
    
    # Skills from title, description, category
    combined_text = f"{title} {desc} {cat_label}"
    skills = extract_skills_from_text(combined_text)
    
    s_min = raw.get("salary_min")
    s_max = raw.get("salary_max")
    salary_min = float(s_min) if s_min is not None else None
    salary_max = float(s_max) if s_max is not None else None

    # Job type
    contract_time = (raw.get("contract_time") or "").replace("_", " ").title()
    contract_type = (raw.get("contract_type") or "").replace("_", " ").title()
    job_type = contract_time or contract_type or "Full-time"

    return NormalizedJob(
        source="adzuna",
        sources=["adzuna"],
        title=title,
        company=company,
        location=location,
        country=country_code.upper(),
        salary_min=salary_min,
        salary_max=salary_max,
        job_type=job_type,
        category=cat_label,
        skills=skills,
        publication_date=raw.get("created") or "",
        description=desc[:600],
        url=raw.get("redirect_url") or "#"
    )

def normalize_muse_job(raw: Dict[str, Any]) -> NormalizedJob:
    title = clean_html(raw.get("name") or "Untitled Position")
    company = raw.get("company", {}).get("name") or "Confidential"
    
    locations = raw.get("locations", [])
    loc_names = [l.get("name") for l in locations if l.get("name")]
    location = " / ".join(loc_names) if loc_names else "Various / Remote"
    
    # Infer country from location string
    country = "GLOBAL"
    if any("india" in loc.lower() for loc in loc_names):
        country = "IN"
    elif any("united states" in loc.lower() or ", us" in loc.lower() or re.search(r",\s*[A-Z]{2}\b", loc) for loc in loc_names):
        country = "US"
    elif any("united kingdom" in loc.lower() or "uk" in loc.lower() for loc in loc_names):
        country = "GB"

    desc = clean_html(raw.get("contents") or "")
    categories = [c.get("name") for c in raw.get("categories", []) if c.get("name")]
    category = ", ".join(categories) if categories else "General"
    
    combined_text = f"{title} {desc} {category}"
    skills = extract_skills_from_text(combined_text)

    # Job type
    job_type = raw.get("type") or "Full-time"
    if "full" in job_type.lower():
        job_type = "Full-time"

    url = raw.get("refs", {}).get("landing_page") or "#"

    return NormalizedJob(
        source="muse",
        sources=["muse"],
        title=title,
        company=company,
        location=location,
        country=country,
        salary_min=None,
        salary_max=None,
        job_type=job_type,
        category=category,
        skills=skills,
        publication_date=raw.get("publication_date") or "",
        description=desc[:600],
        url=url
    )

def normalize_remotive_job(raw: Dict[str, Any]) -> NormalizedJob:
    title = clean_html(raw.get("title") or "Untitled Position")
    company = raw.get("company_name") or "Confidential"
    
    req_loc = raw.get("candidate_required_location") or "Worldwide / Remote"
    location = f"Remote ({req_loc})"
    
    # Infer country if specific
    country = "GLOBAL"
    loc_lower = req_loc.lower()
    if "india" in loc_lower:
        country = "IN"
    elif "usa" in loc_lower or "united states" in loc_lower or "us" in loc_lower:
        country = "US"
    elif "uk" in loc_lower or "united kingdom" in loc_lower:
        country = "GB"
    elif "canada" in loc_lower:
        country = "CA"
    elif "germany" in loc_lower:
        country = "DE"
    elif "australia" in loc_lower:
        country = "AU"

    desc = clean_html(raw.get("description") or "")
    cat_label = raw.get("category") or "Software Development"
    tags = raw.get("tags") or []
    
    combined_text = f"{title} {desc} {cat_label} {' '.join(tags)}"
    skills = extract_skills_from_text(combined_text)

    salary_str = raw.get("salary") or ""
    s_min, s_max = parse_salary_string(salary_str)

    job_type_raw = (raw.get("job_type") or "full_time").replace("_", " ").title()

    url = raw.get("url") or "#"

    return NormalizedJob(
        source="remotive",
        sources=["remotive"],
        title=title,
        company=company,
        location=location,
        country=country,
        salary_min=s_min,
        salary_max=s_max,
        job_type=job_type_raw,
        category=cat_label,
        skills=skills,
        publication_date=raw.get("publication_date") or "",
        description=desc[:600],
        url=url
    )

def deduplicate_jobs(jobs: List[NormalizedJob]) -> List[NormalizedJob]:
    """
    Remove obvious duplicates across sources.
    Compares normalized title, company, and url.
    If matching, merges sources list.
    """
    unique_jobs: List[NormalizedJob] = []
    seen_keys: Dict[str, NormalizedJob] = {}

    for job in jobs:
        norm_title = normalize_text_for_comparison(job.title)
        norm_company = normalize_text_for_comparison(job.company)
        
        # Primary key: title + company
        key = f"{norm_title}::{norm_company}" if (norm_title and norm_company) else job.url

        if key in seen_keys:
            existing = seen_keys[key]
            # Merge sources list if not already present
            for src in job.sources:
                if src not in existing.sources:
                    existing.sources.append(src)
            # Retain salary if existing is missing it
            if existing.salary_min is None and job.salary_min is not None:
                existing.salary_min = job.salary_min
                existing.salary_max = job.salary_max
        else:
            seen_keys[key] = job
            unique_jobs.append(job)

    return unique_jobs
