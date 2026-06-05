"""WebSocket: подписки по user_id и apartment_id."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import WebSocket


class WsManager:
    def __init__(self) -> None:
        self._by_user: dict[int, list[WebSocket]] = {}
        self._by_apartment: dict[int, list[WebSocket]] = {}
        self._global: list[WebSocket] = []

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int | None = None,
        apartment_id: int | None = None,
    ) -> None:
        await websocket.accept()
        self._global.append(websocket)
        if user_id is not None:
            self._by_user.setdefault(user_id, []).append(websocket)
        if apartment_id is not None:
            self._by_apartment.setdefault(apartment_id, []).append(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
        user_id: int | None = None,
        apartment_id: int | None = None,
    ) -> None:
        if websocket in self._global:
            self._global.remove(websocket)
        if user_id is not None:
            conns = self._by_user.get(user_id, [])
            if websocket in conns:
                conns.remove(websocket)
        if apartment_id is not None:
            conns = self._by_apartment.get(apartment_id, [])
            if websocket in conns:
                conns.remove(websocket)

    async def _send(self, websocket: WebSocket, payload: dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(payload, ensure_ascii=False))
        except Exception:
            pass

    async def broadcast_event(
        self,
        event_type: str,
        message: str,
        *,
        user_ids: list[int] | None = None,
        apartment_id: int | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "type": event_type,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data or {},
        }
        targets: list[WebSocket] = []
        if user_ids:
            for uid in user_ids:
                targets.extend(self._by_user.get(uid, []))
        if apartment_id is not None:
            targets.extend(self._by_apartment.get(apartment_id, []))
        if not user_ids and apartment_id is None:
            targets = list(self._global)

        seen: set[int] = set()
        for ws in targets:
            wid = id(ws)
            if wid in seen:
                continue
            seen.add(wid)
            await self._send(ws, payload)


ws_manager = WsManager()
