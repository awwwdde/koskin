import hashlib
import hmac
import io
import json
import os
import secrets
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from sqlalchemy import delete, update
from PIL import Image, UnidentifiedImageError
from .auth import COOKIE, credentials, fingerprint, require_admin, session_digest, verify_password
from .database import ROOT, Session, engine
from .models import AdminSession, Content, Enquiry, Media

router = APIRouter()
private = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])
Image.MAX_IMAGE_PIXELS = 20_000_000

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class Login(StrictModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    username: str = Field(max_length=100)
    password: str = Field(max_length=256)

class Service(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=2000)

class Settings(StrictModel):
    about: str = Field(min_length=1, max_length=2000)
    biography: str = Field(max_length=5000)
    extra: str = Field(max_length=2000)
    email: EmailStr
    phone: str = Field(pattern=r"^[+\d ()-]{5,40}$")
    telegram: str = Field(pattern=r"^https://t\.me/[A-Za-z0-9_]{3,64}$")
    seoTitle: str = Field(min_length=1, max_length=150)
    seoDescription: str = Field(min_length=1, max_length=500)
    services: list[Service] = Field(min_length=1, max_length=12)

class Project(StrictModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    number: str = Field(max_length=10)
    name: str = Field(min_length=1, max_length=150)
    category: Literal["Графика", "Брендинг", "Пространство"]
    label: str = Field(max_length=200)
    image: str = Field(max_length=200)
    description: str = Field(max_length=5000)
    role: str = Field(max_length=300)
    tasks: list[str] = Field(max_length=30)
    tools: list[str] = Field(max_length=30)
    published: bool
    gallery: list[str] = Field(max_length=20)
    disclosure: str = Field(max_length=1000)

    @field_validator("image")
    @classmethod
    def valid_image(cls, value):
        import re
        if not re.fullmatch(r"/(?:images/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)|api/media/[a-f0-9-]{36})", value):
            raise ValueError("Загрузите изображение или выберите изображение из проекта.")
        return value

    @field_validator("gallery")
    @classmethod
    def valid_gallery(cls, value):
        return [cls.valid_image(item) for item in value]

    @field_validator("tasks", "tools")
    @classmethod
    def valid_lines(cls, value):
        if any(len(item) > 500 for item in value):
            raise ValueError("Строка слишком длинная.")
        return [item.strip() for item in value if item.strip()]

class SiteContent(StrictModel):
    settings: Settings
    projects: list[Project] = Field(max_length=100)

    @model_validator(mode="after")
    def unique_slugs(self):
        if len({p.slug for p in self.projects}) != len(self.projects):
            raise ValueError("Адреса проектов должны быть уникальными.")
        return self

class ContentInput(StrictModel):
    revision: int = Field(ge=1)
    data: SiteContent

def seed_content():
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    data = json.loads((ROOT / "backend/default-content.json").read_text(encoding="utf-8"))
    insert = sqlite_insert if engine.dialect.name == "sqlite" else pg_insert
    with Session.begin() as session:
        session.execute(insert(Content).values(id=1, revision=1, data=data).on_conflict_do_nothing(index_elements=["id"]))

@router.post("/api/admin/login")
def login(data: Login, request: Request, response: Response):
    if request.headers.get("x-admin-request") != "1":
        raise HTTPException(403, "Обновите страницу.")
    from .main import take_rate_slot
    now = datetime.now(timezone.utc)
    # Committed independently: failed password attempts must still count.
    with Session.begin() as session:
        take_rate_slot(session, f"login:{int(now.timestamp()) // 900}", 30, now + timedelta(minutes=30))
    username, hashed = credentials()
    if not hashed:
        raise HTTPException(503, "Вход ещё не настроен. Запустите scripts/setup-admin.py.")
    valid = verify_password(data.password, hashed)
    if not valid or not hmac.compare_digest(data.username.encode(), username.encode()):
        raise HTTPException(401, "Неверный логин или пароль.")
    token = secrets.token_urlsafe(32)
    with Session.begin() as session:
        session.execute(delete(AdminSession).where(AdminSession.expires_at < now))
        old = session.get(AdminSession, session_digest(request))
        if old:
            session.delete(old)
        session.add(AdminSession(digest=hashlib.sha256(token.encode()).hexdigest(), credential=fingerprint(), expires_at=now + timedelta(hours=8)))
    response.set_cookie(COOKIE, token, max_age=8 * 3600, httponly=True, secure=os.getenv("APP_ENV") == "production", samesite="strict", path="/api/admin")
    response.headers["Cache-Control"] = "no-store"
    return {"username": username}

@private.get("/session")
def session_info():
    return {"username": credentials()[0]}

@private.post("/logout")
def logout(request: Request, response: Response):
    with Session.begin() as session:
        row = session.get(AdminSession, session_digest(request))
        if row:
            session.delete(row)
    response.delete_cookie(COOKIE, path="/api/admin", httponly=True, samesite="strict")
    return {"ok": True}

@router.get("/api/content")
def public_content(response: Response):
    response.headers["Cache-Control"] = "no-store"
    with Session() as session:
        row = session.get(Content, 1)
        data = dict(row.data)
        data["projects"] = [p for p in data["projects"] if p["published"]]
        return {"data": data}

@private.get("/content")
def get_content():
    with Session() as session:
        row = session.get(Content, 1)
        return {"revision": row.revision, "data": row.data}

@private.put("/content")
def save_content(payload: ContentInput):
    data = payload.data.model_dump(mode="json")
    with Session.begin() as session:
        result = session.execute(update(Content).where(Content.id == 1, Content.revision == payload.revision).values(data=data, revision=payload.revision + 1))
        if result.rowcount != 1:
            raise HTTPException(409, "Контент уже изменён в другой вкладке. Обновите страницу перед сохранением.")
    return {"revision": payload.revision + 1, "data": data}

class StatusInput(StrictModel):
    status: Literal["new", "active", "closed"]

@private.patch("/enquiries/{enquiry_id}")
def change_status(enquiry_id: str, payload: StatusInput):
    with Session.begin() as session:
        row = session.get(Enquiry, enquiry_id)
        if not row:
            raise HTTPException(404, "Заявка не найдена.")
        row.status = payload.status
    return {"status": payload.status}

@private.post("/media", status_code=201)
async def upload_media(request: Request):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 8 * 1024 * 1024:
            raise HTTPException(413, "Максимум 8 МБ на изображение.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(body)) as image:
                if image.format not in {"PNG", "JPEG", "WEBP"}:
                    raise ValueError()
                image.load()
                from PIL import ImageOps
                clean = ImageOps.exif_transpose(image).convert("RGBA" if image.mode == "RGBA" else "RGB")
                clean.thumbnail((2400, 2400))
                output = io.BytesIO()
                clean.save(output, format="WEBP", quality=88)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Нужен JPG, PNG или WebP, не более 20 миллионов пикселей.")
    media_id = str(uuid.uuid4())
    with Session.begin() as session:
        session.add(Media(id=media_id, data=output.getvalue()))
    return {"url": f"/api/media/{media_id}"}

@router.get("/api/media/{media_id}")
def image(media_id: str):
    with Session() as session:
        row = session.get(Media, media_id)
        if not row:
            raise HTTPException(404, "Изображение не найдено.")
        return Response(row.data, media_type="image/webp", headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"})

router.include_router(private)
