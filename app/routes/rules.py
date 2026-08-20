from fastapi import APIRouter, Depends

from app.deps import get_current_user_or_apikey
from schema import CategoryRuleReq
from app.models.Rule import Rule as CategoryRule
from app.db import SessionLocal


router = APIRouter(prefix="/rules", tags=["rules"])

@router.post("/")
def add_category(rule:CategoryRuleReq,current_user = Depends(get_current_user_or_apikey)):
    db = SessionLocal()
    category_rule = CategoryRule(
        merchant_keywords=rule.merchant_keywords,
        classification=rule.classification,
        main_category=rule.main_category,
        sub_category=rule.sub_category,
        category_limit=rule.category_limit,
        user_id=current_user.id
    )
    db.add(category_rule)
    db.commit()
    db.close()
    return {"status":f"Category {rule.classification} added successfully"}
