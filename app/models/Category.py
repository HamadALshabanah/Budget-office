from app.db import Base
import os
from typing import Optional

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    level: Mapped[int] = mapped_column(default=0)  # 0=classification, 1=main, 2=sub, ...
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    category_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)