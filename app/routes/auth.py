import bcrypt

from app.deps import get_db_session
from app.models import User
from user_session import create_token
from fastapi import APIRouter, Depends, HTTPException
from schema import LoginRequest,RegisterRequest
from user_session import RegisterRequest


router = APIRouter(prefix="/auth", tags=["auth"])
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
