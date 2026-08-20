from fastapi import APIRouter, Depends

from app.deps import get_current_user_or_apikey
from app.db import SessionLocal
from app.models.Cycle import Cycle as BudgetCycle
from typing import Optional
from datetime import datetime

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
