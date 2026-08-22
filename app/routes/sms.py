from fastapi import APIRouter, Depends

from app.classify import classify_merchant
from app.deps import get_current_user_or_apikey
from app.db import SessionLocal
from app.models.Invoice import Invoice
from schema import InvoiceReq

router = APIRouter(prefix="/sms", tags=["sms"])


def extract_amount(sms: str) -> dict:
    """Parse K,V SMS lines into an invoice dict. Failed extractions are kept too."""
    data = {"raw_invoice": sms, "amount": None, "merchant": None,
            "category_id": None, "extraction_status": "failed"}

    kv = {}
    for line in sms.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            kv[key.strip()] = value.strip()

    try:
        if "مبلغ" in kv and "لدى" in kv:
            data["amount"] = float(kv["مبلغ"].replace("SAR", "").strip())
            data["merchant"] = kv["لدى"]
            data["extraction_status"] = "success"
            data["category_id"] = classify_merchant(data["merchant"])
    except ValueError:
        print(f"Error converting amount in SMS: {sms}")
    return data


@router.post("/")
async def receive_sms(req: InvoiceReq, current_user=Depends(get_current_user_or_apikey)):
    data = extract_amount(req.message)
    db = SessionLocal()
    db.add(Invoice(user_id=current_user.id, **data))
    db.commit()
    db.close()
    return {"status": "SMS processed", "extraction_status": data["extraction_status"], "data": data}
