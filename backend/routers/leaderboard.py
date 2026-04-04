"""Leaderboard endpoint — returns top 50 users ranked by last interview score."""
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.database import get_db
from database import models, schemas, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Return top 50 users sorted by their most recent completed interview score.
    Admin accounts and inactive users are excluded.
    """
    # Subquery 1: most recent completed_at per user
    latest_sq = (
        db.query(
            models.Interview.user_id,
            func.max(models.Interview.completed_at).label("latest_completed_at"),
        )
        .filter(models.Interview.status == "completed")
        .group_by(models.Interview.user_id)
        .subquery()
    )

    # Subquery 2: score from that latest interview
    latest_score_sq = (
        db.query(
            models.Interview.user_id,
            models.Report.overall_score.label("last_score"),
            models.Interview.completed_at.label("last_interview_date"),
        )
        .join(models.Report, models.Report.interview_id == models.Interview.id)
        .join(
            latest_sq,
            (latest_sq.c.user_id == models.Interview.user_id)
            & (latest_sq.c.latest_completed_at == models.Interview.completed_at),
        )
        .subquery()
    )

    # Subquery 3: aggregate stats (total count + avg score) per user
    stats_sq = (
        db.query(
            models.Interview.user_id,
            func.count(models.Interview.id).label("total_interviews"),
            func.avg(models.Report.overall_score).label("avg_score"),
        )
        .join(models.Report, models.Report.interview_id == models.Interview.id)
        .filter(models.Interview.status == "completed")
        .group_by(models.Interview.user_id)
        .subquery()
    )

    rows = (
        db.query(
            models.User,
            stats_sq.c.total_interviews,
            stats_sq.c.avg_score,
            latest_score_sq.c.last_score,
            latest_score_sq.c.last_interview_date,
        )
        .join(stats_sq, stats_sq.c.user_id == models.User.id)
        .outerjoin(latest_score_sq, latest_score_sq.c.user_id == models.User.id)
        .filter(models.User.is_active == True)
        .filter(models.User.is_admin == False)
        .order_by(latest_score_sq.c.last_score.desc().nullslast())
        .limit(50)
        .all()
    )

    result = []
    for rank, (user, total_interviews, avg_score, last_score, last_interview_date) in enumerate(rows, start=1):
        result.append(
            schemas.LeaderboardEntry(
                rank=rank,
                user_id=user.id,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                last_score=round(float(last_score), 1) if last_score is not None else None,
                avg_score=round(float(avg_score), 1) if avg_score is not None else None,
                total_interviews=int(total_interviews),
                last_interview_date=last_interview_date,
            )
        )
    return result
