ADMIN_FRAME_COLORS = frozenset(
    {"white", "blue", "sky", "green", "red", "orange", "purple", "teal", "gold", "rose"}
)
ADMIN_FRAME_OFF = "off"
DEFAULT_ADMIN_FRAME_COLOR = "white"


def normalize_admin_frame_color(value: str | None) -> str | None:
    """off / пусто — обводка выключена; иначе сохранённый цвет."""
    if not value or value == ADMIN_FRAME_OFF:
        return ADMIN_FRAME_OFF
    if value in ADMIN_FRAME_COLORS:
        return value
    return DEFAULT_ADMIN_FRAME_COLOR


def admin_ring_enabled(value: str | None) -> bool:
    return bool(value and value != ADMIN_FRAME_OFF)
