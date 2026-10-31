from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import logging
import os
import secrets
import uuid

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import delete, select, func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError

from .database import ROOT, Session, engine
from .models import Enquiry, RateBucket
from .admin import router as admin_router, seed_content
from .auth import require_admin

logger = logging.getLogger("portfolio.api")
rate_secret = os.getenv("SECRET_KEY") or secrets.token_hex(32)

def migrate():
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
    command.upgrade(config, "head")

@asynccontextmanager
async def lifespan(app: FastAPI):
    migrate()
    seed_content()
    with Session.begin() as session:
        session.execute(delete(Enquiry).where(Enquiry.created_at < datetime.now(timezone.utc) - timedelta(days=365)))
        session.execute(delete(RateBucket).where(RateBucket.expires_at < datetime.now(timezone.utc)))
    yield
    engine.dispose()

app = FastAPI(title="Roman Koskin Portfolio API", version="0.1.0", lifespan=lifespan, docs_url=None if os.getenv("APP_ENV") == "production" else "/api/docs", redoc_url=None)
app.include_router(admin_router)

@app.middleware("http")
async def private_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/admin"):
        response.headers["Cache-Control"] = "no-store"
    return response

class EnquiryInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    direction: str = Field(default="", max_length=100)
    message: str = Field(min_length=10, max_length=5000)
    website: str = Field(default="", max_length=200)
    consent: bool

@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exception: SQLAlchemyError):
    # Do not log SQL parameters: they can contain the visitor's message.
    logger.error("Database operation failed (%s)", type(exception).__name__)
    return JSONResponse(status_code=503, content={"detail": "Storage temporarily unavailable. Please try again later."})

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

def take_rate_slot(session, key: str, limit: int, expires: datetime):
    insert = sqlite_insert if engine.dialect.name == "sqlite" else pg_insert
    statement = insert(RateBucket).values(key=key, count=1, expires_at=expires)
    statement = statement.on_conflict_do_update(index_elements=["key"], set_={"count": RateBucket.count + 1}, where=RateBucket.count < limit).returning(RateBucket.key)
    if session.execute(statement).scalar_one_or_none() is None:
        raise HTTPException(status_code=429, detail="Please try again later.", headers={"Retry-After": "3600"})

@app.post("/api/enquiries", status_code=201)
def create_enquiry(data: EnquiryInput):
    if not data.consent:
        raise HTTPException(status_code=422, detail="Consent is required.")
    if data.website:
        return {"status": "received"}
    now = datetime.now(timezone.utc)
    window = int(now.timestamp()) // 3600
    email_hash = hmac.new(rate_secret.encode(), str(data.email).lower().encode(), hashlib.sha256).hexdigest()
    enquiry_id = str(uuid.uuid4())
    with Session.begin() as session:
        session.execute(delete(RateBucket).where(RateBucket.expires_at < now))
        session.execute(delete(Enquiry).where(Enquiry.created_at < now - timedelta(days=365)))
        take_rate_slot(session, f"{window}:{email_hash}", 5, now + timedelta(hours=2))
        take_rate_slot(session, f"{window}:global", 200, now + timedelta(hours=2))
        session.add(Enquiry(id=enquiry_id, name=data.name, email=str(data.email), direction=data.direction, message=data.message))
    return {"status": "received", "id": enquiry_id}

@app.get("/api/admin/enquiries")
def list_enquiries(request: Request, authorization: str = Header(default=""), limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0), q: str = Query(default="", max_length=100), status: str = ""):
    token = os.getenv("ADMIN_API_TOKEN", "")
    if not token or not hmac.compare_digest(authorization, f"Bearer {token}"):
        require_admin(request)
    with Session() as session:
        filters = []
        if status:
            filters.append(Enquiry.status == status)
        if q:
            pattern = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            filters.append(or_(*(field.ilike(pattern, escape="\\") for field in [Enquiry.name, Enquiry.email, Enquiry.message])))
        rows = session.scalars(select(Enquiry).where(*filters).order_by(Enquiry.created_at.desc()).offset(offset).limit(limit)).all()
        counts = dict(session.execute(select(Enquiry.status, func.count()).group_by(Enquiry.status)).all())
        return {"items": [{"id": row.id, "name": row.name, "email": row.email, "direction": row.direction, "message": row.message, "status": row.status, "created_at": row.created_at.isoformat()} for row in rows], "limit": limit, "offset": offset, "total": session.scalar(select(func.count()).select_from(Enquiry).where(*filters)), "counts": counts}
