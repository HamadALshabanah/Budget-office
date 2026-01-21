from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
	pass


engine = create_engine("sqlite+pysqlite:///invoices.db", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Invoice(Base):
	__tablename__ = "invoices"
	id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
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
    merchant_keyword: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    classification: Mapped[str] = mapped_column(String, nullable=False)
    main_category: Mapped[str] = mapped_column(String, nullable=False)
    sub_category: Mapped[str] = mapped_column(String, nullable=False)
    category_limit: Mapped[float] = mapped_column(Float, nullable=True)

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
    )
    db_session.add(invoice)
    db_session.commit()

def init_db() -> None:
	Base.metadata.create_all(bind=engine)
