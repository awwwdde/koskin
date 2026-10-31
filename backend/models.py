from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, String, Text, JSON, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Enquiry(Base):
    __tablename__ = "enquiries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    direction: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="new", server_default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

class Content(Base):
    __tablename__ = "site_content"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON)

class AdminSession(Base):
    __tablename__ = "admin_sessions"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    credential: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

class Media(Base):
    __tablename__ = "media"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary)
