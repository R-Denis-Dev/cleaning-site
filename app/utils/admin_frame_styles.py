ADMIN_FRAME_STYLES = frozenset({"crown", "ornate", "wing", "crystal", "leaf", "arc"})

DEFAULT_ADMIN_FRAME_STYLE = "crown"


def normalize_admin_frame_style(value: str | None) -> str:
    if value and value in ADMIN_FRAME_STYLES:
        return value
    return DEFAULT_ADMIN_FRAME_STYLE
