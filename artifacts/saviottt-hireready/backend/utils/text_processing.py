import re
import html
from typing import List, Dict, Optional, Tuple

# Supported skills according to specifications
SKILL_PATTERNS: Dict[str, re.Pattern] = {
    "Python": re.compile(r"\bpython\b", re.IGNORECASE),
    "Java": re.compile(r"\bjava\b(?!script)", re.IGNORECASE),
    "JavaScript": re.compile(r"\b(javascript|js|es6)\b", re.IGNORECASE),
    "TypeScript": re.compile(r"\b(typescript|ts)\b", re.IGNORECASE),
    "React": re.compile(r"\b(react|react\.js|reactjs)\b", re.IGNORECASE),
    "Node.js": re.compile(r"\b(node|node\.js|nodejs)\b", re.IGNORECASE),
    "SQL": re.compile(r"\bsql\b", re.IGNORECASE),
    "PostgreSQL": re.compile(r"\b(postgres|postgresql)\b", re.IGNORECASE),
    "MySQL": re.compile(r"\bmysql\b", re.IGNORECASE),
    "AWS": re.compile(r"\b(aws|amazon web services)\b", re.IGNORECASE),
    "Azure": re.compile(r"\bazure\b", re.IGNORECASE),
    "GCP": re.compile(r"\b(gcp|google cloud)\b", re.IGNORECASE),
    "Docker": re.compile(r"\bdocker\b", re.IGNORECASE),
    "Kubernetes": re.compile(r"\b(kubernetes|k8s)\b", re.IGNORECASE),
    "Git": re.compile(r"\bgit\b(?!hub|lab)", re.IGNORECASE),
    "Linux": re.compile(r"\blinux\b", re.IGNORECASE),
    "Machine Learning": re.compile(r"\b(machine learning|ml)\b", re.IGNORECASE),
    "Artificial Intelligence": re.compile(r"\b(artificial intelligence|genai|ai)\b", re.IGNORECASE),
    "TensorFlow": re.compile(r"\btensorflow\b", re.IGNORECASE),
    "PyTorch": re.compile(r"\bpytorch\b", re.IGNORECASE),
    "Figma": re.compile(r"\bfigma\b", re.IGNORECASE),
    "Excel": re.compile(r"\bexcel\b", re.IGNORECASE),
    "Communication": re.compile(r"\bcommunication\b", re.IGNORECASE),
    "Leadership": re.compile(r"\bleadership\b", re.IGNORECASE),
    "Project Management": re.compile(r"\bproject management\b", re.IGNORECASE),
}

# Country code and name mapping
COUNTRY_COORDINATES: Dict[str, Tuple[float, float, str]] = {
    "in": (20.5937, 78.9629, "India"),
    "us": (37.0902, -95.7129, "United States"),
    "gb": (55.3781, -3.4360, "United Kingdom"),
    "ca": (56.1304, -106.3468, "Canada"),
    "au": (-25.2744, 133.7751, "Australia"),
    "de": (51.1657, 10.4515, "Germany"),
    "global": (20.0, 0.0, "Global / Remote"),
}

