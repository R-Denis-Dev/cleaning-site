"""Минимальный каркас Telegram-бота. Требует TELEGRAM_BOT_TOKEN."""

import os

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEB_APP_URL = os.getenv("PUBLIC_APP_URL", "https://cleaning-frontend.onrender.com")


def main() -> None:
    if not TOKEN:
        print("Задайте TELEGRAM_BOT_TOKEN")
        return
    try:
        from telegram import Update, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
        from telegram.ext import Application, CommandHandler, ContextTypes
    except ImportError:
        print("Установите: pip install python-telegram-bot")
        return

    async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        kb = ReplyKeyboardMarkup(
            [[KeyboardButton("Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))]],
            resize_keyboard=True,
        )
        await update.message.reply_text(
            "Напоминания об уборке — в веб-приложении.",
            reply_markup=kb,
        )

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("Бот запущен")
    app.run_polling()


if __name__ == "__main__":
    main()
