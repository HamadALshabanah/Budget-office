from pydantic import BaseModel, Field
from typing import Optional
import datetime

class InvoiceReq(BaseModel):
    message: str = Field(..., description="The SMS message containing the invoice details")
    timestamp: Optional[datetime.datetime] = Field(None, description="The timestamp of when the SMS was received")

class UpdateInvoiceReq(BaseModel):
    classification: str
    main_category: str
    sub_category: str
    create_rule: bool = False # Checkbox in UI


class InvoiceData(BaseModel):
    amount: Optional[float] = Field(None, description="The extracted amount from the invoice")
    merchant: Optional[str] = Field(None, description="The merchant name from the invoice")
    classification: Optional[str] = Field(None, description="General classification (e.g., Necessities, Luxuries)")
    main_category: Optional[str] = Field(None, description="Main category of the expense")
    sub_category: Optional[str] = Field(None, description="Sub category of the expense")
    raw_invoice: str = Field(..., description="The raw SMS message")
    extraction_status: str = Field(..., description="Status of the extraction process, e.g., 'success' or 'failed'")
    

class CategoryRuleReq(BaseModel):
    merchant_keywords: str = Field(..., description="The keyword to match (e.g., 'Al Nahdi')")
    classification: str = Field(..., description="High level group (e.g., 'Necessities')")
    main_category: str = Field(..., description="Main function (e.g., 'Health')")
    sub_category: str = Field(..., description="Specific industry (e.g., 'Pharmacy')")
    category_limit: Optional[float] = Field(None, description="Optional spending limit for this category")
