from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
	pass


engine = create_engine("sqlite+pysqlite:///invoices.db", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    merchant: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_invoice: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    extraction_status: Mapped[str] = mapped_column(String, nullable=False)
    
    classification: Mapped[str | None] = mapped_column(String, nullable=True)
    main_category: Mapped[str | None] = mapped_column(String, nullable=True)
    sub_category: Mapped[str | None] = mapped_column(String, nullable=True)    

class CategoryRule(Base):
    __tablename__ = "category_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    merchant_keywords: Mapped[str | None] = mapped_column(String, nullable=True)
    classification: Mapped[str] = mapped_column(String, nullable=False)
    main_category: Mapped[str] = mapped_column(String, nullable=False)
    sub_category: Mapped[str] = mapped_column(String, nullable=False)
    category_limit: Mapped[float] = mapped_column(Float, nullable=True)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

def insert_invoice(data: dict) -> None:
    db_session = SessionLocal()
    invoice = Invoice(
        amount=data.get("amount"),
        merchant=data.get("merchant"),
        raw_invoice=data.get("raw_invoice"),
        extraction_status=data.get("extraction_status"),
        classification=data.get("classification"),
		main_category=data.get("main_category"),
		sub_category=data.get("sub_category"),
        user_id=data.get("user_id"),
    )
    db_session.add(invoice)
    db_session.commit()
    db_session.close()
class BudgetCycle(Base):
    __tablename__ = "budget_cycles"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
class TransferLimitReq(Base):
    __tablename__ = "transfer_limits"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    from_category: Mapped[str] = mapped_column(String, nullable=False)
    to_category: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
def init_db() -> None:
	Base.metadata.create_all(bind=engine)
