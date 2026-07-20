"""Authentication routes: register, login (OAuth2 password flow), current user."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserRead, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token(user: User) -> Token:
    token = create_access_token(user.id, extra={"email": user.email})
    return Token(access_token=token, user=UserRead.model_validate(user))


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> Token:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    """OAuth2 password flow — ``username`` is the email."""
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _issue_token(user)


@router.post("/login/json", response_model=Token)
def login_json(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Convenience JSON login for the SPA."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return _issue_token(user)


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current)
