import os
import sys
from datetime import datetime, timedelta
from models import init_db, SessionLocal, Invoice, CategoryRule, BudgetCycle, Base, engine,User
from user_session import login, register,RegisterRequest

def clear_db():
    print("Clearing existing database...")
    # Drop all tables and recreate them to ensure a completely clean state
    Base.metadata.drop_all(bind=engine)
    init_db()

def seed_data():
    db = SessionLocal()
    
    # 1. Add Category Rules
    rules = [
        CategoryRule(
            merchant_keywords="Starbucks, Dunkin, Caribou",
            classification="Expense",
            main_category="Food & Drink",
            sub_category="Coffee",
            category_limit=400.0
        ),
        CategoryRule(
            merchant_keywords="Al Nahdi, Pharmacy, Dawaa",
            classification="Expense",
            main_category="Health",
            sub_category="Pharmacy",
            category_limit=600.0
        ),
        CategoryRule(
            merchant_keywords="Uber, Careem, Bolt",
            classification="Expense",
            main_category="Transport",
            sub_category="Ride-hailing",
            category_limit=500.0
        ),
        CategoryRule(
            merchant_keywords="Panda, Carrefour, Lulu, Grocery",
            classification="Expense",
            main_category="Groceries",
            sub_category="Supermarket",
            category_limit=1800.0
        ),
        CategoryRule(
            merchant_keywords="Netflix, Spotify, Apple",
            classification="Expense",
            main_category="Entertainment",
            sub_category="Subscriptions",
            category_limit=200.0
        ),
        CategoryRule(
            merchant_keywords="Zara, H&M, Namshi",
            classification="Expense",
            main_category="Shopping",
            sub_category="Apparel",
            category_limit=800.0
        )
    ]
    
    print("Adding default category rules...")
    db.add_all(rules)
    db.commit()

    # 2. Add Budget Cycles
    now = datetime.now()
    
    # Past completed cycle (starts 45 days ago, ends 15 days ago)
    past_start = now - timedelta(days=45)
    past_end = now - timedelta(days=15)
    
    # Current active cycle (starts 15 days ago)
    current_start = now - timedelta(days=15)
    
    past_cycle = BudgetCycle(
        start_date=past_start,
        end_date=past_end,
        is_active=False
    )
    
    current_cycle = BudgetCycle(
        start_date=current_start,
        is_active=True
    )
    
    print("Adding budget cycles...")
    db.add(past_cycle)
    db.add(current_cycle)
    db.commit()

    # 3. Add Invoices
    # Helper to generate Arabic style bank SMS
    def create_sms(merchant, amount):
        return f"عملية شراء من البنك الأهلي\nمبلغ: {amount:.2f} SAR\nلدى: {merchant}\nبطاقة: *1234"

    # Invoices for the past cycle (30 days to 15 days ago)
    past_invoices = [
        # Successful extractions matching category rules
        {
            "raw": create_sms("Starbucks", 24.50),
            "amount": 24.50,
            "merchant": "Starbucks",
            "status": "success",
            "classification": "Expense",
            "main": "Food & Drink",
            "sub": "Coffee",
            "days_offset": 30
        },
        {
            "raw": create_sms("Al Nahdi Pharmacy", 145.00),
            "amount": 145.00,
            "merchant": "Al Nahdi Pharmacy",
            "status": "success",
            "classification": "Expense",
            "main": "Health",
            "sub": "Pharmacy",
            "days_offset": 28
        },
        {
            "raw": create_sms("Uber Trip", 35.00),
            "amount": 35.00,
            "merchant": "Uber Trip",
            "status": "success",
            "classification": "Expense",
            "main": "Transport",
            "sub": "Ride-hailing",
            "days_offset": 25
        },
        {
            "raw": create_sms("Panda Supermarket", 620.15),
            "amount": 620.15,
            "merchant": "Panda Supermarket",
            "status": "success",
            "classification": "Expense",
            "main": "Groceries",
            "sub": "Supermarket",
            "days_offset": 22
        },
        {
            "raw": create_sms("Zara Riyadh", 450.00),
            "amount": 450.00,
            "merchant": "Zara Riyadh",
            "status": "success",
            "classification": "Expense",
            "main": "Shopping",
            "sub": "Apparel",
            "days_offset": 18
        },
        # A failed SMS extraction (unstructured / wrong format)
        {
            "raw": "نود تذكيركم بسداد مستحقاتكم قبل نهاية الأسبوع لتجنب إيقاف الخدمة.",
            "amount": None,
            "merchant": None,
            "status": "failed",
            "classification": None,
            "main": None,
            "sub": None,
            "days_offset": 16
        }
    ]

    # Invoices for the current active cycle (last 15 days)
    current_invoices = [
        {
            "raw": create_sms("Starbucks", 32.00),
            "amount": 32.00,
            "merchant": "Starbucks",
            "status": "success",
            "classification": "Expense",
            "main": "Food & Drink",
            "sub": "Coffee",
            "days_offset": 14
        },
        {
            "raw": create_sms("Dunkin Riyadh", 18.50),
            "amount": 18.50,
            "merchant": "Dunkin Riyadh",
            "status": "success",
            "classification": "Expense",
            "main": "Food & Drink",
            "sub": "Coffee",
            "days_offset": 12
        },
        {
            "raw": create_sms("Panda", 412.30),
            "amount": 412.30,
            "merchant": "Panda",
            "status": "success",
            "classification": "Expense",
            "main": "Groceries",
            "sub": "Supermarket",
            "days_offset": 10
        },
        {
            "raw": create_sms("Careem Ride", 42.00),
            "amount": 42.00,
            "merchant": "Careem Ride",
            "status": "success",
            "classification": "Expense",
            "main": "Transport",
            "sub": "Ride-hailing",
            "days_offset": 8
        },
        {
            "raw": create_sms("Netflix Subscription", 56.00),
            "amount": 56.00,
            "merchant": "Netflix Subscription",
            "status": "success",
            "classification": "Expense",
            "main": "Entertainment",
            "sub": "Subscriptions",
            "days_offset": 5
        },
        {
            "raw": create_sms("Al Nahdi Pharmacy", 89.20),
            "amount": 89.20,
            "merchant": "Al Nahdi Pharmacy",
            "status": "success",
            "classification": "Expense",
            "main": "Health",
            "sub": "Pharmacy",
            "days_offset": 3
        },
        {
            "raw": create_sms("H&M Riyadh", 249.00),
            "amount": 249.00,
            "merchant": "H&M Riyadh",
            "status": "success",
            "classification": "Expense",
            "main": "Shopping",
            "sub": "Apparel",
            "days_offset": 1
        },
        # An unclassified successful merchant (does not match rules)
        {
            "raw": create_sms("Gas Station", 75.00),
            "amount": 75.00,
            "merchant": "Gas Station",
            "status": "success",
            "classification": None,
            "main": None,
            "sub": None,
            "days_offset": 2
        }
    ]

    print("Adding invoices for past and active cycles...")
    
    # Store past cycle invoices
    for inv in past_invoices:
        invoice = Invoice(
            raw_invoice=inv["raw"],
            amount=inv["amount"],
            merchant=inv["merchant"],
            extraction_status=inv["status"],
            classification=inv["classification"],
            main_category=inv["main"],
            sub_category=inv["sub"],
            created_at=now - timedelta(days=inv["days_offset"])
        )
        db.add(invoice)

    # Store current cycle invoices
    for inv in current_invoices:
        invoice = Invoice(
            raw_invoice=inv["raw"],
            amount=inv["amount"],
            merchant=inv["merchant"],
            extraction_status=inv["status"],
            classification=inv["classification"],
            main_category=inv["main"],
            sub_category=inv["sub"],
            created_at=now - timedelta(days=inv["days_offset"])
        )
        db.add(invoice)
    # Link it to a user
    User1 = User(username="testuser", password_hash="hashedpassword")
    db.add(User1)
    register(RegisterRequest(username="testuser", password="testpassword"))
    db.commit()
    db.close()
    print("Database seeding completed successfully! ✨")

if __name__ == "__main__":
    clear_db()
    seed_data()
