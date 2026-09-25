import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from backend.main import app
from backend.models.schemas import NormalizedJob

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "CAREERCOPE AI"

def test_status_endpoint():
    response = client.get("/api/career/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "services" in data
    assert "adzuna" in data["services"]
    assert "muse" in data["services"]
    assert "remotive" in data["services"]
    assert "gemini" in data["services"]

def test_analyze_validation_empty_career():
    response = client.post("/api/career/analyze", json={"career": " ", "country": "in"})
    assert response.status_code in (400, 422)

def test_analyze_validation_missing_fields():
    response = client.post("/api/career/analyze", json={})
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_analyze_endpoint_mocked():
    sample_jobs = [
        NormalizedJob(
            source="remotive",
            sources=["remotive"],
            title="Python Cloud Developer",
            company="CloudWorks",
            location="Remote (Global)",
            country="GLOBAL",
            salary_min=100000,
            salary_max=130000,
            job_type="Full-time",
            category="Software Development",
            skills=["Python", "AWS"],
            publication_date="2026-09-20",
            description="Developing scalable cloud services.",
            url="https://remotive.com/job/test"
        )
    ]

    with patch("backend.api.career.fetch_adzuna_jobs", new_callable=AsyncMock) as mock_adzuna, \
         patch("backend.api.career.fetch_muse_jobs", new_callable=AsyncMock) as mock_muse, \
         patch("backend.api.career.fetch_remotive_jobs", new_callable=AsyncMock) as mock_remotive:
        
        mock_adzuna.return_value = ([], {"name": "Adzuna", "connected": False, "message": "Unconfigured", "jobs_fetched": 0})
        mock_muse.return_value = ([], {"name": "The Muse", "connected": True, "message": "Connected", "jobs_fetched": 0})
        mock_remotive.return_value = ([
            {
                "id": 1,
                "title": "Python Cloud Developer",
                "company_name": "CloudWorks",
                "candidate_required_location": "Global",
                "category": "Software Development",
                "tags": ["python", "aws"],
                "job_type": "full_time",
                "publication_date": "2026-09-20",
                "salary": "$100,000 - $130,000",
                "description": "Developing scalable cloud services.",
                "url": "https://remotive.com/job/test"
            }
        ], {"name": "Remotive", "connected": True, "message": "Connected", "jobs_fetched": 1})

        response = client.post("/api/career/analyze", json={"career": "Cloud Developer", "country": "in"})
        assert response.status_code == 200
        data = response.json()
        assert data["career"] == "Cloud Developer"
        assert data["statistics"]["total_jobs"] == 1
        assert "remotive" in data["statistics"]["jobs_per_source"]
        assert len(data["jobs"]) == 1
        assert data["gemini_analysis"] is not None
        assert "future_outlook" in data["gemini_analysis"]
        assert "disclaimer" in data
