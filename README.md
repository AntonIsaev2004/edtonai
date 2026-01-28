# EdtonAI — Resume Adapter Service

Веб-сервис адаптации резюме под вакансию с использованием LLM (DeepSeek).

## 🚀 Быстрый старт

### Требования

- **Docker** и **Docker Compose** (рекомендуется для production)
- Или локально: **Python 3.11+**, **Node.js 18+**, **PostgreSQL 16**
- **API ключ DeepSeek** (получить на https://platform.deepseek.com)
- **Supabase** проект (URL и Anon Key, получить на https://supabase.com)

### Запуск с Docker (рекомендуется)

#### 1. Клонируй репозиторий

```bash
git clone <repo-url>
cd edtonai
```

#### 2. Создай файл `.env`

```bash
cp .env.example .env
```

Отредактируй `.env` и укажи:
- `POSTGRES_PASSWORD` — надежный пароль для БД
- `DEEPSEEK_API_KEY` — твой API-ключ DeepSeek
- `VITE_SUPABASE_URL` — твой URL проекта Supabase
- `VITE_SUPABASE_ANON_KEY` — твой Anon ключ Supabase

```env
POSTGRES_PASSWORD=your_secure_password_here
DEEPSEEK_API_KEY=sk-your-api-key-here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Запусти сервисы

```bash
docker-compose up -d --build
```

Это запустит:
- **PostgreSQL** на порту `5432`
- **Backend API** на порту `8000`
- **Frontend** на порту `3000`

#### 4. Проверь статус и открой приложение

```bash
# Проверить логи
docker-compose logs -f

# Остановить
docker-compose down
```

| Сервис | URL |
|--------|-----|
| **Frontend (UI)** | http://localhost:3000 |
| **Backend Swagger** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/v1/health |

### Локальный запуск (для разработки)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend будет доступен на `http://localhost:8000`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

> ⚠️ При локальном запуске frontend нужно обновить API_BASE_URL в конфиге, если backend на другом хосте

### Проверка зависимостей

**Backend:**
- Python: 3.11+
- FastAPI >= 0.109.0
- SQLAlchemy >= 2.0.25
- Pydantic >= 2.5.0
- PostgreSQL >= 16

**Frontend:**
- Node.js: 18+
- React: 18.2.0
- React Query: 5.17.0
- TypeScript: 5.2.2
- Tailwind CSS: 3.4.0

---

## 🖥️ Использование Frontend

### Workspace (Главный экран)

1. **Вставь резюме** в левое поле
2. **Вставь вакансию** в правое поле
3. Нажми **Analyze** для анализа соответствия
4. Выбери предложенные улучшения (чекбоксы)
5. Нажми **Adapt Resume** для адаптации
6. Просмотри результат с подсветкой изменений
7. **Copy** — скопировать результат
8. **Save Version** — сохранить в историю

### History (История версий)

- Просмотр сохранённых версий
- **View** — детали версии
- **Compare** — сравнить с другой версией
- **Restore** — восстановить в Workspace
- **Delete** — удалить версию

### Compare (Сравнение)

- Выбор двух версий для сравнения
- Переключение гранулярности (слова/строки)
- Фильтр "показать только изменения"

---

## 🧪 Тестирование API через Swagger

### Эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/v1/resumes/parse` | Парсинг резюме |
| POST | `/v1/vacancies/parse` | Парсинг вакансии |
| POST | `/v1/match/analyze` | Анализ соответствия |
| POST | `/v1/resumes/adapt` | Адаптация резюме |
| POST | `/v1/resumes/ideal` | Генерация идеального резюме |
| GET | `/v1/versions` | Список версий |
| POST | `/v1/versions` | Создать версию |
| GET | `/v1/versions/{id}` | Получить версию |
| DELETE | `/v1/versions/{id}` | Удалить версию |
| GET | `/v1/health` | Проверка состояния |
| GET | `/v1/limits` | Лимиты на размер текста |

### Пример запроса: Парсинг резюме

```bash
curl -X POST http://localhost:8000/v1/resumes/parse \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Иван Иванов\nPython Developer\n\nОпыт работы:\n- ООО Рога и Копыта (2020-2024): Backend разработчик\n  Python, FastAPI, PostgreSQL\n\nНавыки: Python, FastAPI, Django, PostgreSQL, Docker, Git"
  }'
```

### Пример запроса: Полный анализ

```bash
curl -X POST http://localhost:8000/v1/match/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Иван Иванов\nPython Developer\n\nОпыт: 3 года\nНавыки: Python, FastAPI, PostgreSQL, Docker",
    "vacancy_text": "Senior Python Developer\n\nТребования:\n- Python 5+ лет\n- FastAPI или Django\n- PostgreSQL\n- Kubernetes (желательно)"
  }'
```

### Проверка кеширования

Повтори тот же запрос — в ответе будет `"cache_hit": true`, и LLM не будет вызван повторно.

---

## 🏗️ Локальная разработка (без Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Запусти PostgreSQL
docker run -d --name edtonai-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=edtonai \
  -p 5432:5432 \
  postgres:16-alpine

# Создай .env в корне проекта
cp .env.example .env

# Запусти сервер
cd /path/to/edtonai
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на http://localhost:3000, API-запросы проксируются на http://localhost:8000.

---

## 📁 Структура проекта

```
edtonai/
├── .env.example          # Шаблон переменных окружения
├── docker-compose.yml    # Docker Compose конфигурация
├── checklist.md          # Полный чеклист проекта
│
├── frontend/             # React + TypeScript фронтенд
│   ├── Dockerfile
│   ├── nginx.conf        # Nginx конфиг с прокси на backend
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── api/          # API клиент и типы
│       ├── components/   # UI компоненты
│       ├── pages/        # Страницы (Workspace, History, Compare)
│       └── utils/        # Утилиты (diff, storage)
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py           # Точка входа FastAPI
    ├── prompts.py        # Промпты для LLM
    │
    ├── core/             # Конфигурация и логирование
    ├── db/               # База данных
    ├── models/           # ORM модели
    ├── schemas/          # Pydantic схемы
    ├── repositories/     # Работа с БД
    ├── services/         # Бизнес-логика
    ├── ai/               # AI провайдеры
    └── api/              # HTTP роуты
```

---

## ⚙️ Переменные окружения

### Database Configuration

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `POSTGRES_USER` | Пользователь БД | `anton` |
| `POSTGRES_PASSWORD` | Пароль БД | (обязательно) |
| `POSTGRES_HOST` | Хост БД | `localhost` или `db` (в Docker) |
| `POSTGRES_PORT` | Порт БД | `5432` |
| `POSTGRES_DB` | Имя БД | `edtonai` |

### AI Provider Configuration

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `AI_PROVIDER` | Провайдер AI | `deepseek-chat` |
| `DEEPSEEK_API_KEY` | API ключ DeepSeek | (обязательно) |
| `DEEPSEEK_BASE_URL` | Base URL API | `https://api.deepseek.com/v1` |
| `AI_MODEL` | Модель | `deepseek-chat` |
| `AI_TEMPERATURE` | Температура генерации (0.0-1.0) | `0.3` |
| `AI_MAX_TOKENS` | Максимум токенов в ответе | `8192` |
| `AI_TIMEOUT_SECONDS` | Таймаут запроса к LLM | `120` |
| `AI_MAX_RETRIES` | Количество повторов при ошибке | `3` |

### Logging

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `LOG_LEVEL` | Уровень логирования (DEBUG, INFO, WARNING, ERROR) | `INFO` |

**Получить API ключ DeepSeek:** https://platform.deepseek.com/api_keys

---

## 🔄 Логика кеширования

1. **Текст нормализуется** (trim, collapse spaces/newlines)
2. **Вычисляется SHA256 хэш** нормализованного текста
3. **Проверяется кеш** в таблице `ai_result` по `(operation, input_hash)`
4. **Если кеш есть** — возвращается сохранённый результат
5. **Если кеша нет** — вызывается LLM, результат сохраняется

---

## 🛑 Остановка сервисов

```bash
docker-compose down

# С удалением данных
docker-compose down -v
```

---

## 📋 Реализованные этапы

### Stage 1 ✅ — Backend (Парсинг + AI + Кеширование)
- FastAPI backend с async PostgreSQL
- DeepSeek AI интеграция
- Парсинг резюме и вакансий
- Анализ соответствия (match)
- Кеширование результатов LLM по хэшу

### Stage 2 ✅ — Адаптация резюме
- Адаптация резюме под вакансию (`/v1/resumes/adapt`)
- Генерация идеального резюме (`/v1/resumes/ideal`)
- Чекбоксы улучшений из анализа
- Change log с детализацией изменений

### Stage 3 ✅ — Frontend
- React + TypeScript + Vite
- TanStack Query для API
- Tailwind CSS
- Workspace с 3 режимами (input → analysis → result)
- История версий с CRUD
- Сравнение версий с DiffViewer
- Docker + nginx с проксированием API
