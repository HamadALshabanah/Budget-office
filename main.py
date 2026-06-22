from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Dict,Optional
from models import insert_invoice, init_db, SessionLocal, CategoryRule, Invoice, BudgetCycle, TransferLimitReq
from sqlalchemy import func
from datetime import datetime, timedelta
from schema import InvoiceReq, InvoiceData, CategoryRuleReq, UpdateInvoiceReq
from user_session import router as auth_router
from user_session import get_current_user, get_db_session, User
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

init_db()


def extract_amount(sms: str):
    # STORE EVERY DATA INVOICEDATA EVEN IT FAILED
    # SMS messges already comes in K,V format so why not extract directly
    invo_data= {}
    
    #Default state (Assumption: extraction failed)
    extracted_data = {
        "raw_invoice": sms,
        "amount": None,
        "merchant": None,
        "extraction_status": "failed"
    }
    
    for line in sms.splitlines():
            if ":" in line:
                key,value  = line.split(":",1)
                invo_data[key.strip()] = value.strip()
                print(invo_data)
    
    try:
        if "مبلغ" in invo_data and "لدى" in invo_data:
            raw_amount = float(invo_data["مبلغ"].replace("SAR", "").strip())
            merchant = invo_data["لدى"]
            
            extracted_data["amount"] = raw_amount
            extracted_data["merchant"] = merchant
            extracted_data["extraction_status"] = "success"
            
            classification, main_cat, sub_cat = classify_sms(merchant)
            extracted_data['classification'] = classification
            extracted_data['main_category'] = main_cat
            extracted_data['sub_category'] = sub_cat
            
    except ValueError:
        print(f"Error converting amount in SMS: {sms}")
    return InvoiceData(**extracted_data)


def classify_sms(merchant: str):
    """This function classifies the SMS merchant into categories."""
    if not merchant:
        return None,None,None
    db = SessionLocal()
    try:
        rules = db.query(CategoryRule).all()
        print(f"Classification rules: {rules}")
        for rule in rules:
            print(f"Checking rule: {rule.merchant_keywords} against merchant: {merchant}")
            for rule_keyword in rule.merchant_keywords.split(","):
                rule_keyword = rule_keyword.strip()
                if rule_keyword in merchant:
                    return rule.classification, rule.main_category, rule.sub_category

        return None,None,None
    finally:
        db.close()    

@app.post("/rules")
def add_category(rule:CategoryRuleReq,current_user = Depends(get_current_user)):
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

@app.post("/sms")
async def receive_sms(req: InvoiceReq,current_user = Depends(get_current_user)):
    print(f"Received SMS data: {req}")
    init_db()
    invoice_data_schema = extract_amount(req.message)
    invoice_data_schema.user_id = current_user.id
    
    insert_invoice(invoice_data_schema.model_dump())
    
    return {
        "status": "SMS processed", 
        "extraction_status": invoice_data_schema.extraction_status,
        "data": invoice_data_schema
    }

@app.get("/invoices")
def get_invoices(skip: int = 0, limit: int = 100, search: Optional[str] = None, 
                 category: Optional[str] = None, min_amount: Optional[float] = None, 
                 max_amount: Optional[float] = None, current_user = Depends(get_current_user)):
    db = SessionLocal()
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)

    if search:
        query = query.filter(Invoice.merchant.ilike(f"%{search}%"))
    if category:
        query = query.filter(Invoice.main_category == category)
    if min_amount is not None:
        query = query.filter(Invoice.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Invoice.amount <= max_amount)

    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    db.close()
    return invoices

@app.get("/rules")
def get_rules_list(current_user = Depends(get_current_user)):
    db = SessionLocal()
    rules = db.query(CategoryRule).filter(CategoryRule.user_id == current_user.id).all()
    db.close()
    return rules

@app.get("/categories")
def get_categories(current_user = Depends(get_current_user)):
    db = SessionLocal()
    rules = db.query(CategoryRule.main_category).filter(CategoryRule.user_id == current_user.id).distinct().all()
    categories = [r[0] for r in rules if r[0]]
    db.close()
    return categories
    
