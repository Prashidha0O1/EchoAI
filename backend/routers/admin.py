"""Admin-only analytics endpoints. Requires is_admin=True on the authenticated user."""
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from database.database import get_db
from database import models, schemas, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user),
):
    """Return platform-wide counts and average score."""
    total_users = db.query(func.count(models.User.id)).scalar() or 0
    total_interviews = db.query(func.count(models.Interview.id)).scalar() or 0
    total_completed = (
        db.query(func.count(models.Interview.id))
        .filter(models.Interview.status == "completed")
        .scalar()
        or 0
    )
    platform_avg = db.query(func.avg(models.Report.overall_score)).scalar()

    return schemas.AdminStatsOut(
        total_users=total_users,
        total_interviews=total_interviews,
        total_completed=total_completed,
        platform_avg_score=round(float(platform_avg), 1) if platform_avg else None,
    )


@router.get("/users", response_model=List[schemas.AdminUserOut])
def get_admin_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user),
):
    """Return all users with interview count and average score, ordered by interview count desc."""
    # Subquery: interview count per user
    interview_count_sq = (
        db.query(
            models.Interview.user_id,
            func.count(models.Interview.id).label("interview_count"),
        )
        .group_by(models.Interview.user_id)
        .subquery()
    )

    # Subquery: avg score per user (from completed interviews with reports)
    avg_score_sq = (
        db.query(
            models.Interview.user_id,
            func.avg(models.Report.overall_score).label("avg_score"),
        )
        .join(models.Report, models.Report.interview_id == models.Interview.id)
        .group_by(models.Interview.user_id)
        .subquery()
    )

    # Subquery: latest completed interview per user
    latest_interview_sq = (
        db.query(
            models.Interview.user_id,
            func.max(models.Interview.id).label("latest_id"),
        )
        .filter(models.Interview.status == "completed")
        .group_by(models.Interview.user_id)
        .subquery()
    )

    # Subquery: score from that latest interview
    last_score_sq = (
        db.query(
            latest_interview_sq.c.user_id,
            models.Report.overall_score.label("last_score"),
        )
        .join(models.Report, models.Report.interview_id == latest_interview_sq.c.latest_id)
        .subquery()
    )

    rows = (
        db.query(
            models.User,
            func.coalesce(interview_count_sq.c.interview_count, 0).label("interview_count"),
            avg_score_sq.c.avg_score,
            last_score_sq.c.last_score,
        )
        .outerjoin(interview_count_sq, interview_count_sq.c.user_id == models.User.id)
        .outerjoin(avg_score_sq, avg_score_sq.c.user_id == models.User.id)
        .outerjoin(last_score_sq, last_score_sq.c.user_id == models.User.id)
        .order_by(func.coalesce(interview_count_sq.c.interview_count, 0).desc())
        .all()
    )

    result = []
    for user, interview_count, avg_score, last_score in rows:
        result.append(
            schemas.AdminUserOut(
                id=user.id,
                username=user.username,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                is_admin=user.is_admin,
                email_verified=user.email_verified,
                created_at=user.created_at,
                interview_count=int(interview_count),
                avg_score=round(float(avg_score), 1) if avg_score else None,
                last_score=round(float(last_score), 1) if last_score else None,
            )
        )
    return result


@router.get("/chart/interviews-per-day", response_model=List[schemas.AdminChartPoint])
def get_interviews_per_day(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user),
):
    """Return interview counts grouped by day for the last 7 days."""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=6)

    rows = (
        db.query(
            cast(models.Interview.created_at, Date).label("day"),
            func.count(models.Interview.id).label("count"),
        )
        .filter(models.Interview.created_at >= seven_days_ago)
        .group_by(cast(models.Interview.created_at, Date))
        .order_by(cast(models.Interview.created_at, Date))
        .all()
    )

    # Build a full 7-day map, zero-padding missing days
    counts: dict[str, int] = {}
    for row in rows:
        counts[str(row.day)] = int(row.count)

    result = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        day_str = str(day)
        label = day.strftime("%b %d")
        result.append(schemas.AdminChartPoint(label=label, count=counts.get(day_str, 0)))

    return result


@router.get("/chart/interviews-by-type", response_model=List[schemas.AdminChartPoint])
def get_interviews_by_type(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user),
):
    """Return interview counts grouped by interview_type."""
    rows = (
        db.query(
            models.Interview.interview_type,
            func.count(models.Interview.id).label("count"),
        )
        .group_by(models.Interview.interview_type)
        .order_by(func.count(models.Interview.id).desc())
        .all()
    )

    return [
        schemas.AdminChartPoint(
            label=(row.interview_type or "unknown").capitalize(),
            count=int(row.count),
        )
        for row in rows
    ]
