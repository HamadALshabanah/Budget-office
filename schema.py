from pydantic import BaseModel, Field
from typing import Optional
import datetime

class InvoiceReq(BaseModel):
    message: str = Field(..., description="The SMS message containing the invoice details")
    timestamp: Optional[datetime.datetime] = Field(None, description="The timestamp of when the SMS was received")
    
class InvoiceData(BaseModel):
    amount: Optional[float] = Field(None, description="The extracted amount from the invoice")
    merchant: Optional[str] = Field(None, description="The merchant name from the invoice")
    raw_invoice: str = Field(..., description="The raw SMS message")
    extraction_status: str = Field(..., description="Status of the extraction process, e.g., 'success' or 'failed'")
    
