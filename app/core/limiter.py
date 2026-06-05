import functools

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None


def rate_limit(rule: str):
    """Декоратор rate limit; без slowapi — no-op."""

    def decorator(func):
        if limiter is None:
            return func
        limited = limiter.limit(rule)(func)
        return functools.wraps(func)(limited)

    return decorator
