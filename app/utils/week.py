from datetime import date, timedelta


def week_start(d: date | None = None) -> date:
    """Понедельник текущей (или указанной) недели."""
    d = d or date.today()
    return d - timedelta(days=d.weekday())
