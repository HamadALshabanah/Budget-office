from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Dict,Optional
import re
import sqlite3
app = FastAPI()

class InvoiceReq(BaseModel):
    message: str

def init_db():
    with sqlite3.connect('invoices.db') as con:
        con.execute('''CREATE TABLE IF NOT EXISTS invoices
                    (id INTEGER PRIMARY KEY, amount REAL, category TEXT, raw_invoice TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        con.commit()


def write_to_db(con,data: Dict):
    with sqlite3.connect("invoices.db") as con:
        cur = con.cursor()
        cur.execute(
            "INSERT INTO invoices (amount, category, raw_invoice) VALUES (?, ?, ?)",
            (data.get("amount"), data.get("category"), data.get("raw_invoice"))
        )
        con.commit()
        
def extract_amount(sms: str):
    # STORE EVERY DATA INVOICEDATA EVEN IT FAILED
    store_match = re.search(r"مبلغ\s*:\s*(?:SAR\s*)?(\d+(?:\.\d{1,2})?)\s*(?:SAR)?",sms)
    internet_match = re.search(r"SAR\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*SAR", sms)
    invo_data={}
    for line in sms.splitlines():
            if ":" in line:
                key,value  = line.split(":",1)
                invo_data[key.strip()] = value.strip()
    
    if "مبلغ" and "لدى" in invo_data:
        raw_amount = float(invo_data["مبلغ"].replace("SAR","").strip())
        category = invo_data["لدى"]
        needed_data = {"amount": raw_amount, "category": category, "raw_invoice": sms}
        write_to_db(init_db(), needed_data)
        return needed_data
    
    # Fallback to regex extraction if structured data is not found 
    try:
        return raw_amount
    except:
        pass
    
    
    if store_match:
            return float(store_match.group(1))
    else:
            return float(internet_match.group(1))

@app.post("/sms/")
async def receive_sms(sms: InvoiceReq):
    print(f"Received SMS data: {sms}")
    amount = extract_amount(sms.message)
    print(f"Extracted amount: {amount}")
    return {"status": "SMS received", "data": sms, "amount": amount}
