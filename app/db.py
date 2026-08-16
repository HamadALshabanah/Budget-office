import os
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DB_PATH = os.environ.get("SQLITE_PATH", "invoices.db")
engine = create_engine(f"sqlite+pysqlite:///{DB_PATH}", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

class Base(DeclarativeBase):
	pass

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
	Base.metadata.create_all(bind=engine)