@app.get("/rules/{rule_id}")    
def get_rule(rule_id: int, current_user = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id, CategoryRule.user_id == current_user.id).first()
    db.close()
    if not rule:
        return {"status": "Rule not found"}
    return {
        "id": rule.id,
        "merchant_keywords": rule.merchant_keywords,
        "classification": rule.classification,
        "main_category": rule.main_category,
        "sub_category": rule.sub_category,
        "category_limit": rule.category_limit
    }

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id:int, current_user = Depends(get_current_user)):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    db.close()
    if not invoice:
        return {"status": "Invoice not found"}
    return {
        "id": invoice.id,
        "amount": invoice.amount,
        "merchant": invoice.merchant,
        "raw_invoice": invoice.raw_invoice,
        "extraction_status": invoice.extraction_status,
        "classification": invoice.classification,
        "main_category": invoice.main_category,
        "sub_category": invoice.sub_category
    }

@app.patch("/invoices/{invoice_id}")
def update_invoice(invoice_id:int, req: UpdateInvoiceReq,current_user = Depends(get_current_user)):
    print(f"Updating invoice {invoice_id} with data: {req}")
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        return {"status": "Invoice not found"}
    
    invoice.classification = req.classification
    invoice.main_category = req.main_category
    invoice.sub_category = req.sub_category
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} updated successfully"}

@app.patch("/rules/{rule_id}")
def update_rule(rule_id:int, req: CategoryRuleReq, current_user = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id, CategoryRule.user_id == current_user.id).first()
    if not rule:
        return {"status": "Rule not found"}
    
    rule.merchant_keywords = req.merchant_keywords
    rule.classification = req.classification
    rule.main_category = req.main_category
    rule.sub_category = req.sub_category
    rule.category_limit = req.category_limit
    db.commit()
    db.close()
    return {"status": f"Rule {rule_id} updated successfully"}

@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, current_user = Depends(get_current_user)):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        return {"status": "Invoice not found"}
    db.delete(invoice)
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} deleted successfully"}

@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, current_user = Depends(get_current_user)):
    db= SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id, CategoryRule.user_id == current_user.id).first()
    if not rule:
        return {"status": "Rule not found"}
    db.delete(rule)
    db.commit()
    db.close()
    return {"status": f"Rule {rule_id} deleted successfully"}

@app.get("/categories/{category}/limit")
def get_category_limit(category: str,current_user = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.main_category == category, CategoryRule.user_id == current_user.id).first()
    db.close()
    if not rule or rule.category_limit is None:
        return {"status": "No limit set for this category"}
    return {
        "main_category": rule.main_category,
        "category_limit": rule.category_limit
    }

@app.post("/cycles/start")
def start_new_cycle(start_date: Optional[str] = None,end_date: Optional[str] = None,current_user = Depends(get_current_user)):
    """Start a new budget cycle (resets spending tracking)
    
    Args:
        start_date: Optional custom start date in format YYYY-MM-DD. Defaults to now.
        end_date: Optional custom end date in format YYYY-MM-DD. Defaults to None.
    """
    db = SessionLocal()
    print(f"Starting new cycle with start_date={start_date} and end_date={end_date}")
    
    # Duplication check
    cycle = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).first()
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
    active_cycles = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).all()
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

@app.delete("/cycles/{cycle_id}")
def delete_cycle(cycle_id: int):
    """Delete a budget cycle and all its associated data (use with caution)"""
    db = SessionLocal()
    cycle = db.get(BudgetCycle, cycle_id)
    db.delete(cycle)
    db.commit()
    db.close()
    return {"status": f"Cycle {cycle_id} deleted successfully"}

@app.post("/cycles/end")
def end_current_cycle():
    """Force end the current active budget cycle"""
    db = SessionLocal()
    active_cycles = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).all()
    
    if not active_cycles:
        db.close()
        return {"status": "error", "message": "No active cycle found"}
        
    for cycle in active_cycles:
        cycle.is_active = False
        cycle.end_date = datetime.now()
        
    db.commit()
    db.close()
    
    return {"status": "success", "message": "Current budget cycle ended"}
    
    
