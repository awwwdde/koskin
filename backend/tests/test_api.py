import os
import tempfile
import unittest
import io
import json
from unittest.mock import patch
from pathlib import Path

test_root = Path(__file__).resolve().parents[2] / ".data"
test_root.mkdir(exist_ok=True)
test_dir = tempfile.TemporaryDirectory(dir=test_root)
os.environ["DATABASE_URL"] = f"sqlite:///{(Path(test_dir.name) / 'test.sqlite3').as_posix()}"
os.environ["ADMIN_API_TOKEN"] = "test-only-token"
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Session, engine
from backend.models import Enquiry, RateBucket
from backend.models import AdminSession, Content, Media
from backend.auth import hash_password
from PIL import Image
from sqlalchemy import delete, select
os.environ["ADMIN_PASSWORD_HASH"] = hash_password("test-password-12345")
os.environ["ADMIN_USERNAME"] = "roman"
ADMIN_HEADERS = {"X-Admin-Request": "1"}

class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        engine.dispose()
        test_dir.cleanup()

    def setUp(self):
        self.client.cookies.clear()
        with Session.begin() as session:
            session.execute(delete(Enquiry))
            session.execute(delete(RateBucket))
            session.execute(delete(AdminSession))
            session.execute(delete(Media))
            row = session.get(Content, 1)
            row.revision = 1
            row.data = json.loads((Path(__file__).resolve().parents[1] / "default-content.json").read_text(encoding="utf-8"))
        self.payload = {"name": "Test Visitor", "email": "visitor@example.com", "message": "A local test enquiry about a design project.", "direction": "Branding", "consent": True}

    def test_health(self):
        self.assertEqual(self.client.get("/healthz").status_code, 200)

    def test_persists_and_authorized_read(self):
        response = self.client.post("/api/enquiries", json=self.payload)
        self.assertEqual(response.status_code, 201)
        with Session() as session:
            self.assertEqual(session.scalar(select(Enquiry)).email, self.payload["email"])
        rows = self.client.get("/api/admin/enquiries", headers={"Authorization": "Bearer test-only-token"}).json()["items"]
        self.assertEqual(rows[0]["id"], response.json()["id"])

    def test_no_public_enquiry_access(self):
        self.assertEqual(self.client.get("/api/admin/enquiries").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/enquiries", headers={"Authorization": "Bearer wrong"}).status_code, 401)

    def test_consent_required(self):
        self.payload["consent"] = False
        self.assertEqual(self.client.post("/api/enquiries", json=self.payload).status_code, 422)

    def test_invalid_input(self):
        for field, value in [("email", "invalid"), ("message", "short"), ("name", " ")]:
            with self.subTest(field=field):
                self.assertEqual(self.client.post("/api/enquiries", json={**self.payload, field: value}).status_code, 422)

    def test_honeypot_is_not_persisted(self):
        self.assertEqual(self.client.post("/api/enquiries", json={**self.payload, "website": "spam.invalid"}).status_code, 201)
        with Session() as session:
            self.assertIsNone(session.scalar(select(Enquiry)))

    def test_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/api/enquiries", json=self.payload).status_code, 201)
        self.assertEqual(self.client.post("/api/enquiries", json=self.payload).status_code, 429)
        with Session() as session:
            self.assertEqual(len(session.scalars(select(Enquiry)).all()), 5)

    def login(self):
        response = self.client.post("/api/admin/login", headers=ADMIN_HEADERS, json={"username": "roman", "password": "test-password-12345"})
        self.assertEqual(response.status_code, 200)
        return response

    def test_session_protection_and_logout(self):
        self.assertEqual(self.client.get("/api/admin/content").status_code, 401)
        response = self.login()
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertIn("SameSite=strict", response.headers["set-cookie"])
        self.assertEqual(self.client.get("/api/admin/session").status_code, 200)
        self.assertEqual(self.client.post("/api/admin/logout").status_code, 403)
        self.assertEqual(self.client.post("/api/admin/logout", headers=ADMIN_HEADERS).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/session").status_code, 401)

    def test_content_publishing_revision_and_validation(self):
        self.login()
        content = self.client.get("/api/admin/content").json()
        content["data"]["projects"][0]["published"] = False
        content["data"]["settings"]["about"] = "Updated biography"
        response = self.client.put("/api/admin/content", json=content, headers=ADMIN_HEADERS)
        self.assertEqual(response.status_code, 200)
        public = self.client.get("/api/content").json()["data"]
        self.assertEqual(public["settings"]["about"], "Updated biography")
        self.assertNotIn(content["data"]["projects"][0]["slug"], [p["slug"] for p in public["projects"]])
        self.assertEqual(self.client.put("/api/admin/content", json=content, headers=ADMIN_HEADERS).status_code, 409)
        content = response.json()
        content["data"]["settings"]["telegram"] = "javascript:alert(1)"
        self.assertEqual(self.client.put("/api/admin/content", json=content, headers=ADMIN_HEADERS).status_code, 422)

    def test_status_search_and_legacy_token_read_only(self):
        enquiry = self.client.post("/api/enquiries", json=self.payload).json()["id"]
        self.assertEqual(self.client.patch(f"/api/admin/enquiries/{enquiry}", json={"status": "closed"}, headers={**ADMIN_HEADERS, "Authorization": "Bearer test-only-token"}).status_code, 401)
        self.login()
        self.assertEqual(self.client.patch(f"/api/admin/enquiries/{enquiry}", json={"status": "active"}, headers=ADMIN_HEADERS).status_code, 200)
        data = self.client.get("/api/admin/enquiries?q=visitor&status=active").json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["counts"]["active"], 1)
        self.assertEqual(self.client.get("/api/admin/enquiries?status=closed").json()["items"], [])

    def test_media_is_verified_reencoded_and_persistent(self):
        self.assertEqual(self.client.post("/api/admin/media", content=b"bad", headers=ADMIN_HEADERS).status_code, 401)
        self.login()
        self.assertEqual(self.client.post("/api/admin/media", content=b"<svg/>", headers=ADMIN_HEADERS).status_code, 422)
        image = io.BytesIO()
        Image.new("RGB", (20, 20), "#aabbcc").save(image, format="PNG")
        upload = self.client.post("/api/admin/media", content=image.getvalue(), headers=ADMIN_HEADERS)
        self.assertEqual(upload.status_code, 201)
        self.client.cookies.clear()
        public = self.client.get(upload.json()["url"])
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.headers["content-type"], "image/webp")
        self.assertEqual(Image.open(io.BytesIO(public.content)).size, (20, 20))
        self.assertEqual(self.client.post("/api/admin/login", json={"username":"roman","password":"test-password-12345"}).status_code, 403)

    def test_password_change_revokes_sessions_and_login_throttles(self):
        self.login()
        with patch.dict(os.environ, {"ADMIN_PASSWORD_HASH": hash_password("a-new-password-123")}):
            self.assertEqual(self.client.get("/api/admin/session").status_code, 401)
        with Session.begin() as session:
            session.execute(delete(RateBucket))
        with patch("backend.admin.verify_password", return_value=False):
            for _ in range(30):
                self.assertEqual(self.client.post("/api/admin/login", json={"username":"roman","password":"wrong"}, headers=ADMIN_HEADERS).status_code, 401)
            self.assertEqual(self.client.post("/api/admin/login", json={"username":"roman","password":"wrong"}, headers=ADMIN_HEADERS).status_code, 429)

if __name__ == "__main__":
    unittest.main()
