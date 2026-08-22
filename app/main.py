from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import hashlib

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Dict,Optional
from app.db import init_db
from models import APIKey, insert_invoice, SessionLocal, CategoryRule, Invoice, BudgetCycle, TransferLimitReq
from sqlalchemy import func
from datetime import datetime, timedelta
from schema import InvoiceReq, InvoiceData, CategoryRuleReq, UpdateInvoiceReq
from app.routes.auth import router as auth_router
from app.routes import invoices, sms, rules, cycles, sms
from app.deps import get_current_user_or_apikey

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(sms.router)
app.include_router(invoices.router)
app.include_router(rules.router)
app.include_router(cycles.router)
