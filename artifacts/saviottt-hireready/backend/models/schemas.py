from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class CareerRequest(BaseModel):
    career: str = Field(..., min_length=2, max_length=100, description="Job title or career to analyze")
    country: str = Field("in", description="Country code (in, us, gb, ca, au, de, or global)")

class NormalizedJob(BaseModel):
    source: str
    sources: List[str] = Field(default_factory=list)
    title: str
    company: str
    location: str
    country: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_type: str = "Unknown"
    category: str = "General"
    skills: List[str] = Field(default_factory=list)
    publication_date: str = ""
    description: str = ""
    url: str

class SkillStat(BaseModel):
    skill: str
    mentions: int
    percentage: float

class SalaryStats(BaseModel):
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_avg: Optional[float] = None
    salary_median: Optional[float] = None
    jobs_with_salary: int = 0
    currency: str = "USD"

class JobStatistics(BaseModel):
    total_jobs: int
    jobs_per_source: Dict[str, int] = Field(default_factory=dict)
    jobs_by_country: Dict[str, int] = Field(default_factory=dict)
    jobs_by_city: Dict[str, int] = Field(default_factory=dict)
    jobs_by_company: Dict[str, int] = Field(default_factory=dict)
    jobs_by_job_type: Dict[str, int] = Field(default_factory=dict)
    jobs_by_category: Dict[str, int] = Field(default_factory=dict)
    salary_statistics: SalaryStats
    top_skills: List[SkillStat] = Field(default_factory=list)
    recent_activity_count: int = 0

class GeminiDemandSignal(BaseModel):
    label: str
    explanation: str

class GeminiTopSkill(BaseModel):
    skill: str
    importance: str
    evidence: str

class GeminiGeographicSummary(BaseModel):
    location: str
    job_count: int
    percentage: float

class GeminiFutureOutlook(BaseModel):
    one_year: str
    five_year: str
    ten_year: str
    confidence: str

class GeminiAnalysis(BaseModel):
    career: str
    market_summary: str
    demand_signal: GeminiDemandSignal
    observed_signals: List[str] = Field(default_factory=list)
    top_skills: List[GeminiTopSkill] = Field(default_factory=list)
    geographic_summary: List[GeminiGeographicSummary] = Field(default_factory=list)
    salary_summary: Dict[str, Any] = Field(default_factory=dict)
    job_type_summary: Dict[str, Any] = Field(default_factory=dict)
    market_opportunities: List[str] = Field(default_factory=list)
    market_risks_or_uncertainties: List[str] = Field(default_factory=list)
    future_outlook: GeminiFutureOutlook
    limitations: List[str] = Field(default_factory=list)

class SourceStatus(BaseModel):
    name: str
    connected: bool
    message: str
    jobs_fetched: int = 0

class CareerResponse(BaseModel):
    career: str
    country: str
    statistics: JobStatistics
    jobs: List[NormalizedJob] = Field(default_factory=list)
    gemini_analysis: Optional[GeminiAnalysis] = None
    source_statuses: Dict[str, SourceStatus] = Field(default_factory=dict)
    cached: bool = False
    disclaimer: str = (
        "AI-generated outlook based on currently available data. "
        "Not a guaranteed prediction or market certainty."
    )
