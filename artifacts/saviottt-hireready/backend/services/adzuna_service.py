import httpx
import logging
from typing import Dict, Any, List, Tuple
from backend.config import ADZUNA_APP_ID, ADZUNA_APP_KEY, is_valid_credential

logger = logging.getLogger("careercope.adzuna")

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api"
SUPPORTED_COUNTRIES = {"in", "gb", "us", "ca", "au", "de"}

async def fetch_adzuna_jobs(career: str, country: str = "in", page: int = 1, results_per_page: int = 20) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetch jobs from the official Adzuna API.
    Returns: (raw_jobs_list, status_dict)
    Never exposes or logs secret credentials.
    """
    # Verify credential existence without printing secret
    if not is_valid_credential(ADZUNA_APP_KEY):
        return [], {
            "name": "Adzuna",
            "connected": False,
            "message": "Adzuna API key not configured in .env",
            "jobs_fetched": 0
        }

    # Normalize country
    country_code = country.lower().strip()
    if country_code not in SUPPORTED_COUNTRIES:
        country_code = "us" if country_code == "global" else "in"

    url = f"{ADZUNA_BASE_URL}/jobs/{country_code}/search/{page}"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": career,
        "results_per_page": results_per_page
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 401 or response.status_code == 403:
                logger.warning("Adzuna authentication failed. Please verify ADZUNA_APP_KEY in .env.")
                return [], {
                    "name": "Adzuna",
                    "connected": False,
                    "message": "Authentication failed (invalid credentials)",
                    "jobs_fetched": 0
                }
            elif response.status_code == 429:
                logger.warning("Adzuna rate limit exceeded.")
                return [], {
                    "name": "Adzuna",
                    "connected": False,
                    "message": "Rate limit exceeded",
                    "jobs_fetched": 0
                }
            
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

            return results, {
                "name": "Adzuna",
                "connected": True,
                "message": "Connected",
                "jobs_fetched": len(results)
            }

    except httpx.TimeoutException:
        logger.error("Adzuna API request timed out.")
        return [], {
            "name": "Adzuna",
            "connected": False,
            "message": "API request timed out",
            "jobs_fetched": 0
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"Adzuna API HTTP error: {e.response.status_code}")
        return [], {
            "name": "Adzuna",
            "connected": False,
            "message": f"HTTP error {e.response.status_code}",
            "jobs_fetched": 0
        }
    except Exception as e:
        logger.error(f"Adzuna API unexpected error: {type(e).__name__}")
        return [], {
            "name": "Adzuna",
            "connected": False,
            "message": "Service temporarily unavailable",
            "jobs_fetched": 0
        }
