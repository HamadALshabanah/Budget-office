import datetime
import hashlib
import os
from typing import Annotated, Optional
import jwt
import bcrypt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from fastapi.security import APIKeyHeader
from models import SessionLocal, User, APIKey
from app.config import SECRET_KEY, ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "6000"))
from app.db import get_db_session

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str




def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(payload["sub"])


@router.post("/register", status_code=201)
def register(req: RegisterRequest, db=Depends(get_db_session)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(username=req.username, password_hash=hashed)
    db.add(new_user)
    db.commit()
    return {"status": "registered"}


@router.post("/login")
def login(req: LoginRequest, db=Depends(get_db_session)):
    try:
        print(f"req Hello")
        user = db.query(User).filter(User.username == req.username).first()
        print(f"req {req}")
        if not user or not bcrypt.checkpw(req.password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = create_token(user.id)
    finally:
        db.close()
    return {"access_token": token, "token_type": "bearer"}
