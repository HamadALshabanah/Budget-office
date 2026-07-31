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
api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
from models import SessionLocal, User, APIKey

load_dotenv("settings.env")
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def get_current_user_or_apikey(
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
    user_api_key: Annotated[Optional[str], Depends(api_key_header)],
    db=Depends(get_db_session),
) -> User:
    if user_api_key:
        key_hash = hashlib.sha256(user_api_key.encode()).hexdigest()
        api_key = db.query(APIKey).filter(
            APIKey.key_hash == key_hash, APIKey.revoked == False
        ).first()
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        user = db.query(User).filter(User.id == api_key.user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        db.expunge(user)
        return user

    # Fall back to JWT
    if token:
        user_id = decode_token(token)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        db.expunge(user)
        return user

    raise HTTPException(status_code=401, detail="Not authenticated")
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
        user = db.query(User).filter(User.username == req.username).first()
        print(f"req {req}")
        if not user or not bcrypt.checkpw(req.password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = create_token(user.id)
    finally:
        db.close()
    return {"access_token": token, "token_type": "bearer"}
