from dotenv import load_dotenv
import os
import logging

# Configure logger
logger = logging.getLogger("careercope.config")

load_dotenv()

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")

MUSE_API_KEY = os.getenv("MUSE_API_KEY")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

REMOTIVE_API_URL = os.getenv(
    "REMOTIVE_API_URL",
    "https://remotive.com/api/remote-jobs"
)

def is_valid_credential(value: str | None) -> bool:
    """Check if credential exists and is not a placeholder without exposing value."""
    if not value:
        return False
    stripped = value.strip()
    if not stripped:
        return False
    if stripped.startswith("YOUR_") or "SECRET" in stripped.upper() or "KEY" in stripped.upper() and len(stripped) < 15:
        # Avoid treating YOUR_NEW_... as a valid key
        if stripped.startswith("YOUR_"):
            return False
    return True

def validate_environment() -> dict:
    """
    Validate environment variables at startup.
    Returns status of all services without exposing secret values.
    """
    statuses = {
        "adzuna": {
            "configured": bool(ADZUNA_APP_ID and is_valid_credential(ADZUNA_APP_KEY)),
            "app_id_present": bool(ADZUNA_APP_ID),
            "app_key_present": is_valid_credential(ADZUNA_APP_KEY),
            "note": "Requires ADZUNA_APP_ID and ADZUNA_APP_KEY in .env" if not is_valid_credential(ADZUNA_APP_KEY) else "Configured"
        },
        "muse": {
            "configured": is_valid_credential(MUSE_API_KEY),
            "note": "Optional key for higher rate limits. Public endpoint accessible."
        },
        "remotive": {
            "configured": bool(REMOTIVE_API_URL),
            "url": REMOTIVE_API_URL,
            "note": "Public API (no key required)"
        },
        "gemini": {
            "configured": is_valid_credential(GEMINI_API_KEY),
            "model": GEMINI_MODEL,
            "note": "Requires GEMINI_API_KEY in .env for AI insights" if not is_valid_credential(GEMINI_API_KEY) else f"Configured with {GEMINI_MODEL}"
        }
    }

    if not statuses["adzuna"]["configured"]:
        logger.warning("Adzuna is not fully configured (missing ADZUNA_APP_KEY). Adzuna calls will report unconfigured.")
    if not statuses["gemini"]["configured"]:
        logger.warning("Gemini AI is not fully configured (missing GEMINI_API_KEY). AI analysis will provide fallback summary.")
    if statuses["remotive"]["configured"]:
        logger.info("Remotive API endpoint ready: %s", REMOTIVE_API_URL)

    return statuses
