from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Dict,Optional
from models import insert_invoice, init_db, SessionLocal, CategoryRule, Invoice, BudgetCycle
from sqlalchemy import func
from datetime import datetime
from schema import InvoiceReq, InvoiceData, CategoryRuleReq, UpdateInvoiceReq
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/rules/")
def add_category(rule:CategoryRuleReq):
    db = SessionLocal()
    category_rule = CategoryRule(
        merchant_keywords=rule.merchant_keywords,
        classification=rule.classification,
        main_category=rule.main_category,
        sub_category=rule.sub_category,
        category_limit=rule.category_limit
    )
    db.add(category_rule)
    db.commit()
    db.close()
    return {"status":f"Category {rule.classification} added successfully"}

@app.post("/sms/")
async def receive_sms(req: InvoiceReq):
    print(f"Received SMS data: {req}")
    init_db()
    invoice_data_schema = extract_amount(req.message)
    
    insert_invoice(invoice_data_schema.model_dump())
    
    return {
        "status": "SMS processed", 
        "extraction_status": invoice_data_schema.extraction_status,
        "data": invoice_data_schema
    }

@app.get("/invoices/")
def get_invoices(skip: int = 0, limit: int = 100):
    db = SessionLocal()
    invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    db.close()
    return invoices

@app.get("/rules_list/")
def get_rules_list():
    db = SessionLocal()
    rules = db.query(CategoryRule).all()
    db.close()
    return rules

@app.get("/categories/")
def get_categories():
    db = SessionLocal()
    rules = db.query(CategoryRule.main_category).distinct().all()
    categories = [r[0] for r in rules if r[0]]
    db.close()
    return categories
    
@app.get("/rules/{rule_id}")    
def get_rule(rule_id: int):
    db = SessionLocal()
    rule = db.get(CategoryRule, rule_id)
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
def get_invoice(invoice_id:int):
    db = SessionLocal()
    invoice = db.get(Invoice, invoice_id)
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

@app.patch("/invoice/{invoice_id}")
def update_invoice(invoice_id:int, req: UpdateInvoiceReq):
    db = SessionLocal()
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        return {"status": "Invoice not found"}
    
    invoice.classification = req.classification
    invoice.main_category = req.main_category
    invoice.sub_category = req.sub_category
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} updated successfully"}

@app.patch("/rule/{rule_id}")
def update_rule(rule_id:int, req: CategoryRuleReq):
    db = SessionLocal()
    rule = db.get(CategoryRule, rule_id)
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

@app.delete("/invoice/{invoice_id}")
def delete_invoice(invoice_id: int):
    db = SessionLocal()
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        return {"status": "Invoice not found"}
    db.delete(invoice)
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} deleted successfully"}

@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: int):
    db= SessionLocal()
    rule = db.get(CategoryRule, rule_id)
    if not rule:
        return {"status": "Rule not found"}
    db.delete(rule)
    db.commit()
    db.close()
    return {"status": f"Rule {rule_id} deleted successfully"}

@app.get("/category/limit/{category}")
def get_category_limit(category: str):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.main_category == category).first()
    db.close()
    if not rule or rule.category_limit is None:
        return {"status": "No limit set for this category"}
    return {
        "main_category": rule.main_category,
        "category_limit": rule.category_limit
    }

@app.post("/cycle/start")
def start_new_cycle(start_date: Optional[str] = None):
    """Start a new budget cycle (resets spending tracking)
    
    Args:
        start_date: Optional custom start date in format YYYY-MM-DD. Defaults to now.
    """
    db = SessionLocal()
    try:
        # End any active cycles
        active_cycles = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).all()
        for cycle in active_cycles:
            cycle.is_active = False
            cycle.end_date = datetime.now()
        
        cycle_start = datetime.strptime(start_date, "%Y-%m-%d")
        
        # Create new cycle
        new_cycle = BudgetCycle(start_date=cycle_start, is_active=True)
        db.add(new_cycle)
        db.commit()
        
        return {
            "status": "success",
            "message": "New budget cycle started",
            "cycle_id": new_cycle.id,
            "start_date": new_cycle.start_date.isoformat()
        }
    finally:
        db.close()
    
# Endpoint gets the remaining limit for a given main category
@app.get("/category/remaining_limit/{category}")
def get_remaining_limit(category: str):
    db = SessionLocal()
    rule = db.query(CategoryRule).filter(CategoryRule.main_category == category).first()
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
    
    
@app.get("/cycle/history")
def get_cycle_history(limit: int = 12):
    """Get past budget cycles"""
    db = SessionLocal()
    try:
        cycles = db.query(BudgetCycle).order_by(BudgetCycle.start_date.desc()).limit(limit).all()
        
        result = []
        for cycle in cycles:
            # Get total spent in this cycle
            end = cycle.end_date or datetime.utcnow()
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
        
@app.get("/cycle/current")
def get_current_cycle():
    """Get the current active budget cycle"""
    db = SessionLocal()
    try:
        cycle = db.query(BudgetCycle).filter(BudgetCycle.is_active == True).first()
        
        if not cycle:
            return {"status": "no_active_cycle"}
        
        # Calculate days in cycle
        days_elapsed = (datetime.now() - cycle.start_date.replace(tzinfo=None)).days
        days_remaining = max(0, 30 - days_elapsed)
        
        return {
            "id": cycle.id,
            "start_date": cycle.start_date.isoformat(),
            "is_active": cycle.is_active,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining
        }
    finally:
        db.close()

@app.get("/category/analysis/{category}")
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
    
@app.get("/cycle/{cycle_id}/analysis")
def cycle_analysis(cycle_id: int):
    db = SessionLocal()
    
    cycle = db.get(BudgetCycle, cycle_id)
    
    invoices = db.query(Invoice).filter(
        Invoice.created_at >= cycle.start_date,
        Invoice.created_at <= cycle.end_date,
        Invoice.extraction_status == "success"
    ).all()
    
    
    total_spent = sum(inv.amount for inv in invoices)
    transaction_count = len(invoices)
    average_transaction = total_spent / transaction_count if transaction_count > 0 else 0
    
    total_budget  = db.query(func.sum(CategoryRule.category_limit)).scalar() or 0
    
    category_spending = {}
    for inv in invoices:
        cat = inv.main_category
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
