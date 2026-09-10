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
    scope: int | None = None,  # this is category_id travel food etc
    user=Depends(get_current_user_or_apikey),
    db=Depends(get_db_session),
):
    """ a drill down function that returns [{bucket, bucket_id, total, count}] — one GROUP BY, two knobs."""
    # scope    = WHERE    (only rows inside this subtree)
    # group_by = GROUP BY (bucket / day / merchant)

    cycle = db.query(Cycle).filter_by(id=cycle_id, user_id=user.id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found")

    

    cycle_start = cycle.start_date.replace(tzinfo=None) if cycle.start_date and cycle.start_date.tzinfo else cycle.start_date
    # Active cycles have no end_date yet — bound the range by "now", same as the other cycle queries
    raw_end = cycle.end_date or datetime.datetime.now()
    cycle_end = raw_end.replace(tzinfo=None) if raw_end.tzinfo else raw_end
    
    # Rows of invoices that are successful and within the cycle's date range
    rows = db.query(Invoice).filter(
        Invoice.user_id == user.id,
        Invoice.extraction_status == "success",
        Invoice.created_at >= cycle_start,
        Invoice.created_at <= cycle_end,
    ).all()

    # ALL my categories as {id: node}, so we can climb parents
    cats={}
    for cat in db.query(Category).filter(Category.user_id == user.id).all():
        cats[cat.id] = cat
    # cats = {
    #     cat.id: cat
    #     for cat in db.query(Category).filter(Category.user_id == user.id).all()
    # }

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

    #  the tree loop
    tree = {}      # label -> {"total": x, "count": n}
    tree_ids = {}   # label -> category id of the bucket (bucket mode only)

    for inv in rows:
        # decide which tree this invoice belongs to
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
                    tree_ids[label] = node.id

        # 2) dump it in
        if label not in tree:
            tree[label] = {"total": 0.0, "count": 0}
        tree[label]["total"] += inv.amount or 0
        tree[label]["count"] += 1

    # dict -> sorted list 
    result = []
    for label, p in tree.items():
        result.append({
            "bucket": label,
            "bucket_id": tree_ids.get(label),
            "total": round(p["total"], 2),
            "count": p["count"],
        })

    result.sort(key=lambda r: r["total"], reverse=True)
    return result
