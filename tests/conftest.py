import pytest
from fastapi.testclient import TestClient

from app.core import limiter as limiter_mod
from app.main import app
from app.database import Base, engine


@pytest.fixture(autouse=True)
def disable_rate_limit(monkeypatch):
    """В тестах не применяем slowapi — иначе ломается разбор тела запроса."""
    monkeypatch.setattr(limiter_mod, "limiter", None)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)