# Major cities coordinates for accurate geographic visualization
CITY_COORDINATES: Dict[str, Tuple[float, float, str]] = {
    # India
    "bengaluru": (12.9716, 77.5946, "India"),
    "bangalore": (12.9716, 77.5946, "India"),
    "mumbai": (19.0760, 72.8777, "India"),
    "delhi": (28.7041, 77.1025, "India"),
    "new delhi": (28.6139, 77.2090, "India"),
    "hyderabad": (17.3850, 78.4867, "India"),
    "pune": (18.5204, 73.8567, "India"),
    "chennai": (13.0827, 80.2707, "India"),
    "gurgaon": (28.4595, 77.0266, "India"),
    "gurugram": (28.4595, 77.0266, "India"),
    "noida": (28.5355, 77.3910, "India"),
    "kolkata": (22.5726, 88.3639, "India"),
    # USA
    "san francisco": (37.7749, -122.4194, "United States"),
    "new york": (40.7128, -74.0060, "United States"),
    "nyc": (40.7128, -74.0060, "United States"),
    "seattle": (47.6062, -122.3321, "United States"),
    "austin": (30.2672, -97.7431, "United States"),
    "chicago": (41.8781, -87.6298, "United States"),
    "boston": (42.3601, -71.0589, "United States"),
    "los angeles": (34.0522, -118.2437, "United States"),
    "san jose": (37.3382, -121.8863, "United States"),
    "atlanta": (33.7490, -84.3880, "United States"),
    "dallas": (32.7767, -96.7970, "United States"),
    "denver": (39.7392, -104.9903, "United States"),
    # UK
    "london": (51.5074, -0.1278, "United Kingdom"),
    "manchester": (53.4808, -2.2426, "United Kingdom"),
    "birmingham": (52.4862, -1.8904, "United Kingdom"),
    "edinburgh": (55.9533, -3.1883, "United Kingdom"),
    "bristol": (51.4545, -2.5879, "United Kingdom"),
    # Germany
    "berlin": (52.5200, 13.4050, "Germany"),
    "munich": (48.1351, 11.5820, "Germany"),
    "frankfurt": (50.1109, 8.6821, "Germany"),
    "hamburg": (53.5511, 9.9937, "Germany"),
    # Canada
    "toronto": (43.6532, -79.3832, "Canada"),
    "vancouver": (49.2827, -123.1207, "Canada"),
    "montreal": (45.5017, -73.5673, "Canada"),
    "ottawa": (45.4215, -75.6972, "Canada"),
    # Australia
    "sydney": (-33.8688, 151.2093, "Australia"),
    "melbourne": (-37.8136, 144.9631, "Australia"),
    "brisbane": (-27.4698, 153.0251, "Australia"),
}

def clean_html(raw_html: str) -> str:
    """Strips HTML tags, entities, and excessive whitespace."""
    if not raw_html:
        return ""
    # Unescape HTML entities first
    text = html.unescape(raw_html)
    # Remove HTML tags with space
    cleanr = re.compile(r"<[^>]+>")
    cleantext = re.sub(cleanr, " ", text)
    # Fix spaces before punctuation e.g. "word !" -> "word!"
    cleantext = re.sub(r"\s+([.,!?;:])", r"\1", cleantext)
    # Replace multiple spaces/newlines
    cleantext = re.sub(r"\s+", " ", cleantext).strip()
    return cleantext

def normalize_text_for_comparison(text: str) -> str:
    """Normalizes text for duplicate job matching."""
    if not text:
        return ""
    text = text.lower()
    # Remove common corporation suffixes
    text = re.sub(r"\b(inc|llc|ltd|corp|corporation|technologies|solutions|services|pvt|co)\b\.?", "", text)
    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)
    # Collapse whitespace
    return re.sub(r"\s+", " ", text).strip()

def extract_skills_from_text(text: str) -> List[str]:
    """Finds matching defined skills from text."""
    if not text:
        return []
    found_skills = []
    for skill_name, pattern in SKILL_PATTERNS.items():
        if pattern.search(text):
            found_skills.append(skill_name)
    return found_skills

def get_location_coordinates(location_str: str, country_code: str) -> Optional[Tuple[float, float, str]]:
    """
    Attempts to match a city or country to precise coordinates.
    Returns (lat, lon, country_name) or None if unmapped.
    """
    if not location_str:
        cc = country_code.lower()
        return COUNTRY_COORDINATES.get(cc)
    
    loc_lower = location_str.lower()
    
    # Check known cities
    for city, coords in CITY_COORDINATES.items():
        if city in loc_lower:
            return coords
            
    # Check known countries
    for code, coords in COUNTRY_COORDINATES.items():
        if coords[2].lower() in loc_lower or code in loc_lower:
            return coords
            
    # Fallback to country centroid if provided
    cc = country_code.lower()
    if cc in COUNTRY_COORDINATES:
        return COUNTRY_COORDINATES[cc]
        
    return None
