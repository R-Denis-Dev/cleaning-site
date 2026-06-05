"""Отправка писем через SMTP (стандартная библиотека)."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_password_reset_email(to_email: str, code: str, username: str) -> bool:
    subject = "Код для сброса пароля — Cleaning App"
    text = (
        f"Здравствуйте, {username}!\n\n"
        f"Вы запросили сброс пароля в Cleaning App.\n"
        f"Код подтверждения: {code}\n\n"
        f"Код действует {settings.reset_code_expire_minutes} мин.\n"
        "Если вы не запрашивали сброс — проигнорируйте это письмо.\n"
    )
    html = f"""
    <p>Здравствуйте, <strong>{username}</strong>!</p>
    <p>Вы запросили сброс пароля в <strong>Cleaning App</strong>.</p>
    <p style="font-size:24px;letter-spacing:4px;font-weight:bold;">{code}</p>
    <p>Код действует <strong>{settings.reset_code_expire_minutes} мин.</strong></p>
    <p style="color:#666;font-size:12px;">Если вы не запрашивали сброс — проигнорируйте письмо.</p>
    """

    if not settings.smtp_configured:
        logger.warning(
            "SMTP не настроен (SMTP_HOST/SMTP_FROM). Код сброса для %s: %s",
            to_email,
            code,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(settings.smtp_from, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(settings.smtp_from, [to_email], msg.as_string())
        return True
    except Exception:
        logger.exception("Не удалось отправить письмо на %s", to_email)
        return False
