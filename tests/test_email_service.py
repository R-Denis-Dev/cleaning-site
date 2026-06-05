from app.services import email as email_mod


def test_send_without_smtp_logs_false(monkeypatch):
    monkeypatch.setattr(email_mod.settings, "smtp_host", "")
    monkeypatch.setattr(email_mod.settings, "smtp_from", "")
    assert email_mod.send_password_reset_email("a@b.c", "123456", "tester") is False
