import json
import logging
from typing import Dict, Any, Tuple, Optional
from google import genai
from google.genai import types

from backend.config import GEMINI_API_KEY, GEMINI_MODEL, is_valid_credential
from backend.models.schemas import (
    JobStatistics,
    GeminiAnalysis,
    GeminiDemandSignal,
    GeminiTopSkill,
    GeminiGeographicSummary,
    GeminiFutureOutlook,
    SourceStatus
)

logger = logging.getLogger("careercope.gemini")

SYSTEM_INSTRUCTION = (
    "You are a career-market analysis assistant.\n"
    "Analyze ONLY the structured job-market data provided to you.\n"
    "Do not invent facts.\n"
    "Do not fabricate statistics.\n"
    "Do not claim to know the future.\n"
    "Do not create future job numbers unless they are explicitly calculated from supplied historical data.\n"
    "Clearly distinguish:\n"
    "1. Observed data\n"
    "2. Calculated statistics\n"
    "3. AI interpretation\n"
    "4. Uncertainty\n"
    "If the supplied data is insufficient for a reliable forecast, explicitly say:\n"
    "'Insufficient data for a reliable forecast.'\n"
    "Provide useful interpretation while remaining transparent about limitations.\n"
    "Output must strictly be valid JSON matching the requested structure."
)

def create_evidence_summary(career: str, stats: JobStatistics) -> Dict[str, Any]:
    """Prepares structured, sanitized summary containing zero HTML, secrets, or raw text."""
    return {
        "career": career,
        "total_jobs": stats.total_jobs,
        "sources": stats.jobs_per_source,
        "countries": stats.jobs_by_country,
        "locations": stats.jobs_by_city,
        "skills": [s.model_dump() for s in stats.top_skills],
        "salary_statistics": stats.salary_statistics.model_dump(),
        "job_types": stats.jobs_by_job_type,
        "top_companies": stats.jobs_by_company,
        "recent_postings_count": stats.recent_activity_count
    }

def generate_fallback_analysis(career: str, stats: JobStatistics, reason: str) -> GeminiAnalysis:
    """Provides an objective, data-driven fallback analysis when Gemini API is unconfigured or unreachable."""
    total = stats.total_jobs
    if total > 50:
        demand_label = "High"
        demand_exp = f"Strong market presence with {total} active job listings found across connected sources."
    elif total > 15:
        demand_label = "Moderate"
        demand_exp = f"Moderate hiring volume with {total} listings identified across sampled platforms."
    elif total > 0:
        demand_label = "Niche / Emerging"
        demand_exp = f"Limited sample size of {total} postings observed in current search cycle."
    else:
        demand_label = "Insufficient Data"
        demand_exp = "No active listings were detected in the sampled platforms."

    top_skills_list = []
    for s in stats.top_skills[:5]:
        top_skills_list.append(GeminiTopSkill(
            skill=s.skill,
            importance="High" if s.percentage > 30 else "Moderate",
            evidence=f"Appeared in {s.mentions} listings ({s.percentage}% of analyzed positions)."
        ))

    geo_summary = []
    for loc, count in list(stats.jobs_by_city.items())[:5]:
        pct = round((count / max(1, total)) * 100, 1)
        geo_summary.append(GeminiGeographicSummary(
            location=loc,
            job_count=count,
            percentage=pct
        ))

    sal = stats.salary_statistics
    sal_summary = {
        "available": sal.jobs_with_salary > 0,
        "summary": f"Calculated average salary of ${sal.salary_avg:,.0f} based on {sal.jobs_with_salary} listings reporting compensation." if sal.jobs_with_salary > 0 else "Insufficient compensation disclosures in current dataset."
    }

    return GeminiAnalysis(
        career=career,
        market_summary=f"Analysis of {total} listings for '{career}'. {demand_exp} ({reason})",
        demand_signal=GeminiDemandSignal(
            label=demand_label,
            explanation=demand_exp
        ),
        observed_signals=[
            f"Analyzed {total} verified job records across {len(stats.jobs_per_source)} active sources.",
            f"Most prevalent skill requirement is '{stats.top_skills[0].skill}' appearing in {stats.top_skills[0].percentage}% of postings." if stats.top_skills else "No dominant technical skill exceeded baseline threshold.",
            f"Concentration in {len(stats.jobs_by_company)} distinct hiring organizations."
        ],
        top_skills=top_skills_list,
        geographic_summary=geo_summary,
        salary_summary=sal_summary,
        job_type_summary=stats.jobs_by_job_type,
        market_opportunities=[
            f"Roles combining {stats.top_skills[0].skill if stats.top_skills else 'core competencies'} with modern cloud/collaboration workflows.",
            "Remote & hybrid distributed opportunities identified across multiple geographies."
        ],
        market_risks_or_uncertainties=[
            "Data snapshot reflects recent listings and may fluctuate with hiring cycles.",
            "Insufficient historical data for a reliable numerical forecast."
        ],
        future_outlook=GeminiFutureOutlook(
            one_year="AI-generated outlook based on currently available data: Demand is anticipated to remain aligned with current volume trends, prioritizing core competencies.",
            five_year="AI-generated outlook based on currently available data: Evolution towards automated tooling and higher specialization.",
            ten_year="AI-generated outlook based on currently available data: Structural shifts influenced by technological integration. Long-term trajectory carries significant uncertainty.",
            confidence="Moderate" if total > 20 else "Low"
        ),
        limitations=[
            "Sample reflects only listings aggregated from connected APIs (Adzuna, The Muse, Remotive).",
            "Salary figures are based strictly on jobs disclosing compensation.",
            "Future outlook is an analytical interpretation of current conditions, not a guaranteed projection."
        ]
    )

async def analyze_career_market(career: str, stats: JobStatistics) -> Tuple[GeminiAnalysis, SourceStatus]:
    """
    Sends statistical summary to Gemini API and parses validated career intelligence.
    Falls back gracefully if key is unconfigured or call fails.
    """
    if not is_valid_credential(GEMINI_API_KEY):
        analysis = generate_fallback_analysis(
            career, stats,
            reason="Algorithmic baseline (Gemini API key unconfigured in .env)"
        )
        return analysis, SourceStatus(
            name="Gemini AI",
            connected=False,
            message="GEMINI_API_KEY unconfigured in .env",
            jobs_fetched=0
        )

    evidence = create_evidence_summary(career, stats)
    prompt = (
        f"Analyze the following career market evidence for '{career}':\n"
        f"{json.dumps(evidence, indent=2)}\n\n"
        f"Produce a strictly formatted JSON report matching the required schema. "
        f"Do not invent statistics or assume certainty about the future."
    )

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Configure model request
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.2
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL or "gemini-2.5-flash",
            contents=prompt,
            config=config
        )

        if not response.text:
            raise ValueError("Empty response from Gemini")

        parsed_json = json.loads(response.text)
        
        # Validate against schema
        analysis = GeminiAnalysis(**parsed_json)
        
        return analysis, SourceStatus(
            name="Gemini AI",
            connected=True,
            message="Connected",
            jobs_fetched=1
        )

    except Exception as e:
        logger.error(f"Gemini API analysis failed: {type(e).__name__} - {str(e)}")
        # Provide algorithmic fallback so application remains fully functional
        fallback = generate_fallback_analysis(
            career, stats,
            reason=f"Algorithmic baseline (Gemini call encountered: {type(e).__name__})"
        )
        return fallback, SourceStatus(
            name="Gemini AI",
            connected=False,
            message=f"Temporarily unavailable ({type(e).__name__})",
            jobs_fetched=0
        )
