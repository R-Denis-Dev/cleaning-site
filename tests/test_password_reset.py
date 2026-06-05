import uuid

import pytest

from app.config import get_settings


@pytest.fixture
def dev_reset(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "expose_reset_token", True)
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(settings, "smtp_from", "")
    captured: dict = {}

    def fake_send(to_email: str, code: str, username: str) -> bool:
        captured["email"] = to_email
        captured["code"] = code
        return True

    monkeypatch.setattr(
        "app.routers.users.user_router.send_password_reset_email",
        fake_send,
    )
    return captured


def test_forgot_password_sends_code(client, dev_reset):
    email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
    username = f"user_{uuid.uuid4().hex[:8]}"
    client.post(
        "/api/v1/users/",
        json={"username": username, "email": email, "password": "secret12"},
    )

    r = client.post("/api/v1/users/forgot-password", json={"email": email})
    assert r.status_code == 200
    assert dev_reset.get("code")
    assert len(dev_reset["code"]) == 6
    assert dev_reset["code"].isdigit()

    r2 = client.post(
        "/api/v1/users/reset-password",
        json={"code": dev_reset["code"], "new_password": "newpass99"},
    )
    assert r2.status_code == 204

    login = client.post(
        "/api/v1/users/login",
        data={"username": username, "password": "newpass99"},
    )
    assert login.status_code == 200
    assert login.json().get("access_token")


def test_forgot_unknown_email_same_response(client, dev_reset):
    r = client.post(
        "/api/v1/users/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert r.status_code == 200
    assert "email" in r.json()["message"].lower() or "почту" in r.json()["message"].lower()
    assert "code" not in dev_reset


def test_reset_wrong_code(client, dev_reset):
    email = f"bad_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/users/",
        json={
            "username": f"u_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": "secret12",
        },
    )
    client.post("/api/v1/users/forgot-password", json={"email": email})

    r = client.post(
        "/api/v1/users/reset-password",
        json={"code": "000000", "new_password": "newpass99"},
    )
    assert r.status_code == 400
