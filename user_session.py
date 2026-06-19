import datetime
import os
from typing import Annotated
import jwt
import bcrypt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from models import SessionLocal, User

load_dotenv("settings.env")
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


def get_db_session():
    return SessionLocal()


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


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db=Depends(get_db_session)) -> User:
    user_id = decode_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", status_code=201)
def register(req: RegisterRequest):
    db = get_db_session()
    try:
        existing = db.query(User).filter(User.username == req.username).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
        hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        new_user = User(username=req.username, password_hash=hashed)
        db.add(new_user)
        db.commit()
    finally:
        db.close()
    return {"status": "registered"}


@router.post("/login")
def login(req: LoginRequest):
    db = get_db_session()
    try:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not bcrypt.checkpw(req.password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = create_token(user.id)
    finally:
        db.close()
    return {"access_token": token, "token_type": "bearer"}
