import uuid


def _register(client, username: str | None = None, email: str | None = None):
    username = username or f"u_{uuid.uuid4().hex[:8]}"
    email = email or f"{username}@example.com"
    r = client.post(
        "/api/v1/users/",
        json={"username": username, "email": email, "password": "pass1234"},
    )
    assert r.status_code == 201
    return username, email, r.json()


def test_register_login_me(client):
    username, _, data = _register(client)
    assert data["username"] == username

    login = client.post(
        "/api/v1/users/login",
        data={"username": username, "password": "pass1234"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["username"] == username


def test_reports_reminders_requires_apartment(client):
    username, _, _ = _register(client)
    login = client.post(
        "/api/v1/users/login",
        data={"username": username, "password": "pass1234"},
    )
    token = login.json()["access_token"]
    r = client.get(
        "/api/v1/reports/reminders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
