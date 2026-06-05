"""Отправка событий в WebSocket из синхронных обработчиков."""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.ws_manager import ws_manager


def _run(coro) -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)


def notify_event(
    event_type: str,
    message: str,
    *,
    user_ids: list[int] | None = None,
    apartment_id: int | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    _run(
        ws_manager.broadcast_event(
            event_type,
            message,
            user_ids=user_ids,
            apartment_id=apartment_id,
            data=data,
        )
    )
