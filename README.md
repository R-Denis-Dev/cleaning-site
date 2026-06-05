# Каллисто (Cleaning App)

**Веб-платформа для управления уборкой и бытом в общежитии кампуса.**

| | |
|---|---|
| **Backend** | FastAPI 2.0, SQLAlchemy, SQLite / PostgreSQL |
| **Frontend** | React 18, TypeScript, Vite 7, Tailwind CSS |
| **Языки документации** | [Русский](#русский) · [English](#english) |

Подробный текст для презентации: [`PRESENTATION.md`](PRESENTATION.md)

---

## Русский

### О проекте

**Каллисто** — цифровая система для резидентов общежития и администрации кампуса. Заменяет таблицы в чатах и бумажные графики единым сервисом: расписание дежурств, чек-листы уборки, рейтинги, проверки, объявления и админ-панель.

**Охват:** корпуса **C1, C2, R1–R6**, квартиры до **8 жильцов**.

### Роли

| Роль | Описание |
|------|----------|
| **Жилец** | Расписание, чек-лист, обмен днями, рейтинг, профиль, уведомления |
| **Ответственный (manager)** | Всё жильца + настройка задач, шаблоны, исключение соседей |
| **Администратор** | Жители, квартиры, проверки, нарушения, мероприятия, доп. задания, CSV-отчёты |

Администраторы **не заселяются** в квартиры — только управление кампусом (`/admin`).

### Основной функционал

#### Жильцы (`/dashboard`)

- **Уборка:** недельное расписание (занять / освободить день), чек-лист (лёгкая / генеральная уборка), прогресс %, лимит уборок в неделю, фото, комментарии к задачам
- **Обмен днями** между соседями (запрос / принять / отклонить)
- **Напоминания** и **история уборок** по квартире
- **Квартира:** заселение, переселение, поиск, описание, аватар, просмотр проверок
- **Рейтинг** жильцов и квартир (фильтр по корпусу)
- **Уведомления:** мероприятия, доп. задания от админа (WebSocket)
- **Профиль:** ФИО, аватар, рамки за достижения, смена пароля

#### Ответственный за квартиру

- Настройка типа уборки и **своих шаблонов** задач
- Исключение жильца из квартиры
- Рамка аватара квартиры

#### Администратор (`/admin`)

- **Жители:** поиск, разделение на админов / жителей / заблокированных, управление рейтингом, доп. задания, блокировка
- **Квартиры:** обзор по корпусам, назначение ответственного, исключение, проверки и нарушения
- **Мероприятия:** публикация с картинкой и push-уведомлением
- **CSV** — выгрузка истории уборок
- **Профиль:** цвет обводки аватара администратора

### Стек технологий

| Слой | Технологии |
|------|------------|
| API | FastAPI, Pydantic v2, Argon2, JWT |
| БД | SQLAlchemy 2, SQLite (dev), PostgreSQL (prod) |
| Real-time | WebSocket (`/api/v1/ws`) |
| Frontend | React 18, React Router, Axios, react-hot-toast |
| Стили | Tailwind CSS 3 |
| Тесты | pytest, GitHub Actions CI |
| Опционально | Sentry, SlowAPI (rate limit), Telegram-бот |

### Структура репозитория

```
├── app/                    # Backend (FastAPI)
│   ├── main.py             # Точка входа, CORS, роутеры
│   ├── config.py           # Настройки из .env
│   ├── database.py         # БД и миграции
│   ├── routers/            # API: users, housing, tasks, schedule, admin…
│   ├── models/             # SQLAlchemy-модели и Pydantic-схемы
│   ├── services/           # Бизнес-логика
│   └── telegram_bot/       # Опциональный Telegram-бот
├── frontend/               # React SPA (Vite)
│   └── src/
├── tests/                  # pytest
├── scripts/                # Утилиты (сброс БД, демо-данные, админы)
├── .env.example            # Пример переменных backend
├── PRESENTATION.md         # Материал для презентации
└── requirements.txt
```

### Требования

- **Python** 3.12+
- **Node.js** 20+
- **npm** 10+

### Быстрый старт

#### 1. Клонирование и окружение

```bash
git clone <url-репозитория>
cd "Cleaning App ( Приложения для отметки уборки )"

# Backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Frontend
cd frontend
npm ci
cd ..
```

#### 2. Переменные окружения

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Минимум в `.env`:

```env
SECRET_KEY=your-secret-key
ADMIN_USERNAMES=Admin,Admin1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### 3. База данных и администратор

**Вариант A — чистая БД с админами:**

```bash
python scripts/reset_database.py
```

Создаются:

| Логин | Пароль | Email |
|-------|--------|-------|
| `Admin` | `Admin123` | admin@kallisto.example.com |
| `Admin1` | `Admin1234` | admin1@kallisto.example.com |

**Вариант B — демо-жильцы (после reset или на существующей БД):**

```bash
python scripts/seed_demo_data.py          # добавить жильцов
python scripts/seed_demo_data.py --fresh  # удалить не-админов и заполнить заново
```

Пароль всех демо-жильцов: **`Resident123`**

**Добавить администратора:**

```bash
python scripts/add_admin.py --username MyAdmin --password MyPass123
```

Логин нужно добавить в `ADMIN_USERNAMES` в `.env` и **перезапустить** backend.

#### 4. Запуск

**Терминал 1 — Backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 2 — Frontend:**

```bash
cd frontend
npm run dev
```

| Сервис | URL |
|--------|-----|
| Приложение | http://localhost:5173 |
| API | http://localhost:8000/api/v1 |
| Swagger (документация API) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/v1/health |

Вход администратора → редирект на `/admin`.  
Вход жильца → `/dashboard`.

### Переменные окружения (backend)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `SECRET_KEY` | Ключ JWT | dev-secret (сменить в prod!) |
| `DATABASE_URL` | SQLite или PostgreSQL | `sqlite:///./app/database.db` |
| `ADMIN_USERNAMES` | Логины админов через запятую | — |
| `CORS_ORIGINS` | Разрешённые origin для CORS | localhost:5173 |
| `MAX_CLEANINGS_PER_WEEK` | Лимит засчитанных уборок | `2` |
| `UPLOADS_DIR` | Папка загрузок (аватары, фото) | `uploads` |
| `SMTP_*` | Почта для сброса пароля | — |
| `EXPOSE_RESET_TOKEN` | Показывать код сброса в UI (dev) | `true` |
| `SENTRY_DSN` | Мониторинг ошибок | — |
| `TELEGRAM_BOT_TOKEN` | Telegram-бот | — |
| `PUBLIC_APP_URL` | URL фронтенда для бота | — |

### API (кратко)

Префикс: `/api/v1`

| Группа | Примеры |
|--------|---------|
| `users` | регистрация, login, профиль, рейтинг, бонусы |
| `housing` | корпуса, квартиры, жильцы, поиск |
| `schedules` | расписание недели, занять/освободить |
| `tasks` | чек-лист по дню, шаблоны |
| `reports` | история, пропуски, напоминания, CSV (admin) |
| `announcements` | мероприятия |
| `extras` | обмен днями, комментарии, фото уборки |
| `admin` | жители, квартиры, проверки, блокировки |

### Тесты

```bash
pytest -q
```

CI (GitHub Actions): `pytest` + `npm ci` + `npm run build` в `frontend/`.

### Сборка production (frontend)

```bash
cd frontend
npm run build
# Артефакты: frontend/dist/
```

### Telegram-бот (опционально)

```bash
# В .env: TELEGRAM_BOT_TOKEN=...  PUBLIC_APP_URL=http://localhost:5173
python -m app.telegram_bot.bot
```

Подробнее: [`app/telegram_bot/README.md`](app/telegram_bot/README.md)

### Скрипты

| Скрипт | Назначение |
|--------|------------|
| `scripts/reset_database.py` | Полный сброс БД + 2 админа |
| `scripts/seed_demo_data.py` | Демо-жильцы в корпусах C1–R5 |
| `scripts/add_admin.py` | Создать / обновить администратора |
| `scripts/fix_admin_email.py` | Исправить некорректные email админов |

### Лицензия

Проект разрабатывается как учебный / внутренний продукт кампуса. Уточните лицензию у владельца репозитория.

---

## English

### About

**Kallisto (Cleaning App)** is a web platform for dormitory residents and campus administration. It replaces chat spreadsheets and paper schedules with a single service: duty rosters, cleaning checklists, ratings, inspections, announcements, and an admin panel.

**Scope:** buildings **C1, C2, R1–R6**, apartments with up to **8 residents** each.

### Roles

| Role | Description |
|------|-------------|
| **Resident** | Schedule, checklist, day swaps, leaderboard, profile, notifications |
| **Manager** | All resident features + task templates, apartment settings, member removal |
| **Administrator** | Residents, apartments, inspections, violations, events, bonus tasks, CSV export |

Administrators **do not join** apartments — campus management only (`/admin`).

### Key features

#### Residents (`/dashboard`)

- **Cleaning:** weekly schedule (take/release slots), checklist (light/general cleaning), progress %, weekly cleaning limit, photos, task comments
- **Day swap** requests between roommates
- **Reminders** and **cleaning history** per apartment
- **Apartment:** join, move, search, description, avatar, view inspections
- **Leaderboard** for residents and apartments (filter by building)
- **Notifications:** campus events, admin bonus tasks (WebSocket)
- **Profile:** display name, avatar, achievement frames, password change

#### Apartment manager

- Cleaning mode and **custom task templates**
- Remove a roommate from the apartment
- Apartment avatar frame

#### Administrator (`/admin`)

- **Residents:** search, admins/residents/blocked lists, rating edits, bonus tasks, block/unblock
- **Apartments:** overview by building, assign manager, kick member, inspections & violations
- **Events:** publish with image and real-time notification
- **CSV** cleaning history export
- **Profile:** admin avatar ring color

### Tech stack

| Layer | Technologies |
|-------|--------------|
| API | FastAPI, Pydantic v2, Argon2, JWT |
| DB | SQLAlchemy 2, SQLite (dev), PostgreSQL (prod) |
| Real-time | WebSocket (`/api/v1/ws`) |
| Frontend | React 18, React Router, Axios, react-hot-toast |
| Styling | Tailwind CSS 3 |
| Tests | pytest, GitHub Actions CI |
| Optional | Sentry, SlowAPI (rate limit), Telegram bot |

### Repository structure

```
├── app/                    # Backend (FastAPI)
│   ├── main.py             # Entry point, CORS, routers
│   ├── config.py           # Settings from .env
│   ├── database.py         # DB and migrations
│   ├── routers/            # API: users, housing, tasks, schedule, admin…
│   ├── models/             # SQLAlchemy models & Pydantic schemas
│   ├── services/           # Business logic
│   └── telegram_bot/       # Optional Telegram bot
├── frontend/               # React SPA (Vite)
├── tests/                  # pytest
├── scripts/                # DB reset, demo data, admins
├── .env.example
├── PRESENTATION.md         # Presentation material
└── requirements.txt
```

### Requirements

- **Python** 3.12+
- **Node.js** 20+
- **npm** 10+

### Quick start

#### 1. Clone and setup

```bash
git clone <repository-url>
cd cleaning-app

python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt

cd frontend
npm ci
cd ..
```

#### 2. Environment

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Minimum `.env`:

```env
SECRET_KEY=your-secret-key
ADMIN_USERNAMES=Admin,Admin1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### 3. Database and admins

**Option A — fresh DB with default admins:**

```bash
python scripts/reset_database.py
```

| Username | Password | Email |
|----------|----------|-------|
| `Admin` | `Admin123` | admin@kallisto.example.com |
| `Admin1` | `Admin1234` | admin1@kallisto.example.com |

**Option B — demo residents:**

```bash
python scripts/seed_demo_data.py          # append demo users
python scripts/seed_demo_data.py --fresh  # wipe non-admins and re-seed
```

Demo resident password: **`Resident123`**

**Add an administrator:**

```bash
python scripts/add_admin.py --username MyAdmin --password MyPass123
```

Add the username to `ADMIN_USERNAMES` in `.env` and **restart** the backend.

#### 4. Run

**Terminal 1 — Backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| API | http://localhost:8000/api/v1 |
| Swagger | http://localhost:8000/docs |
| Health | http://localhost:8000/api/v1/health |

Admin login → redirect to `/admin`.  
Resident login → `/dashboard`.

### Environment variables (backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret | change in production |
| `DATABASE_URL` | SQLite or PostgreSQL | `sqlite:///./app/database.db` |
| `ADMIN_USERNAMES` | Comma-separated admin logins | — |
| `CORS_ORIGINS` | Allowed CORS origins | localhost:5173 |
| `MAX_CLEANINGS_PER_WEEK` | Weekly cleaning credit limit | `2` |
| `UPLOADS_DIR` | Uploads folder | `uploads` |
| `SMTP_*` | Email for password reset | — |
| `EXPOSE_RESET_TOKEN` | Show reset code in UI (dev) | `true` |
| `SENTRY_DSN` | Error monitoring | — |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | — |
| `PUBLIC_APP_URL` | Frontend URL for bot | — |

### API overview

Prefix: `/api/v1`

| Group | Examples |
|-------|----------|
| `users` | register, login, profile, leaderboard, bonus tasks |
| `housing` | buildings, apartments, members, search |
| `schedules` | weekly roster, take/release |
| `tasks` | daily checklist, templates |
| `reports` | history, missed cleanings, reminders, CSV (admin) |
| `announcements` | campus events |
| `extras` | day swaps, comments, cleaning photos |
| `admin` | residents, apartments, inspections, blocks |

### Tests

```bash
pytest -q
```

CI: `pytest` + `npm ci` + `npm run build` in `frontend/`.

### Production build (frontend)

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Telegram bot (optional)

```bash
# .env: TELEGRAM_BOT_TOKEN=...  PUBLIC_APP_URL=http://localhost:5173
python -m app.telegram_bot.bot
```

See [`app/telegram_bot/README.md`](app/telegram_bot/README.md).

### Utility scripts

| Script | Purpose |
|--------|---------|
| `scripts/reset_database.py` | Full DB reset + 2 default admins |
| `scripts/seed_demo_data.py` | Demo residents in buildings C1–R5 |
| `scripts/add_admin.py` | Create / update administrator |
| `scripts/fix_admin_email.py` | Fix invalid admin emails |

### License

Developed as a campus / educational project. Check with the repository owner for licensing terms.
