import datetime

from fastapi import APIRouter, Depends, HTTPException
from typing import Literal
from app.deps import get_current_user_or_apikey
from app.db import get_db_session
from app.models import Invoice, Category
from app.models.CycleModel import Cycle

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/")
def aggregate(
    cycle_id: int,
    group_by: Literal["bucket", "day", "merchant"],
    scope: int | None = None,  # drill level: only count inside this subtree
    user=Depends(get_current_user_or_apikey),
    db=Depends(get_db_session),
):
    """[{bucket, bucket_id, total, count}] — one GROUP BY, two knobs."""
    # scope    = WHERE    (only rows inside this subtree)
    # group_by = GROUP BY (bucket / day / merchant)

    cycle = db.query(Cycle).filter_by(id=cycle_id, user_id=user.id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    def naive(dt):  # strip tzinfo so datetime comparisons never blow up
        return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt

    cycle_start = naive(cycle.start_date)
    cycle_end = naive(cycle.end_date) or datetime.datetime.now()

    rows = db.query(Invoice).filter(
        Invoice.user_id == user.id,
        Invoice.extraction_status == "success",
        Invoice.created_at >= cycle_start,
        Invoice.created_at <= cycle_end,
    ).all()

    # ALL my categories as {id: node}, so we can climb parents
    cats = {
        cat.id: cat
        for cat in db.query(Category).filter(Category.user_id == user.id).all()
    }

    if scope is not None:
        if scope not in cats:
            raise HTTPException(status_code=404, detail="Category not found")
        family = {scope}
        changed = True
        while changed:
            changed = False
            for id, node in cats.items():
                if node.parent_id in family and id not in family:
                    family.add(id)
                    changed = True
        # NULL tags fail this check automatically -> excluded when scoped
        rows = [r for r in rows if r.category_id in family]

    # --- 5. the pile loop -----------------------------------------------------
    piles = {}      # label -> {"total": x, "count": n}
    pile_ids = {}   # label -> category id of the bucket (bucket mode only)

    for inv in rows:
        # 1) decide which pile this invoice belongs to
        if group_by == "merchant":
            label = inv.merchant or "Unknown"
        elif group_by == "day":
            label = str(inv.created_at.date())
        else:  # bucket: climb up the tree to the right level
            node = cats.get(inv.category_id)
            if node is None:
                label = "Uncategorized"
            elif scope is not None and node.id == scope:
                label = "(direct)"
            else:
                while node is not None:
                    if scope is None and node.level <= 1:
                        break  # reached a top-level main bucket
                    if scope is not None and node.parent_id == scope:
                        break  # reached a direct child of the scope
                    node = cats.get(node.parent_id)
                if node is None:
                    label = "Uncategorized"  # broken chain safety net
                else:
                    label = node.name
                    pile_ids[label] = node.id

        # 2) dump it in
        if label not in piles:
            piles[label] = {"total": 0.0, "count": 0}
        piles[label]["total"] += inv.amount or 0
        piles[label]["count"] += 1

    # --- 6. dict -> sorted list -----------------------------------------------
    result = []
    for label, p in piles.items():
        result.append({
            "bucket": label,
            "bucket_id": pile_ids.get(label),
            "total": round(p["total"], 2),
            "count": p["count"],
        })

    result.sort(key=lambda r: r["total"], reverse=True)
    return result
