from fastapi import APIRouter, Depends

from app.deps import get_current_user_or_apikey
from app.db import SessionLocal
from app.models.Cycle import Cycle as BudgetCycle
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/cycles", tags=["cycles"])


@router.post("/cycles/start")
def start_new_cycle(start_date: Optional[str] = None,end_date: Optional[str] = None,current_user = Depends(get_current_user_or_apikey)):
    """Start a new budget cycle (resets spending tracking)
    
    Args:
        start_date: Optional custom start date in format YYYY-MM-DD. Defaults to now.
        end_date: Optional custom end date in format YYYY-MM-DD. Defaults to None.
    """
    db = SessionLocal()
    print(f"Starting new cycle with start_date={start_date} and end_date={end_date}")
    if start_date is None:
        start_date = datetime.now().strftime("%Y-%m-%d")
    # Duplication check
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
    # End any active cycles
    active_cycles = db.query(BudgetCycle).filter(
        BudgetCycle.is_active == True, BudgetCycle.user_id == current_user.id
    ).all()
    for cycle in active_cycles:
            cycle.is_active = False
            cycle.end_date = datetime.now()
        
    cycle_end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    # Create new cycle
    new_cycle = BudgetCycle(start_date=start_date, end_date=cycle_end, is_active=True, user_id=current_user.id)
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    cycle_id = new_cycle.id
    start_date_iso = new_cycle.start_date.isoformat()
    db.close()

    return {
            "status": "success",
            "message": "New budget cycle started",
            "cycle_id": cycle_id,
            "start_date": start_date_iso,
        }

@router.delete("/cycles/{cycle_id}")
def delete_cycle(cycle_id: int, current_user = Depends(get_current_user_or_apikey)):
    """Delete a budget cycle and all its associated data (use with caution)"""
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

@router.post("/cycles/end")
def end_current_cycle(current_user = Depends(get_current_user_or_apikey)):
    """Force end the current active budget cycle"""
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


@router.get("/cycles/{cycle_id}/top-categories")
def cycle_top_categories(cycle_id: int, current_user = Depends(get_current_user_or_apikey)):
    """Ranked spending by main category for a cycle, with sub-category breakdown."""
    db = SessionLocal()
    try:
        cycle = db.query(BudgetCycle).filter(
            BudgetCycle.id == cycle_id, BudgetCycle.user_id == current_user.id
        ).first()
        if not cycle:
            raise HTTPException(status_code=404, detail="Cycle not found")

        end = cycle.end_date or datetime.now()
        invoices = db.query(Invoice).filter(
            Invoice.created_at >= cycle.start_date,
            Invoice.created_at <= end,
            Invoice.extraction_status == "success",
            Invoice.user_id == current_user.id
        ).all()

        total_spent = sum((inv.amount or 0) for inv in invoices)

        # Uncategorized spend so parts sum to the whole
        uncategorized = sum((inv.amount or 0) for inv in invoices if not inv.main_category)
        uncategorized_count = sum(1 for inv in invoices if not inv.main_category)

        # Aggregate per main category and sub category
        main_agg = {}  # cat -> {"spent": float, "count": int}
        sub_agg = {}   # cat -> {sub: {"spent": float, "count": int}}
        for inv in invoices:
            cat = inv.main_category
            if not cat:
                continue
            amount = inv.amount or 0
            entry = main_agg.setdefault(cat, {"spent": 0.0, "count": 0})
            entry["spent"] += amount
            entry["count"] += 1

            sub = inv.sub_category or "Uncategorized"
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
            categories.routerend({
                "category": cat,
                "spent": round(agg["spent"], 2),
                "count": agg["count"],
                "percentage_of_total": round((agg["spent"] / total_spent * 100), 1) if total_spent > 0 else 0,
                "sub_categories": sub_categories,
            })

        if uncategorized > 0.005:
            categories.routerend({
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

@router.get("/cycles/{cycle_id}/spending-timeline")
def cycle_spending_timeline(cycle_id: int, current_user = Depends(get_current_user_or_apikey)):
    """Get daily spending data for a cycle, filling in zero-spend days"""
    db = SessionLocal()
    try:
        cycle = db.query(BudgetCycle).filter(
            BudgetCycle.id == cycle_id, BudgetCycle.user_id == current_user.id
        ).first()
        if not cycle:
            return {"data": []}

        end = cycle.end_date or datetime.now()
        start = cycle.start_date.replace(tzinfo=None)
        end_clean = end.replace(tzinfo=None) if hasattr(end, 'replace') else end

        # Query daily totals
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

        # Build lookup
        daily_map = {}
        for row in daily:
            daily_map[str(row.day)] = {"spent": round(row.spent or 0, 2), "count": row.count}

        # Fill all days in range
        data = []
        current = start.date() if hasattr(start, 'date') else start
        end_date = end_clean.date() if hasattr(end_clean, 'date') else end_clean
        while current <= end_date:
            key = str(current)
            entry = daily_map.get(key, {"spent": 0, "count": 0})
            data.routerend({"date": key, "spent": entry["spent"], "count": entry["count"]})
            current += timedelta(days=1)

        return {"data": data}
    finally:
        db.close()

