from datetime import datetime

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import get_settings
from app.core.ws_manager import ws_manager
from app.database import Base, engine, run_migrations
from app.models.inspections import models as inspection_models  # noqa: F401
from app.models.cleaning import models as cleaning_models  # noqa: F401
from app.models.extras import models as extras_models  # noqa: F401
from app.models.announcements import campus_models as announcement_models  # noqa: F401
from app.models.admin import models as admin_models  # noqa: F401
from app.routers.admin.admin_router import router as admin_router
from app.routers.announcements.announcements_router import router as announcements_router
from app.routers.extras.extras_router import router as extras_router
from app.routers.housing.housing_router import router as housing_router
from app.routers.reports.reports_router import router as reports_router
from app.routers.schedule.schedule_router import router as schedule_router
from app.routers.tasks.task_router import router as task_router
from app.routers.users.user_router import router as users_router

settings = get_settings()

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title="Cleaning API",
    description="Сервис расписания уборки в общежитии",
    version="2.0.0",
)

# Optional Sentry
if _dsn := __import__("os").getenv("SENTRY_DSN"):
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(dsn=_dsn, integrations=[FastApiIntegration()])
    except ImportError:
        pass

# Rate limiting (login/register)
from app.core.limiter import limiter

if limiter is not None:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

app.include_router(users_router, prefix="/api/v1", tags=["users"])
app.include_router(schedule_router, prefix="/api/v1", tags=["schedules"])
app.include_router(task_router, prefix="/api/v1", tags=["tasks"])
app.include_router(housing_router, prefix="/api/v1", tags=["housing"])
app.include_router(admin_router, prefix="/api/v1", tags=["admin"])
app.include_router(announcements_router, prefix="/api/v1", tags=["announcements"])
app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
app.include_router(extras_router, prefix="/api/v1", tags=["extras"])


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "cleaning-api",
        "version": "2.0.0",
        "database": "postgresql" if not settings.database_url.startswith("sqlite") else "sqlite",
    }


@app.websocket("/api/v1/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int | None = Query(None),
    apartment_id: int | None = Query(None),
):
    await ws_manager.connect(websocket, user_id=user_id, apartment_id=apartment_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id, apartment_id=apartment_id)
