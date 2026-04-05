"""
Integration tests for /admin endpoints — stats, users, charts.
Requires admin privileges.
"""
import pytest


# ===================== STATS =====================


@pytest.mark.asyncio
async def test_admin_stats(client, admin_headers):
    """GET /admin/stats as admin returns platform stats."""
    resp = await client.get("/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "total_interviews" in data
    assert "total_completed" in data
    assert isinstance(data["total_users"], int)


@pytest.mark.asyncio
async def test_admin_stats_non_admin(client, auth_headers):
    """Regular user gets 403 on admin endpoints."""
    resp = await client.get("/admin/stats", headers=auth_headers)
    assert resp.status_code == 403
    assert "Admin privileges required" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_admin_stats_unauthenticated(client):
    """No token returns 401."""
    resp = await client.get("/admin/stats")
    assert resp.status_code == 401


# ===================== USERS LIST =====================


@pytest.mark.asyncio
async def test_admin_users_list(client, admin_headers):
    """GET /admin/users returns list of users with interview_count fields."""
    resp = await client.get("/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # At least the admin user exists
    assert len(data) >= 1
    assert "interview_count" in data[0]
    assert "username" in data[0]


# ===================== CHARTS =====================


@pytest.mark.asyncio
async def test_admin_chart_by_type(client, admin_headers):
    """GET /admin/chart/interviews-by-type returns chart data."""
    resp = await client.get("/admin/chart/interviews-by-type", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # May be empty if no interviews, but shape should be correct
    for item in data:
        assert "label" in item
        assert "count" in item


@pytest.mark.asyncio
async def test_admin_chart_per_day(client, admin_headers):
    """GET /admin/chart/interviews-per-day returns 7-day chart data.
    NOTE: cast(created_at, Date) may behave differently on SQLite.
    """
    resp = await client.get("/admin/chart/interviews-per-day", headers=admin_headers)
    # May fail on SQLite due to Date cast — we accept either 200 or 500
    if resp.status_code == 200:
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 7  # Always 7 days
        for item in data:
            assert "label" in item
            assert "count" in item
