from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func

from app.deps import get_current_user_or_apikey
from app.db import SessionLocal
from app.models.CycleModel import Cycle as BudgetCycle
from app.models.Category import Category
from app.models.Invoice import Invoice
from app.models.Rule import Rule as CategoryRule
from typing import Optional

router = APIRouter(prefix="/cycles", tags=["cycles"])


def get_cycle_or_404(db, cycle_id: int, user_id: int) -> BudgetCycle:
    cycle = db.query(BudgetCycle).filter_by(id=cycle_id, user_id=user_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    return cycle


def cycle_invoices(db, cycle: BudgetCycle, user_id: int) -> list[Invoice]:
    """All successful invoices in a cycle."""
    end = cycle.end_date or datetime.now()
    return db.query(Invoice).filter(
        Invoice.created_at >= cycle.start_date,
        Invoice.created_at <= end,
        Invoice.extraction_status == "success",
        Invoice.user_id == user_id,
    ).all()


def bucket_by_main(db, user_id: int):
    """Map every category node to its level-1 ancestor name (its 'main' bucket)."""
    cats = {c.id: c for c in db.query(Category).filter_by(user_id=user_id)}

    def main_name(cid):
        node, top = cats.get(cid), None
        while node:
            if node.level == 1:
                top = node.name
            node = cats.get(node.parent_id) if node.parent_id else None
        return top

    return cats, main_name


@router.post("/start")
def start_new_cycle(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user=Depends(get_current_user_or_apikey)):
    """Start a new budget cycle (resets spending tracking)."""
    db = SessionLocal()
    print(f"Starting new cycle with start_date={start_date} and end_date={end_date}")
    if start_date is None:
        start_date = datetime.now().strftime("%Y-%m-%d")
    cycle = db.query(BudgetCycle).filter(
        BudgetCycle.is_active == True, BudgetCycle.user_id == current_user.id
    ).first()
    start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    if cycle is None:
        print("No active cycle found, proceeding to create new cycle.")
    else:
        print(f"Active cycle found: {cycle}. Checking for duplication...")
        if cycle.start_date.date() == start_date:
            db.close()
            return {"status": "error", "message": "A cycle with the same start date already exists"}
        print("No duplication detected, proceeding to end current cycle and create new one.")
    for active in db.query(BudgetCycle).filter(
        BudgetCycle.is_active == True, BudgetCycle.user_id == current_user.id
    ).all():
        active.is_active = False
        active.end_date = datetime.now()

    cycle_end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    new_cycle = BudgetCycle(start_date=start_date, end_date=cycle_end, is_active=True, user_id=current_user.id)
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    result = {"status": "success", "message": "New budget cycle started",
              "cycle_id": new_cycle.id, "start_date": new_cycle.start_date.isoformat()}
    db.close()
    return result


@router.post("/end")
def end_current_cycle(current_user=Depends(get_current_user_or_apikey)):
    """Force end the current active budget cycle."""
    db = SessionLocal()
    active_cycles = db.query(BudgetCycle).filter(
        BudgetCycle.is_active == True, BudgetCycle.user_id == current_user.id
    ).all()
    if not active_cycles:
        db.close()
        return {"status": "error", "message": "No active cycle found"}
    for cycle in active_cycles:
        cycle.is_active = False
        cycle.end_date = datetime.now()
    db.commit()
    db.close()
    return {"status": "success", "message": "Current budget cycle ended"}


@router.get("/current")
def get_current_cycle(current_user=Depends(get_current_user_or_apikey)):
    """Get the current active budget cycle."""
    db = SessionLocal()
    try:
        cycle = db.query(BudgetCycle).filter(
            BudgetCycle.is_active == True, BudgetCycle.user_id == current_user.id
        ).first()
        if not cycle:
            return {"status": "no_active_cycle"}

        start = cycle.start_date.replace(tzinfo=None) if cycle.start_date.tzinfo else cycle.start_date
        days_elapsed = (datetime.now() - start).days
        if cycle.end_date:
            end = cycle.end_date.replace(tzinfo=None) if cycle.end_date.tzinfo else cycle.end_date
            total_days = (end - start).days
            days_remaining = max(0, total_days - days_elapsed)
        else:
            days_remaining = max(0, 30 - days_elapsed)

        return {
            "id": cycle.id,
            "start_date": cycle.start_date.isoformat(),
            "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
            "is_active": cycle.is_active,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
        }
    finally:
        db.close()


@router.get("/history")
def get_cycle_history(limit: int = 12, current_user=Depends(get_current_user_or_apikey)):
    """Get past budget cycles with their totals."""
    db = SessionLocal()
    try:
        cycles = db.query(BudgetCycle).filter(
            BudgetCycle.user_id == current_user.id
        ).order_by(BudgetCycle.start_date.desc()).limit(limit).all()

        result = []
        for cycle in cycles:
            end = cycle.end_date or datetime.now()
            total_spent = db.query(func.sum(Invoice.amount)).filter(
                Invoice.created_at >= cycle.start_date,
                Invoice.created_at <= end,
                Invoice.extraction_status == "success",
                Invoice.user_id == current_user.id,
            ).scalar() or 0
            result.append({
                "id": cycle.id,
                "start_date": cycle.start_date.isoformat(),
                "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
                "is_active": cycle.is_active,
                "total_spent": round(total_spent, 2),
            })
        return result
    finally:
        db.close()


@router.delete("/{cycle_id}")
def delete_cycle(cycle_id: int, current_user=Depends(get_current_user_or_apikey)):
    """Delete a budget cycle."""
    db = SessionLocal()
    cycle = db.query(BudgetCycle).filter(
        BudgetCycle.id == cycle_id, BudgetCycle.user_id == current_user.id
    ).first()
    if not cycle:
        db.close()
        return {"status": "Cycle not found"}
    db.delete(cycle)
    db.commit()
    db.close()
    return {"status": f"Cycle {cycle_id} deleted successfully"}


@router.get("/{cycle_id}/invoices")
def get_cycle_invoices(cycle_id: int, current_user=Depends(get_current_user_or_apikey)):
    """All successful invoices in a cycle."""
    db = SessionLocal()
    cycle = get_cycle_or_404(db, cycle_id, current_user.id)
    invoices = cycle_invoices(db, cycle, current_user.id)
    db.close()
    return [
        {
            "id": inv.id,
            "amount": inv.amount,
            "merchant": inv.merchant,
            "category_id": inv.category_id,
            "classification": inv.classification,
            "extraction_status": inv.extraction_status,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        for inv in invoices
    ]


def pace_of(spent, limit, time_elapsed_pct):
    """Budget consumed % vs time elapsed %: ahead / on_track / behind."""
    if not limit:
        return None
    consumed = (spent / limit) * 100
    diff = consumed - time_elapsed_pct
    if diff > 10:
        return "ahead"      # spending faster than time -> risk
    if diff < -10:
        return "behind"     # comfortably under pace
    return "on_track"


@router.get("/{cycle_id}/analysis")
def cycle_analysis(cycle_id: int, current_user=Depends(get_current_user_or_apikey)):
    """Full cycle analysis: totals, budget pace, per-main-category breakdown, top merchants."""
    db = SessionLocal()
    try:
        cycle = get_cycle_or_404(db, cycle_id, current_user.id)
        invoices = cycle_invoices(db, cycle, current_user.id)

        # Cycle time elapsed — pace baseline (0..100)
        start = cycle.start_date.replace(tzinfo=None) if cycle.start_date.tzinfo else cycle.start_date
        end = cycle.end_date or datetime.now()
        end = end.replace(tzinfo=None) if end.tzinfo else end
        now = datetime.now()
        elapsed_days = max((min(now, end) - start).days, 0)
        planned_days = (end - start).days
        cycle_days = max(planned_days if planned_days > 0 else 30, 1)
        time_elapsed_pct = round(min(elapsed_days / cycle_days, 1.0) * 100, 1)

        total_spent = sum((inv.amount or 0) for inv in invoices)
        transaction_count = len(invoices)
        average_transaction = total_spent / transaction_count if transaction_count else 0

        total_budget = db.query(func.sum(CategoryRule.category_limit)).filter(
            CategoryRule.user_id == current_user.id
        ).scalar() or 0

        # Bucket spend by each invoice's level-1 ancestor; bucket limit = sum of
        # rule limits on any node inside that subtree.
        cats, main_name = bucket_by_main(db, current_user.id)
        rule_limits: dict[str, float] = {}
        for rule in db.query(CategoryRule).filter_by(user_id=current_user.id).all():
            if rule.category_limit and rule.category_id:
                bucket = main_name(rule.category_id)
                if bucket:
                    rule_limits[bucket] = rule_limits.get(bucket, 0) + rule.category_limit

        spent_by_main: dict[str, float] = {}
        categorized = 0.0
        for inv in invoices:
            if not inv.category_id:
                continue
            bucket = main_name(inv.category_id)
            if not bucket:
                continue
            spent_by_main[bucket] = spent_by_main.get(bucket, 0) + (inv.amount or 0)
            categorized += inv.amount or 0

        category_breakdown = []
        for bucket, spent in sorted(spent_by_main.items(), key=lambda x: x[1], reverse=True):
            limit = rule_limits.get(bucket)
            category_breakdown.append({
                "category": bucket,
                "spent": round(spent, 2),
                "limit": limit,
                "percentage_of_total": round((spent / total_spent * 100), 1) if total_spent > 0 else 0,
                "percentage_of_limit": round((spent / limit * 100), 1) if limit else None,
                "pace": pace_of(spent, limit, time_elapsed_pct),
            })

        uncategorized = total_spent - categorized
        if uncategorized > 0.005:
            category_breakdown.append({
                "category": "Uncategorized",
                "spent": round(uncategorized, 2),
                "limit": None,
                "percentage_of_total": round((uncategorized / total_spent * 100), 1) if total_spent > 0 else 0,
                "percentage_of_limit": None,
                "pace": None,
            })

        merchant_spending = {}
        for inv in invoices:
            if inv.merchant:
                merchant_spending[inv.merchant] = merchant_spending.get(inv.merchant, 0) + (inv.amount or 0)
        top_merchants = [
            {"merchant": m, "spent": round(s, 2)}
            for m, s in sorted(merchant_spending.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        return {
            "cycle_id": cycle.id,
            "start_date": cycle.start_date.isoformat(),
            "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
            "is_active": cycle.is_active,
            "total_spent": round(total_spent, 2),
            "total_budget": round(total_budget, 2),
            "remaining_budget": round(total_budget - total_spent, 2),
            "budget_percentage_used": round((total_spent / total_budget * 100), 1) if total_budget > 0 else 0,
            "transaction_count": transaction_count,
            "average_transaction": round(average_transaction, 2),
            "time_elapsed_pct": time_elapsed_pct,
            "cycle_days": cycle_days,
            "overall_pace": pace_of(total_spent, total_budget, time_elapsed_pct),
            "category_breakdown": category_breakdown,
            "top_merchants": top_merchants,
        }
    finally:
        db.close()


@router.get("/{cycle_id}/top-categories")
def cycle_top_categories(cycle_id: int, current_user=Depends(get_current_user_or_apikey)):
    """Ranked spending by main category for a cycle, with sub-category breakdown."""
    db = SessionLocal()
    try:
        cycle = get_cycle_or_404(db, cycle_id, current_user.id)
        invoices = cycle_invoices(db, cycle, current_user.id)

        total_spent = sum((inv.amount or 0) for inv in invoices)

        # Uncategorized spend so parts sum to the whole
        uncategorized = sum((inv.amount or 0) for inv in invoices if not inv.category_id)
        uncategorized_count = sum(1 for inv in invoices if not inv.category_id)

        cats, main_name = bucket_by_main(db, current_user.id)

        def names_of(cid):
            """(main bucket, tagged node name if deeper than level 1)."""
            bucket = main_name(cid)
            node = cats.get(cid)
            sub = node.name if node and node.level >= 2 else "Uncategorized"
            return bucket, sub

        main_agg = {}
        sub_agg = {}
        for inv in invoices:
            if not inv.category_id:
                continue
            cat, sub = names_of(inv.category_id)
            amount = inv.amount or 0
            entry = main_agg.setdefault(cat, {"spent": 0.0, "count": 0})
            entry["spent"] += amount
            entry["count"] += 1

            subs = sub_agg.setdefault(cat, {})
            sub_entry = subs.setdefault(sub, {"spent": 0.0, "count": 0})
            sub_entry["spent"] += amount
            sub_entry["count"] += 1

        categories = []
        for cat, agg in sorted(main_agg.items(), key=lambda x: x[1]["spent"], reverse=True):
            sub_categories = [
                {"name": sub, "spent": round(s["spent"], 2), "count": s["count"]}
                for sub, s in sorted(sub_agg.get(cat, {}).items(), key=lambda x: x[1]["spent"], reverse=True)
            ]
            categories.append({
                "category": cat,
                "spent": round(agg["spent"], 2),
                "count": agg["count"],
                "percentage_of_total": round((agg["spent"] / total_spent * 100), 1) if total_spent > 0 else 0,
                "sub_categories": sub_categories,
            })

        if uncategorized > 0.005:
            categories.append({
                "category": "Uncategorized",
                "spent": round(uncategorized, 2),
                "count": uncategorized_count,
                "percentage_of_total": round((uncategorized / total_spent * 100), 1) if total_spent > 0 else 0,
                "sub_categories": [],
            })

        return {
            "cycle_id": cycle.id,
            "total_spent": round(total_spent, 2),
            "categories": categories,
        }
    finally:
        db.close()


@router.get("/{cycle_id}/spending-timeline")
def cycle_spending_timeline(cycle_id: int, current_user=Depends(get_current_user_or_apikey)):
    """Daily spending data for a cycle, filling in zero-spend days."""
    db = SessionLocal()
    try:
        cycle = get_cycle_or_404(db, cycle_id, current_user.id)
        end = cycle.end_date or datetime.now()
        start = cycle.start_date.replace(tzinfo=None)
        end_clean = end.replace(tzinfo=None) if hasattr(end, 'replace') else end

        daily = db.query(
            func.date(Invoice.created_at).label("day"),
            func.sum(Invoice.amount).label("spent"),
            func.count(Invoice.id).label("count")
        ).filter(
            Invoice.created_at >= cycle.start_date,
            Invoice.created_at <= end,
            Invoice.extraction_status == "success",
            Invoice.user_id == current_user.id
        ).group_by(func.date(Invoice.created_at)).all()

        daily_map = {}
        for row in daily:
            daily_map[str(row.day)] = {"spent": round(row.spent or 0, 2), "count": row.count}

        data = []
        current = start.date() if hasattr(start, 'date') else start
        end_date = end_clean.date() if hasattr(end_clean, 'date') else end_clean
        while current <= end_date:
            key = str(current)
            entry = daily_map.get(key, {"spent": 0, "count": 0})
            data.append({"date": key, "spent": entry["spent"], "count": entry["count"]})
            current += timedelta(days=1)

        return {"data": data}
    finally:
        db.close()
