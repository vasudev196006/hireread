import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import (
    CareerRequest,
    CareerResponse,
    SourceStatus
)
from backend.services.adzuna_service import fetch_adzuna_jobs
from backend.services.muse_service import fetch_muse_jobs
from backend.services.remotive_service import fetch_remotive_jobs
from backend.services.normalization_service import (
    normalize_adzuna_job,
    normalize_muse_job,
    normalize_remotive_job,
    deduplicate_jobs
)
from backend.services.statistics_service import calculate_statistics
from backend.services.career_analysis_service import analyze_career_market
from backend.services.cache_service import cache_service
from backend.config import validate_environment

logger = logging.getLogger("careercope.api")
router = APIRouter(prefix="/api/career", tags=["Career Intelligence"])

@router.get("/status")
async def get_system_status():
    """Returns environment configuration and service availability without exposing secrets."""
    return {
        "status": "online",
        "services": validate_environment()
    }

@router.post("/analyze", response_model=CareerResponse)
async def analyze_career(request: CareerRequest):
    career_query = request.career.strip()
    country_code = (request.country or "in").strip().lower()

    if not career_query or len(career_query) < 2:
        raise HTTPException(status_code=400, detail="Career title must be at least 2 characters.")

    # 1. Check in-memory cache
    cached_result = cache_service.get(career_query, country_code)
    if cached_result:
        logger.info(f"Returning cached analysis for '{career_query}' ({country_code})")
        resp = CareerResponse(**cached_result)
        resp.cached = True
        return resp

    # 2. Call external APIs concurrently
    logger.info(f"Executing concurrent search for '{career_query}' across Adzuna, The Muse, Remotive...")
    
    results = await asyncio.gather(
        fetch_adzuna_jobs(career=career_query, country=country_code),
        fetch_muse_jobs(career=career_query),
        fetch_remotive_jobs(career=career_query),
        return_exceptions=True
    )

    # Process Adzuna results
    adzuna_raw, adzuna_status = [], SourceStatus(name="Adzuna", connected=False, message="Call failed", jobs_fetched=0)
    if not isinstance(results[0], Exception):
        raw_list, status_dict = results[0]
        adzuna_raw = raw_list
        adzuna_status = SourceStatus(**status_dict)
    else:
        logger.error(f"Adzuna gather exception: {results[0]}")
        adzuna_status = SourceStatus(name="Adzuna", connected=False, message=str(results[0]), jobs_fetched=0)

    # Process The Muse results
    muse_raw, muse_status = [], SourceStatus(name="The Muse", connected=False, message="Call failed", jobs_fetched=0)
    if not isinstance(results[1], Exception):
        raw_list, status_dict = results[1]
        muse_raw = raw_list
        muse_status = SourceStatus(**status_dict)
    else:
        logger.error(f"The Muse gather exception: {results[1]}")
        muse_status = SourceStatus(name="The Muse", connected=False, message=str(results[1]), jobs_fetched=0)

    # Process Remotive results
    remotive_raw, remotive_status = [], SourceStatus(name="Remotive", connected=False, message="Call failed", jobs_fetched=0)
    if not isinstance(results[2], Exception):
        raw_list, status_dict = results[2]
        remotive_raw = raw_list
        remotive_status = SourceStatus(**status_dict)
    else:
        logger.error(f"Remotive gather exception: {results[2]}")
        remotive_status = SourceStatus(name="Remotive", connected=False, message=str(results[2]), jobs_fetched=0)

    # 3. Normalize all successful jobs
    normalized_list = []
    for raw in adzuna_raw:
        try:
            normalized_list.append(normalize_adzuna_job(raw, country_code))
        except Exception as e:
            logger.warning(f"Error normalizing Adzuna job: {e}")

    for raw in muse_raw:
        try:
            normalized_list.append(normalize_muse_job(raw))
        except Exception as e:
            logger.warning(f"Error normalizing Muse job: {e}")

    for raw in remotive_raw:
        try:
            normalized_list.append(normalize_remotive_job(raw))
        except Exception as e:
            logger.warning(f"Error normalizing Remotive job: {e}")

    # 4. Deduplicate across sources
    unique_jobs = deduplicate_jobs(normalized_list)

    # 5. Calculate statistics
    stats = calculate_statistics(unique_jobs)

    # 6. Send structured summary to Gemini AI
    gemini_analysis, gemini_status = await analyze_career_market(career_query, stats)

    source_statuses = {
        "adzuna": adzuna_status,
        "muse": muse_status,
        "remotive": remotive_status,
        "gemini": gemini_status
    }

    response_data = CareerResponse(
        career=career_query,
        country=country_code,
        statistics=stats,
        jobs=unique_jobs,
        gemini_analysis=gemini_analysis,
        source_statuses=source_statuses,
        cached=False,
        disclaimer=(
            "AI-generated outlook based on currently available data. "
            "Not a guaranteed prediction or market certainty."
        )
    )

    # 7. Cache results for 15 minutes
    cache_service.set(career_query, country_code, response_data.model_dump())

    return response_data
