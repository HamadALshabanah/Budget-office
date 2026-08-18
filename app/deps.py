import hashlib
import os
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from fastapi.security import APIKeyHeader
from app.db import get_db_session
from app.models import User, APIKey
from user_session import decode_token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

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
