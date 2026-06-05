"""Smoke-тесты основных API для админа, жильца и ответственного."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core import limiter as limiter_mod
from app.database import SessionLocal
from app.main import app
from app.models.housing.models import Apartment, ApartmentMember, Building
from app.models.users.models import User


@pytest.fixture(autouse=True)
def disable_rate_limit(monkeypatch):
    monkeypatch.setattr(limiter_mod, "limiter", None)


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


def _login(client: TestClient, username: str, password: str) -> str:
    r = client.post(
        "/api/v1/users/login",
        data={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _find_resident_with_apartment() -> tuple[str, str, int]:
    db = SessionLocal()
    try:
        row = (
            db.query(User, ApartmentMember, Apartment, Building)
            .join(ApartmentMember, ApartmentMember.user_id == User.id)
            .join(Apartment, Apartment.id == ApartmentMember.apartment_id)
            .join(Building, Building.id == Apartment.building_id)
            .filter(User.is_admin.is_(False), User.is_blocked.is_(False))
            .first()
        )
        if not row:
            pytest.skip("Нет жильца с квартирой в БД — запустите seed_demo_data.py")
        user, member, apt, _b = row
        return user.username, "Resident123", apt.id
    finally:
        db.close()


def _find_manager() -> tuple[str, str]:
    db = SessionLocal()
    try:
        row = (
            db.query(User)
            .join(ApartmentMember, ApartmentMember.user_id == User.id)
            .filter(
                User.is_admin.is_(False),
                ApartmentMember.role == "manager",
            )
            .first()
        )
        if not row:
            pytest.skip("Нет ответственного в БД")
        return row.username, "Resident123"
    finally:
        db.close()


class TestAdminSmoke:
    def test_admin_endpoints(self, client: TestClient):
        token = _login(client, "Admin", "Admin123")
        h = _headers(token)

        assert client.get("/api/v1/admin/residents", headers=h).status_code == 200
        assert client.get("/api/v1/admin/apartments", headers=h).status_code == 200
        assert client.get("/api/v1/admin/inspections", headers=h).status_code == 200
        assert client.get("/api/v1/users/callisto-admins", headers=h).status_code == 200

        residents = client.get("/api/v1/admin/residents", params={"limit": 5}, headers=h).json()
        non_admin = next((u for u in residents if not u.get("is_admin")), None)
        if non_admin:
            uid = non_admin["id"]
            assert client.get(f"/api/v1/admin/users/{uid}/stats", headers=h).status_code == 200

    def test_admin_cannot_join_apartment(self, client: TestClient):
        token = _login(client, "Admin", "Admin123")
        db = SessionLocal()
        try:
            apt = db.query(Apartment).first()
            assert apt
            r = client.post(f"/api/v1/housing/apartments/{apt.id}/join", headers=_headers(token))
            assert r.status_code == 400
        finally:
            db.close()

    def test_admin_bonus_task_create(self, client: TestClient):
        token = _login(client, "Admin", "Admin123")
        h = _headers(token)
        db = SessionLocal()
        try:
            user = (
                db.query(User)
                .join(ApartmentMember, ApartmentMember.user_id == User.id)
                .filter(User.is_admin.is_(False))
                .first()
            )
            if not user:
                pytest.skip("Нет жильца")
            r = client.post(
                f"/api/v1/admin/users/{user.id}/bonus-tasks",
                headers=h,
                json={"title": f"Smoke {uuid.uuid4().hex[:6]}", "description": "test"},
            )
            assert r.status_code == 201, r.text
            assert r.json().get("apartment_task_id") is None
            bonus_id = r.json()["id"]
            assert client.delete(f"/api/v1/admin/bonus-tasks/{bonus_id}", headers=h).status_code == 204
        finally:
            db.close()


class TestResidentSmoke:
    def test_resident_flow(self, client: TestClient):
        username, password, apt_id = _find_resident_with_apartment()
        token = _login(client, username, password)
        h = _headers(token)

        assert client.get("/api/v1/users/me", headers=h).status_code == 200
        me = client.get("/api/v1/users/me", headers=h).json()
        assert me.get("apartment") is not None
        assert me.get("is_admin") is False

        assert client.get("/api/v1/housing/buildings", headers=h).status_code == 200
        assert client.get(f"/api/v1/housing/apartments/{apt_id}", headers=h).status_code == 200
        assert client.get("/api/v1/schedules/", headers=h).status_code == 200
        assert client.get("/api/v1/users/me/bonus-tasks", headers=h).status_code == 200
        assert client.get("/api/v1/reports/cleaning-history", headers=h).status_code == 200
        assert client.get("/api/v1/users/leaderboard", headers=h).status_code == 200

    def test_resident_cannot_access_admin(self, client: TestClient):
        username, password, _ = _find_resident_with_apartment()
        token = _login(client, username, password)
        assert client.get("/api/v1/admin/residents", headers=_headers(token)).status_code == 403


class TestManagerSmoke:
    def test_manager_apartment_settings(self, client: TestClient):
        username, password = _find_manager()
        token = _login(client, username, password)
        h = _headers(token)

        me = client.get("/api/v1/users/me", headers=h).json()
        assert me.get("apartment", {}).get("role") == "manager"

        assert client.get("/api/v1/housing/apartments/me", headers=h).status_code == 200
        assert client.get("/api/v1/tasks/templates/me", headers=h).status_code == 200
        assert (
            client.post(
                "/api/v1/housing/apartments/me/cleaning-mode",
                headers=h,
                json={"mode": "general"},
            ).status_code
            == 200
        )


class TestResidentExtras:
    def test_resident_endpoints(self, client: TestClient):
        username, password, _ = _find_resident_with_apartment()
        token = _login(client, username, password)
        h = _headers(token)
        assert client.get("/api/v1/tasks/day/0", headers=h).status_code == 200
        assert client.get("/api/v1/reports/missed-cleanings", headers=h).status_code == 200
        assert client.get("/api/v1/reports/reminders", headers=h).status_code == 200
        assert client.get("/api/v1/extras/swap-requests", headers=h).status_code == 200
        assert client.get("/api/v1/announcements/unread-count", headers=h).status_code == 200


class TestAdminProtections:
    def test_cannot_block_admin(self, client: TestClient):
        token = _login(client, "Admin", "Admin123")
        h = _headers(token)
        me = client.get("/api/v1/users/me", headers=h).json()
        r = client.post(f"/api/v1/admin/users/{me['id']}/block", headers=h)
        assert r.status_code == 400


class TestNewUserFlow:
    def test_register_join_schedule(self, client: TestClient):
        uname = f"smoke_{uuid.uuid4().hex[:8]}"
        email = f"{uname}@example.com"
        reg = client.post(
            "/api/v1/users/",
            json={"username": uname, "email": email, "password": "pass1234"},
        )
        assert reg.status_code == 201
        token = _login(client, uname, "pass1234")
        h = _headers(token)

        db = SessionLocal()
        try:
            apt = (
                db.query(Apartment)
                .outerjoin(ApartmentMember)
                .filter(ApartmentMember.id.is_(None))
                .first()
            )
            if not apt:
                apt = db.query(Apartment).first()
            assert apt
            apt_id = apt.id
        finally:
            db.close()

        join = client.post(f"/api/v1/housing/apartments/{apt_id}/join", headers=h)
        assert join.status_code == 200, join.text

        sched = client.get("/api/v1/schedules/", headers=h)
        assert sched.status_code == 200
        assert len(sched.json()) == 7
