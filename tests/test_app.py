import os
import sys
import pytest

# Make sure src folder is importable
ROOT = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_root_redirect():
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 307, 308)
    assert resp.headers.get("location", "").endswith("/static/index.html")


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_success_and_presence():
    activity = "Chess Club"
    email = "test_student@example.com"

    # ensure email is not already present
    before = client.get("/activities").json()
    participants = before[activity]["participants"]
    if email in participants:
        participants.remove(email)

    # sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # verify participant present
    after = client.get("/activities").json()
    assert email in after[activity]["participants"]


def test_signup_duplicate_fails():
    activity = "Chess Club"
    email = "test_student@example.com"

    # posting same email again should return 400
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 400


def test_signup_activity_not_found():
    resp = client.post("/activities/Nonexistent/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404
