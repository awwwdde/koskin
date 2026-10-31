"""Password hashing and opaque, server-side sessions. No browser-stored tokens."""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from fastapi import HTTPException, Request
from .database import ROOT, Session
from .models import AdminSession

COOKIE = "rk_admin"

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000).hex()
    return f"pbkdf2_sha256$600000${salt}${digest}"

def credentials():
    name, hashed = os.getenv("ADMIN_USERNAME", "roman"), os.getenv("ADMIN_PASSWORD_HASH", "")
    local = ROOT / ".data" / "admin.json"
    if not hashed and os.getenv("APP_ENV") != "production" and local.exists():
        data = json.loads(local.read_text(encoding="utf-8"))
        name, hashed = data["username"], data["hash"]
    return name, hashed

def verify_password(password: str, hashed: str) -> bool:
    try:
        algorithm, iterations, salt, expected = hashed.split("$")
        if algorithm != "pbkdf2_sha256" or not 100_000 <= int(iterations) <= 2_000_000:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def fingerprint():
    name, hashed = credentials()
    return hashlib.sha256(f"{name}:{hashed}".encode()).hexdigest()

def session_digest(request: Request):
    return hashlib.sha256(request.cookies.get(COOKIE, "").encode()).hexdigest()

def require_admin(request: Request):
    # Non-simple request header + no CORS + SameSite=Strict prevents cross-site mutations.
    if request.method not in {"GET", "HEAD"} and request.headers.get("x-admin-request") != "1":
        raise HTTPException(403, "Обновите страницу и повторите действие.")
    with Session() as session:
        row = session.get(AdminSession, session_digest(request))
        if not row or row.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc) or not hmac.compare_digest(row.credential, fingerprint()):
            raise HTTPException(401, "Войдите в админку.")
