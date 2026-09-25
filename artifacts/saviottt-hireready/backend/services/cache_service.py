import time
from typing import Dict, Any, Optional

class CacheService:
    def __init__(self, default_ttl_seconds: int = 900):  # 15 minutes
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _generate_key(self, career: str, country: str) -> str:
        c = career.strip().lower()
        cntry = country.strip().lower()
        return f"{c}::{cntry}"

    def get(self, career: str, country: str) -> Optional[Dict[str, Any]]:
        key = self._generate_key(career, country)
        entry = self._cache.get(key)
        if not entry:
            return None
        
        # Check TTL
        if time.time() > entry["expires_at"]:
            del self._cache[key]
            return None
            
        return entry["data"]

    def set(self, career: str, country: str, data: Dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        key = self._generate_key(career, country)
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = {
            "expires_at": time.time() + ttl,
            "data": data
        }

    def clear(self) -> None:
        self._cache.clear()

# Global singleton
cache_service = CacheService()
