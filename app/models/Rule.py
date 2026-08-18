from app.db import Base
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

class Rule(Base):
    __tablename__ = "category_rules"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    merchant_keywords: Mapped[str] = mapped_column(String, nullable=False)
    classification: Mapped[str] = mapped_column(String, default="Expense", nullable=False)
    main_category: Mapped[str] = mapped_column(String, nullable=False)
    sub_category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
