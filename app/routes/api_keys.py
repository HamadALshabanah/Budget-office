import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException
from user_session import get_db_session
from app.deps import get_current_user_or_apikey
from models import APIKey

router = APIRouter(tags=["api_keys"])


@router.post("/api-keys")
def create_api_key(current_user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    raw = "bk_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    db.query(APIKey).filter(APIKey.user_id == current_user.id).delete()
    db.add(APIKey(key_hash=key_hash, user_id=current_user.id))
    db.commit()
    return {"api_key": raw}  # shown once

@router.delete("/api-keys")
def revoke_api_key(current_user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    db.query(APIKey).filter(APIKey.user_id == current_user.id).update({"revoked": True})
    db.commit()
    return {"status": "revoked"}