# Endpoint gets the remaining limit for a given main category
@app.get("/categories/{category}/remaining-limit")
def get_remaining_limit(category: str, current_user = Depends(get_current_user)):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.main_category == category, CategoryRule.user_id == current_user.id).first()
    if not rule or rule.category_limit is None:
        db.close()
        return {"status": "No limit set for this category"}
    
    total_spent = db.query(func.sum(Invoice.amount)).filter(
        Invoice.main_category == category,
        Invoice.extraction_status == "success"
    ).scalar() or 0
    
    remaining_limit = rule.category_limit - total_spent
    db.close()
    return {
        "main_category": category,
        "category_limit": rule.category_limit,
        "total_spent": total_spent,
        "remaining_limit": remaining_limit
    }
    

@app.post("/invoices/categorize")
def categorize_invoices(current_user = Depends(get_current_user)):
    """Re-categorize all invoices based on current rules"""
    db = SessionLocal()
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()
    updated_count = 0
    for invoice in invoices:
        classification, main_cat, sub_cat = classify_sms(invoice.merchant)
        if (invoice.classification != classification or 
            invoice.main_category != main_cat or 
            invoice.sub_category != sub_cat):
            invoice.classification = classification
            invoice.main_category = main_cat
            invoice.sub_category = sub_cat
            updated_count += 1
    db.commit()
    db.close()
    return {"status": "success", "updated_invoices": updated_count}

@app.get("/cycles/{cycle_id}/invoices")
def get_cycle_invoices(cycle_id: int):
    """Get all successful invoices for a specific cycle"""
    db = SessionLocal()
    cycle = db.get(BudgetCycle, cycle_id)
    if not cycle:
        db.close()
        return {"status": "Cycle not found"}
    start_date = cycle.start_date
    end_date = cycle.end_date or datetime.now()
    invoices = db.query(Invoice).filter(
        Invoice.created_at >= start_date,
        Invoice.created_at <= end_date,
        Invoice.extraction_status == "success"
    ).order_by(Invoice.created_at.desc()).all()
    db.close()
    return [
        {
            "id": inv.id,
            "amount": inv.amount,
            "merchant": inv.merchant,
            "main_category": inv.main_category,
            "sub_category": inv.sub_category,
            "classification": inv.classification,
            "extraction_status": inv.extraction_status,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        for inv in invoices
    ]
@app.get("/cycles/history")
def get_cycle_history(limit: int = 12):
    """Get past budget cycles"""
    db = SessionLocal()
    try:
        cycles = db.query(BudgetCycle).order_by(BudgetCycle.start_date.desc()).limit(limit).all()
        
        result = []
        for cycle in cycles:
            # Get total spent in this cycle
            end = cycle.end_date or datetime.now()
            total_spent = db.query(func.sum(Invoice.amount)).filter(
                Invoice.created_at >= cycle.start_date,
                Invoice.created_at <= end,
                Invoice.extraction_status == "success"
            ).scalar() or 0
            
            result.append({
                "id": cycle.id,
                "start_date": cycle.start_date.isoformat(),
                "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
                "is_active": cycle.is_active,
                "total_spent": round(total_spent, 2)
            })
        
        return result
    finally:
        db.close()
        
@app.get("/cycles/current")
def get_current_cycle():
    """Get the current active budget cycle"""
    db = SessionLocal()
    try:
        cycle = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).first()
        
        if not cycle:
            return {"status": "no_active_cycle"}
        
        # Calculate days in cycle
        days_elapsed = (datetime.now() - cycle.start_date.replace(tzinfo=None)).days
        
        if cycle.end_date:
            total_days = (cycle.end_date.replace(tzinfo=None) - cycle.start_date.replace(tzinfo=None)).days
            days_remaining = max(0, total_days - days_elapsed)
        else:
            days_remaining = max(0, 30 - days_elapsed)
        
        return {
            "id": cycle.id,
            "start_date": cycle.start_date.isoformat(),
            "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
            "is_active": cycle.is_active,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining
        }
    finally:
        db.close()

