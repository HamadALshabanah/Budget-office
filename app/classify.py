from app.db import SessionLocal
from app.models.Rule import Rule


def classify_merchant(merchant: str | None) -> int | None:
    """Match a merchant against rule keywords (case-insensitive), return the rule's category_id."""
    if not merchant:
        return None
    needle = merchant.lower()
    db = SessionLocal()
    try:
        for rule in db.query(Rule).all():
            for kw in rule.merchant_keywords.split(","):
                kw = kw.strip().lower()
                if kw and kw in needle:
                    return rule.category_id
        return None
    finally:
        db.close()
