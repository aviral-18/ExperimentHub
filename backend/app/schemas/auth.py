"""Auth request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    role: str = "Product Manager"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
