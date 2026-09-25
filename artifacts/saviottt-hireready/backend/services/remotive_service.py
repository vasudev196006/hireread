import httpx
import logging
from typing import Dict, Any, List, Tuple
from backend.config import REMOTIVE_API_URL

logger = logging.getLogger("careercope.remotive")

async def fetch_remotive_jobs(career: str, limit: int = 30) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetch jobs from the public Remotive remote jobs API.
    Returns: (raw_jobs_list, status_dict)
    """
    url = REMOTIVE_API_URL or "https://remotive.com/api/remote-jobs"
    params = {
        "search": career,
        "limit": limit
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(url, params=params)

            if response.status_code == 429:
                logger.warning("Remotive rate limit reached.")
                return [], {
                    "name": "Remotive",
                    "connected": False,
                    "message": "Rate limit exceeded",
                    "jobs_fetched": 0
                }
            elif response.status_code >= 400:
                logger.warning(f"Remotive API returned status: {response.status_code}")
                return [], {
                    "name": "Remotive",
                    "connected": False,
                    "message": f"HTTP error {response.status_code}",
                    "jobs_fetched": 0
                }

            data = response.json()
            results = data.get("jobs", [])

            return results, {
                "name": "Remotive",
                "connected": True,
                "message": "Connected",
                "jobs_fetched": len(results)
            }

    except httpx.TimeoutException:
        logger.error("Remotive request timed out.")
        return [], {
            "name": "Remotive",
            "connected": False,
            "message": "Request timed out",
            "jobs_fetched": 0
        }
    except Exception as e:
        logger.error(f"Remotive unexpected error: {type(e).__name__}")
        return [], {
            "name": "Remotive",
            "connected": False,
            "message": "Service temporarily unavailable",
            "jobs_fetched": 0
        }
