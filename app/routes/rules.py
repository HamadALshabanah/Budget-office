from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user_or_apikey
from app.db import get_db_session
from app.models.Rule import Rule as CategoryRule
from schema import CategoryRuleReq
from sqlalchemy.orm import Session


router = APIRouter(prefix="/rules", tags=["rules"])


def get_rule_or_404(db: Session, rule_id: int, user_id: int) -> CategoryRule:
    rule = db.query(CategoryRule).filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    return rule


@router.get("/")
def list_rules(user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    return db.query(CategoryRule).filter_by(user_id=user.id).all()


@router.post("/", status_code=201)
def add_rule(rule: CategoryRuleReq, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = CategoryRule(
        merchant_keywords=rule.merchant_keywords,
        classification=rule.classification,
        category_id=rule.category_id,
        category_limit=rule.category_limit,
        user_id=user.id,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.patch("/{rule_id}")
def update_rule(rule_id: int, req: CategoryRuleReq, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    rule = get_rule_or_404(db, rule_id, user.id)
    rule.merchant_keywords = req.merchant_keywords
    rule.classification = req.classification
    rule.category_id = req.category_id
    rule.category_limit = req.category_limit
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    rule = get_rule_or_404(db, rule_id, user.id)
    db.delete(rule)
    db.commit()
    return {"status": f"Rule {rule_id} deleted"}