@app.get("/categories/{category}/analysis")
def category_analysis(category: str):
    db = SessionLocal()
    total_spent = db.query(func.sum(Invoice.amount)).filter(
        Invoice.main_category == category,
        Invoice.extraction_status == "success"
    ).scalar() or 0
    
    invoice_count = db.query(func.count(Invoice.id)).filter(
        Invoice.main_category == category,
        Invoice.extraction_status == "success"
    ).scalar() or 0
    
    average_spent = total_spent / invoice_count if invoice_count > 0 else 0
    
    db.close()
    return {
        "main_category": category,
        "total_spent": total_spent,
        "invoice_count": invoice_count,
        "average_spent": average_spent
    }
    
@app.get("/cycles/{cycle_id}/analysis")
def cycle_analysis(cycle_id: int):
    db = SessionLocal()
    
    cycle = db.get(BudgetCycle, cycle_id)
    
    end = cycle.end_date or datetime.now()
    invoices = db.query(Invoice).filter(
        Invoice.created_at >= cycle.start_date,
        Invoice.created_at <= end,
        Invoice.extraction_status == "success"
    ).all()
    
    
    total_spent = sum(inv.amount for inv in invoices)
    transaction_count = len(invoices)
    average_transaction = total_spent / transaction_count if transaction_count > 0 else 0
    
    total_budget  = db.query(func.sum(CategoryRule.category_limit)).scalar() or 0
    
    # Initialize all categories with 0 spend
    all_rules = db.query(CategoryRule).all()            
    category_spending = {rule.main_category: 0 for rule in all_rules if rule.main_category}
    
    for inv in invoices:
        cat = inv.main_category
        if cat:
            category_spending[cat] = category_spending.get(cat, 0) + (inv.amount or 0)
    
    category_breakdown = []
    for cat, spent in sorted(category_spending.items(), key=lambda x: x[1], reverse=True):
            rule = db.query(CategoryRule).filter(CategoryRule.main_category == cat).first()
            limit = rule.category_limit if rule else None
            category_breakdown.append({
                "category": cat,
                "spent": round(spent, 2),
                "limit": limit,
                "percentage_of_total": round((spent / total_spent * 100), 1) if total_spent > 0 else 0,
                "percentage_of_limit": round((spent / limit * 100), 1) if limit else None
            })
        
        # Top merchants
    merchant_spending = {}
    for inv in invoices:
            if inv.merchant:
                merchant_spending[inv.merchant] = merchant_spending.get(inv.merchant, 0) + (inv.amount or 0)
        
    top_merchants = [
            {"merchant": m, "spent": round(s, 2)}
            for m, s in sorted(merchant_spending.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
    db.close()

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
            "category_breakdown": category_breakdown,
            "top_merchants": top_merchants,
        }

@app.get("/cycles/{cycle_id}/spending-timeline")
def cycle_spending_timeline(cycle_id: int):
    """Get daily spending data for a cycle, filling in zero-spend days"""
    db = SessionLocal()
    try:
        cycle = db.get(BudgetCycle, cycle_id)
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
            Invoice.extraction_status == "success"
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
            data.append({"date": key, "spent": entry["spent"], "count": entry["count"]})
            current += timedelta(days=1)

        return {"data": data}
    finally:
        db.close()

# @app.post("/category/transfer-limit/")
# def transfer_category_limit(req:TransferLimitReq):
    
#     db = SessionLocal()
#     source_rule = db.get(CategoryRule, req.source_rule_id)
#     target_rule = db.get(CategoryRule, req.target_rule_id)
#     if source_rule.category_limit < req.amount:
#         db.close()
#         return {"status": "Insufficient limit in source category"}
    
#     source_rule.category_limit -= req.amount
#     target_rule.category_limit += req.amount
#     db.commit()
#     db.close()
#     return {"status": "Transfer successful"}