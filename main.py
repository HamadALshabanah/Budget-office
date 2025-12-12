from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Dict,Optional
import re
app = FastAPI()
def extract_amount(msg: str):
    store_match = re.search(r"مبلغ\s*:\s*(?:SAR\s*)?(\d+(?:\.\d{1,2})?)\s*(?:SAR)?",msg)
    internet_match = re.search(r"SAR\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*SAR", msg)
    invo_data={}
    for line in msg.splitlines():
            if ":" in line:
                key,value  = line.split(":",1)
                invo_data[key.strip()] = value.strip()
    
    if "مبلغ" and "لدى" in invo_data:
        raw_amount = float(invo_data["مبلغ"].replace("SAR","").strip())
        category = invo_data["لدى"]
        needed_data = {"amount": raw_amount, "category": category}
        return needed_data

    try:
        return raw_amount
    except:
        pass
    
    
    if store_match:
            return float(store_match.group(1))
    else:
            return float(internet_match.group(1))

@app.post("/sms/")
async def receive_sms(sms: Dict):
    print(f"Received SMS data: {sms}")
    amount = extract_amount(sms.get("message", ""))
    print(f"Extracted amount: {amount}")
    return {"status": "SMS received", "data": sms, "amount": amount}