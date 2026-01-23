# ResumeService

Сервис парсинга и кеширования резюме.

## Файл

`backend/services/resume.py`

## Класс

```python
class ResumeService:
    OPERATION = "parse_resume"
```

## Зависимости

- `ResumeRepository` — CRUD для `resume_raw`
- `AIResultRepository` — CRUD для `ai_result`
- `DeepSeekProvider` — вызовы LLM

## Методы

### `parse_and_cache(resume_text: str) -> ResumeParseResult`

Парсит текст резюме и возвращает структурированный JSON.

#### Параметры

| Name | Type | Description |
|------|------|-------------|
| `resume_text` | str | Исходный текст резюме |

#### Возвращает

```python
@dataclass
class ResumeParseResult:
    resume_id: UUID        # ID записи в resume_raw
    resume_hash: str       # SHA256 хэш
    parsed_resume: dict    # Структурированный JSON
    cache_hit: bool        # True если из кеша
```

#### Алгоритм

```
parse_and_cache(resume_text)
│
├── 1. compute_hash(resume_text)
│       │
│       ├── normalize_text(resume_text)
│       │     • trim
│       │     • collapse spaces
│       │     • collapse newlines
│       │
│       └── sha256(normalized)
│
├── 2. resume_repo.get_by_hash(hash)
│       │
│       ├── Found? → use existing
│       └── Not found? → resume_repo.create(text, hash)
│
├── 3. ai_result_repo.get("parse_resume", hash)
│       │
│       ├── Found? → return ResumeParseResult(cache_hit=True)
│       │
│       └── Not found? → continue
│
├── 4. Build prompt
│       │
│       └── PARSE_RESUME_PROMPT.replace("{{RESUME_TEXT}}", text)
│
├── 5. ai_provider.generate_json(prompt, "parse_resume")
│       │
│       ├── HTTP POST to DeepSeek
│       ├── Parse JSON response
│       └── Validate/retry if invalid
│
├── 6. ai_result_repo.save(
│       operation="parse_resume",
│       input_hash=hash,
│       output_json=parsed,
│       provider="deepseek",
│       model=settings.ai_model
│   )
│
└── 7. return ResumeParseResult(cache_hit=False)
```

#### Пример использования

```python
async with AsyncSessionLocal() as session:
    service = ResumeService(session)
    
    result = await service.parse_and_cache("""
        Иван Иванов
        Python Developer
        
        Опыт: 3 года
        Навыки: Python, FastAPI, PostgreSQL
    """)
    
    print(result.resume_id)      # UUID
    print(result.cache_hit)      # False (первый вызов)
    print(result.parsed_resume)  # {"personal_info": {...}, ...}
```

#### Повторный вызов

```python
# Тот же текст
result2 = await service.parse_and_cache(same_text)
print(result2.cache_hit)  # True — из кеша, LLM не вызывался
```

## Prompt

Использует `PARSE_RESUME_PROMPT` из `backend/prompts.py`.

Структура ожидаемого JSON:

```json
{
  "personal_info": {
    "name": "string",
    "title": "string",
    "location": "string|null",
    "contacts": {
      "email": "string|null",
      "phone": "string|null",
      "links": ["string"]
    }
  },
  "summary": "string|null",
  "skills": [
    {
      "name": "string",
      "category": "language|framework|database|cloud|devops|tool|soft|other",
      "level": "junior|middle|senior|unknown"
    }
  ],
  "work_experience": [
    {
      "company": "string",
      "position": "string",
      "start_date": "string",
      "end_date": "string|null",
      "responsibilities": ["string"],
      "achievements": ["string"],
      "tech_stack": ["string"]
    }
  ],
  "education": [...],
  "certifications": [...],
  "languages": [...],
  "raw_sections": {...}
}
```

## Логирование

```
INFO  | Created new resume record: <uuid>
INFO  | Cache hit for resume parsing: <hash[:16]>
INFO  | Saved parsed resume to cache: <hash[:16]>
```

## Ошибки

| Exception | Cause | HTTP Code |
|-----------|-------|-----------|
| `AIRequestError` | DeepSeek недоступен | 502 |
| `AIResponseFormatError` | Невалидный JSON от LLM | 502 |
