"""Portfolio dashboard route."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.services.dashboard_service import build_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return build_dashboard(db, user.id)
