import httpx
import logging
from typing import Dict, Any, List, Tuple
from backend.config import MUSE_API_KEY, is_valid_credential

logger = logging.getLogger("careercope.muse")

MUSE_BASE_URL = "https://www.themuse.com/api/public/jobs"

# Mapping common careers to The Muse's known category taxonomy
MUSE_CATEGORY_MAP = {
    "software": "Software Engineering",
    "engineer": "Software Engineering",
    "developer": "Software Engineering",
    "data": "Data and Analytics",
    "analyst": "Data and Analytics",
    "design": "Design and UX",
    "ux": "Design and UX",
    "ui": "Design and UX",
    "product": "Product Management",
    "devops": "Software Engineering",
    "cloud": "Software Engineering",
    "cybersecurity": "IT",
    "security": "IT",
    "it": "IT",
}

async def fetch_muse_jobs(career: str, page: int = 1) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetch jobs from The Muse public jobs API.
    Returns: (raw_jobs_list, status_dict)
    """
    params: Dict[str, Any] = {
        "page": page,
        "descending": "true"
    }

    if is_valid_credential(MUSE_API_KEY):
        params["api_key"] = MUSE_API_KEY

    # Determine best category if possible
    career_lower = career.lower()
    selected_category = None
    for keyword, cat in MUSE_CATEGORY_MAP.items():
        if keyword in career_lower:
            selected_category = cat
            break

    if selected_category:
        params["category"] = selected_category

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(MUSE_BASE_URL, params=params)

            if response.status_code == 429:
                logger.warning("The Muse rate limit reached.")
                return [], {
                    "name": "The Muse",
                    "connected": False,
                    "message": "Rate limit exceeded",
                    "jobs_fetched": 0
                }
            elif response.status_code >= 400:
                logger.warning(f"The Muse API returned status: {response.status_code}")
                return [], {
                    "name": "The Muse",
                    "connected": False,
                    "message": f"HTTP error {response.status_code}",
                    "jobs_fetched": 0
                }

            data = response.json()
            results = data.get("results", [])

            # Filter results for career title relevance if category was broad or not matched
            words = [w for w in career_lower.split() if len(w) > 2]
            relevant_jobs = []
            for job in results:
                title = (job.get("name") or "").lower()
                desc = (job.get("contents") or "").lower()
                # Check if any significant career word is in title or description
                if any(w in title for w in words) or (selected_category and any(w in desc for w in words)):
                    relevant_jobs.append(job)

            # If filtered list is small, retain whatever returned from matched category
            final_jobs = relevant_jobs if relevant_jobs else results[:15]

            return final_jobs, {
                "name": "The Muse",
                "connected": True,
                "message": "Connected",
                "jobs_fetched": len(final_jobs)
            }

    except httpx.TimeoutException:
        logger.error("The Muse request timed out.")
        return [], {
            "name": "The Muse",
            "connected": False,
            "message": "Request timed out",
            "jobs_fetched": 0
        }
    except Exception as e:
        logger.error(f"The Muse unexpected error: {type(e).__name__}")
        return [], {
            "name": "The Muse",
            "connected": False,
            "message": "Service temporarily unavailable",
            "jobs_fetched": 0
        }
