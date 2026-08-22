from pydantic import BaseModel, Field
from typing import List, Optional
import datetime

class InvoiceReq(BaseModel):
    message: str = Field(..., description="The SMS message containing the invoice details")
    timestamp: Optional[datetime.datetime] = Field(None, description="The timestamp of when the SMS was received")

class UpdateInvoiceReq(BaseModel):
    classification: Optional[str] = None
    category_id: Optional[int] = None
    note: Optional[str] = None
    create_rule: bool = False # Checkbox in UI


class InvoiceData(BaseModel):
    amount: Optional[float] = Field(None, description="The extracted amount from the invoice")
    merchant: Optional[str] = Field(None, description="The merchant name from the invoice")
    classification: Optional[str] = Field(None, description="General classification (e.g., Necessities, Luxuries)")
    category_id: Optional[int] = Field(None, description="Category node the invoice belongs to")
    raw_invoice: str = Field(..., description="The raw SMS message")
    extraction_status: str = Field(..., description="Status of the extraction process, e.g., 'success' or 'failed'")


class CategoryCreateReq(BaseModel):
    name: str
    parent_id: Optional[int] = None
    category_limit: Optional[float] = None

class CategoryRuleReq(BaseModel):
    merchant_keywords: str
    category_id: int
    classification: str = "Expense"
    category_limit: Optional[float] = None

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
