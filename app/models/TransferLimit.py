from app.db import Base
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

class TransferLimit(Base):
    __tablename__ = "transfer_limits"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    from_category: Mapped[str] = mapped_column(String, nullable=False)
    to_category: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
