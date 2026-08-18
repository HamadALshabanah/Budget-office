from app.db import Base
import os
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

class APIKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    revoked: Mapped[bool] = mapped_column(default=False, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)                                                
