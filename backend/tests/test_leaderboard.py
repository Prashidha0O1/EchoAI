"""
Integration tests for /leaderboard endpoint.
"""
import pytest


@pytest.mark.asyncio
async def test_leaderboard_authenticated(client, auth_headers):
    """GET /leaderboard returns 200 (may be empty list)."""
    resp = await client.get("/leaderboard", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_leaderboard_unauthenticated(client):
    """GET /leaderboard without token returns 401."""
    resp = await client.get("/leaderboard")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_leaderboard_with_data(client, auth_headers):
    """Create an interview with a report, verify user appears in leaderboard.

    NOTE: The leaderboard excludes admin users and requires completed interviews
    with reports. We create the data directly in the DB.
    """
    from tests.conftest import TestSessionLocal
    from database import models
    from datetime import datetime, timezone

    # Get the test user's ID from /auth/me
    me_resp = await client.get("/auth/me", headers=auth_headers)
    user_id = me_resp.json()["id"]

    db = TestSessionLocal()
    try:
        # Create a completed interview
        interview = models.Interview(
            user_id=user_id,
            interview_type="technical",
            status="completed",
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(interview)
        db.commit()
        db.refresh(interview)

        # Create a report for the interview
        report = models.Report(
            interview_id=interview.id,
            report_name="Test Report",
            overall_score=85.5,
            performance_metrics={"communication": 80, "technical_knowledge": 90},
            strengths=["Good problem solving"],
            improvements=["Could improve communication"],
            summary="Overall good performance",
        )
        db.add(report)
        db.commit()
    finally:
        db.close()

    resp = await client.get("/leaderboard", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    # The test user should appear (not admin, is_active=True)
    user_ids = [entry["user_id"] for entry in data]
    assert user_id in user_ids
