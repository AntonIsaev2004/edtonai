# Backend Documentation

Техническая документация backend-сервиса адаптации резюме под вакансию.

## Содержание

| Раздел | Описание |
|--------|----------|
| [API Specification](api/) | Спецификации REST API endpoints |
| [Architecture](architecture/) | Архитектура приложения, слои, зависимости |
| [Database](database/) | Модель данных, ERD, миграции |
| [Services](services/) | Бизнес-логика, сервисный слой |
| [AI Integration](ai/) | Интеграция с LLM, промпты, валидация JSON |
| [Configuration](configuration/) | Переменные окружения, settings |

## Стек технологий

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0 (async)
- **Database:** PostgreSQL 16
- **AI Provider:** DeepSeek API (deepseek-chat)
- **HTTP Client:** httpx (async, streaming)
- **Validation:** Pydantic v2

## Быстрый старт для разработчика

```bash
# Клонирование и настройка
cd edtonai
cp .env.example .env
# Отредактировать .env (DEEPSEEK_API_KEY, POSTGRES_*)

# Запуск через Docker
docker-compose up -d --build

# Swagger UI
open http://localhost:8000/docs

# Health check
curl http://localhost:8000/v1/health
```

## Структура проекта

```
backend/
├── main.py              # FastAPI app entry point, middleware
├── prompts.py           # LLM prompt templates (SYSTEM, PARSE, ANALYZE, ADAPT, IDEAL)
├── requirements.txt
├── Dockerfile
│
├── api/                 # HTTP layer (Controllers)
│   └── v1/
│       ├── resumes.py   # POST /parse, GET /:id, PATCH /:id
│       ├── vacancies.py # POST /parse, GET /:id, PATCH /:id
│       ├── match.py     # POST /analyze
│       ├── adapt.py     # POST /adapt
│       ├── ideal.py     # POST /ideal
│       ├── versions.py  # CRUD /versions
│       └── health.py    # GET /health, /limits
│
├── services/            # Business logic layer
│   ├── resume.py        # ResumeService - parse & cache
│   ├── vacancy.py       # VacancyService - parse & cache
│   ├── match.py         # MatchService - analyze match
│   ├── orchestrator.py  # OrchestratorService - coordinate
│   ├── adapt.py         # AdaptResumeService - improve resume
│   ├── ideal.py         # IdealResumeService - generate ideal
│   └── utils.py         # Hashing, text normalization
│
├── repositories/        # Data access layer (DAL)
│   ├── resume.py        # ResumeRepository
│   ├── vacancy.py       # VacancyRepository
│   ├── ai_result.py     # AIResultRepository (cache)
│   ├── analysis.py      # AnalysisLinkRepository
│   ├── resume_version.py
│   └── ideal_resume.py
│
├── models/              # SQLAlchemy ORM models
│   ├── resume.py        # ResumeRaw
│   ├── vacancy.py       # VacancyRaw
│   ├── ai_result.py     # AIResult (universal cache)
│   ├── analysis_link.py # AnalysisLink
│   ├── resume_version.py
│   └── ideal_resume.py
│
├── schemas/             # Pydantic DTOs
│   ├── resume.py        # ResumeParseRequest/Response
│   ├── vacancy.py       # VacancyParseRequest/Response
│   ├── match.py         # MatchAnalyzeRequest/Response
│   ├── adapt.py         # AdaptResumeRequest/Response
│   └── ideal.py         # IdealResumeRequest/Response
│
├── ai/                  # AI provider abstraction
│   ├── base.py          # AIProvider interface
│   ├── deepseek.py      # DeepSeekProvider (streaming)
│   └── errors.py        # AIRequestError, AIResponseFormatError
│
├── core/                # Configuration & utilities
│   ├── config.py        # Settings (from .env)
│   └── logging.py       # Structured logging setup
│
└── db/                  # Database setup
    ├── base.py          # SQLAlchemy Base
    └── session.py       # AsyncSession factory
```

## Принципы разработки

1. **Разделение ответственности** — каждый слой отвечает за свою задачу (API → Service → Repository → Model)
2. **Кеширование LLM** — повторные запросы не вызывают AI (по content_hash)
3. **Идемпотентность** — одинаковые входные данные = одинаковый результат
4. **Асинхронность** — все I/O операции асинхронные (async/await)
5. **Типизация** — полная типизация через Pydantic v2 и type hints
6. **Anti-hallucination** — промпты строго запрещают AI выдумывать факты

