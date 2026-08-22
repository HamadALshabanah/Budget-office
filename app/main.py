from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from .routes import invoices, sms, rules, cycles, categories, auth,analytics
from .db import init_db
init_db()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, specify frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(sms.router)
app.include_router(invoices.router)
app.include_router(rules.router)
app.include_router(cycles.router)
app.include_router(categories.router)
app.include_router(analytics.router)
