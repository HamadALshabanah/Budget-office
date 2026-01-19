from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Dict,Optional
from models import insert_invoice, init_db
from schema import InvoiceReq, InvoiceData
app = FastAPI()


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
            
    except ValueError:
        print(f"Error converting amount in SMS: {sms}")
    return InvoiceData(**extracted_data)
    # Fallback to regex extraction if structured data is not found 
    # try:
    #     return raw_amount
    # except:
    #     pass
    
    # store_match = re.search(r"مبلغ\s*:\s*(?:SAR\s*)?(\d+(?:\.\d{1,2})?)\s*(?:SAR)?",sms)
    # internet_match = re.search(r"SAR\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*SAR", sms)

    # if store_match:
    #         return float(store_match.group(1))
    # else:
    #         return float(internet_match.group(1))

def classify_sms(sms: str):
    """This function classifies the SMS merchant into categories ."""
    return "general"
    

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