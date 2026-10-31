"""Run once locally. Use --hash to prepare a password hash for deployment."""
import argparse
import getpass
import json
import secrets
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.auth import hash_password
from backend.database import ROOT

parser = argparse.ArgumentParser()
parser.add_argument("--hash", action="store_true")
args = parser.parse_args()
if args.hash:
    password = getpass.getpass("Admin password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Use at least 12 characters.")
    print(hash_password(password))
else:
    target = ROOT / ".data" / "admin.json"
    target.parent.mkdir(exist_ok=True)
    if target.exists():
        raise SystemExit("Local admin already configured. No credentials were changed.")
    password = secrets.token_urlsafe(18)
    target.write_text(json.dumps({"username": "roman", "hash": hash_password(password)}), encoding="utf-8")
    (target.parent / "ADMIN-ACCESS.md").write_text(f"# Локальная админка\n\nАдрес: http://127.0.0.1:8080/admin\n\nЛогин: roman\n\nПароль: `{password}`\n\nТолько для локальной разработки. Для деплоя задайте ADMIN_USERNAME и ADMIN_PASSWORD_HASH через панель окружения.\n", encoding="utf-8")
    print("Local admin configured. Credentials: .data/ADMIN-ACCESS.md")
