from fastapi import APIRouter, Depends
from app.deps import get_current_user_or_apikey
from app.db import SessionLocal
from app.models.Invoice import Invoice
from typing import Optional

from app.classify import classify_merchant
from schema import UpdateInvoiceReq

router = APIRouter(prefix="/invoices", tags=["invoices"])
@router.get("/")
def get_invoices(skip: int = 0, limit: int = 100, search: Optional[str] = None,
                 category_id: Optional[int] = None, min_amount: Optional[float] = None,
                 max_amount: Optional[float] = None, current_user = Depends(get_current_user_or_apikey)):
    db = SessionLocal()
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)

    if search:
        query = query.filter(Invoice.merchant.ilike(f"%{search}%"))
    if category_id is not None:
        query = query.filter(Invoice.category_id == category_id)
    if min_amount is not None:
        query = query.filter(Invoice.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Invoice.amount <= max_amount)

    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    db.close()
    return invoices



@router.get("/{invoice_id}")
def get_invoice(invoice_id:int, current_user = Depends(get_current_user_or_apikey)):
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
        "category_id": invoice.category_id
    }

@router.patch("/{invoice_id}")
def update_invoice(invoice_id:int, req: UpdateInvoiceReq,current_user = Depends(get_current_user_or_apikey)):
    print(f"Updating invoice {invoice_id} with data: {req}")
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        return {"status": "Invoice not found"}
    
    invoice.classification = req.classification
    invoice.category_id = req.category_id
    if req.note is not None:
        invoice.note = req.note
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} updated successfully"}

@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, current_user = Depends(get_current_user_or_apikey)):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id).first()
    if not invoice:
        return {"status": "Invoice not found"}
    db.delete(invoice)
    db.commit()
    db.close()
    return {"status": f"Invoice {invoice_id} deleted successfully"}

@router.post("/categorize")
def categorize_invoices(current_user = Depends(get_current_user_or_apikey)):
    """Re-categorize all invoices based on current rules"""
    db = SessionLocal()
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()
    updated_count = 0
    for invoice in invoices:
        cid = classify_merchant(invoice.merchant)
        if invoice.category_id != cid:
            invoice.category_id = cid
            updated_count += 1
    db.commit()
    db.close()
    return {"status": "success", "updated_invoices": updated_count}
