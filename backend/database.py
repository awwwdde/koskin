import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
database_url = os.getenv("DATABASE_URL")
if not database_url:
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("DATABASE_URL is required in production; container storage is ephemeral.")
    (ROOT / ".data").mkdir(exist_ok=True)
    database_url = f"sqlite:///{(ROOT / '.data' / 'portfolio.sqlite3').as_posix()}"
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(database_url, pool_pre_ping=True, **({"connect_args": {"check_same_thread": False}} if database_url.startswith("sqlite") else {}))
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass
