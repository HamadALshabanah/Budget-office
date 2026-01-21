from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Dict,Optional
from models import insert_invoice, init_db,SessionLocal,CategoryRule,Invoice
from sqlalchemy import func
from schema import InvoiceReq, InvoiceData, CategoryRuleReq, UpdateInvoiceReq
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
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
            if rule.merchant_keyword in merchant:
                return rule.classification, rule.main_category, rule.sub_category

        return None,None,None
    finally:
        db.close()    

@app.post("/rules/")
def add_category(rule:CategoryRuleReq):
    db = SessionLocal()
    category_rule = CategoryRule(
        merchant_keyword=rule.merchant_keyword,
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
        "merchant_keyword": rule.merchant_keyword,
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
    
    rule.merchant_keyword = req.merchant_keyword
    rule.classification = req.classification
    rule.main_category = req.main_category
    rule.sub_category = req.sub_category
    rule.category_limit = req.category_limit
    db.commit()
    db.close()
    return {"status": f"Rule {rule_id} updated successfully"}

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