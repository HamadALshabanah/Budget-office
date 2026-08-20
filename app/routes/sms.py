
from fastapi import APIRouter,Depends
from app.deps import get_current_user_or_apikey
from schema import InvoiceReq
from app.db import init_db
from app.db import SessionLocal
from app.deps import get_current_user_or_apikey
from schema import InvoiceReq
router = APIRouter(prefix="/sms", tags=["sms"])

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

@router.post("/")
async def receive_sms(req: InvoiceReq,current_user = Depends(get_current_user_or_apikey)):
    print(f"Received SMS data: {req}")
    init_db()
    invoice_data_schema = extract_amount(req.message)
    invoice_dict = invoice_data_schema.model_dump()
    invoice_dict["user_id"] = current_user.id
    
    insert_invoice(invoice_dict)
    
    return {
        "status": "SMS processed", 
        "extraction_status": invoice_data_schema.extraction_status,
        "data": invoice_data_schema
    }