## API Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/health` | Health check |
| `GET` | `/v1/limits` | Get text limits |
| `POST` | `/v1/resumes/parse` | Parse resume text |
| `GET` | `/v1/resumes/{id}` | Get resume by ID |
| `PATCH` | `/v1/resumes/{id}` | Update parsed data |
| `POST` | `/v1/vacancies/parse` | Parse vacancy text |
| `GET` | `/v1/vacancies/{id}` | Get vacancy by ID |
| `PATCH` | `/v1/vacancies/{id}` | Update parsed data |
| `POST` | `/v1/match/analyze` | Analyze resume-vacancy match |
| `POST` | `/v1/resumes/adapt` | Adapt resume with improvements |
| `POST` | `/v1/resumes/ideal` | Generate ideal resume for vacancy |
| `GET` | `/v1/versions` | List saved versions |
| `POST` | `/v1/versions` | Create version |
| `GET` | `/v1/versions/{id}` | Get version |
| `DELETE` | `/v1/versions/{id}` | Delete version |

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                          Frontend                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API Layer (FastAPI)                          │
│    ┌─────────┐  ┌──────────┐  ┌───────┐  ┌───────┐  ┌───────┐   │
│    │ resumes │  │vacancies │  │ match │  │ adapt │  │ ideal │   │
│    └────┬────┘  └────┬─────┘  └───┬───┘  └───┬───┘  └───┬───┘   │
└─────────┼────────────┼────────────┼──────────┼──────────┼────────┘
          │            │            │          │          │
          ▼            ▼            ▼          ▼          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Service Layer                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐   │
│  │ResumeService │ │VacancyService│ │    MatchService         │   │
│  └──────┬───────┘ └──────┬───────┘ └───────────┬─────────────┘   │
│         │                │                     │                  │
│  ┌──────┴────────────────┴─────────────────────┴──────────────┐  │
│  │                    OrchestratorService                      │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                             │                                     │
│  ┌──────────────────────────┴─────────────────────────────────┐  │
│  │ AdaptResumeService │ IdealResumeService                    │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Repository Layer                                │
│    ┌────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│    │ ResumeRepo     │  │ VacancyRepo     │  │ AIResultRepo   │   │
│    └───────┬────────┘  └────────┬────────┘  └───────┬────────┘   │
└────────────┼────────────────────┼───────────────────┼────────────┘
             │                    │                   │
             ▼                    ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                   │
│   ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐   │
│   │resume_raw  │ │vacancy_raw │ │ ai_result │ │resume_version│   │
│   └────────────┘ └────────────┘ └───────────┘ └──────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## LLM Operations

| Operation | Input | Output | Prompt |
|-----------|-------|--------|--------|
| `parse_resume` | Raw text | ParsedResume JSON | PARSE_RESUME_PROMPT |
| `parse_vacancy` | Raw text | ParsedVacancy JSON | PARSE_VACANCY_PROMPT |
| `analyze_match` | ParsedResume + ParsedVacancy | MatchAnalysis JSON | ANALYZE_MATCH_PROMPT |
| `adapt_resume` | Resume + Vacancy + Analysis + CheckboxIDs | UpdatedResume + ChangeLog | GENERATE_UPDATED_RESUME_PROMPT |
| `ideal_resume` | ParsedVacancy + Options | IdealResume text | IDEAL_RESUME_PROMPT |

## Caching Strategy

```
                    ┌─────────────────────┐
                    │   Request arrives   │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Compute input_hash  │
                    │ (SHA256 of inputs)  │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Check ai_result     │
                    │ by (operation,hash) │
                    └─────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌────────────────┐              ┌────────────────┐
     │   Cache HIT    │              │   Cache MISS   │
     │ Return cached  │              │ Call LLM       │
     │ cache_hit=true │              │ Save to cache  │
     └────────────────┘              │ cache_hit=false│
                                     └────────────────┘
```

## Error Handling

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 422 | Validation error (Pydantic) |
| 500 | Internal error (AI failure, DB error) |
| 502 | Bad Gateway (AI provider unreachable) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | ✅ | - | API key for DeepSeek |
| `DEEPSEEK_BASE_URL` | ❌ | `https://api.deepseek.com/v1` | API base URL |
| `AI_MODEL` | ❌ | `deepseek-chat` | Model name |
| `AI_TIMEOUT_SECONDS` | ❌ | `120` | Request timeout |
| `AI_MAX_RETRIES` | ❌ | `2` | Max retry attempts |
| `AI_TEMPERATURE` | ❌ | `0.3` | Model temperature |
| `AI_MAX_TOKENS` | ❌ | `4096` | Max output tokens |
| `POSTGRES_*` | ✅ | - | Database connection |
