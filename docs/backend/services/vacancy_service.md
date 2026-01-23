# VacancyService

Сервис парсинга и кеширования вакансий.

## Файл

`backend/services/vacancy.py`

## Класс

```python
class VacancyService:
    OPERATION = "parse_vacancy"
```

## Зависимости

- `VacancyRepository` — CRUD для `vacancy_raw`
- `AIResultRepository` — CRUD для `ai_result`
- `DeepSeekProvider` — вызовы LLM

## Методы

### `parse_and_cache(vacancy_text: str) -> VacancyParseResult`

Парсит текст вакансии и возвращает структурированный JSON.

#### Параметры

| Name | Type | Description |
|------|------|-------------|
| `vacancy_text` | str | Исходный текст вакансии |

#### Возвращает

```python
@dataclass
class VacancyParseResult:
    vacancy_id: UUID       # ID записи в vacancy_raw
    vacancy_hash: str      # SHA256 хэш
    parsed_vacancy: dict   # Структурированный JSON
    cache_hit: bool        # True если из кеша
```

#### Алгоритм

Аналогичен `ResumeService.parse_and_cache()`:

1. Нормализация и хэширование текста
2. Get or create `VacancyRaw`
3. Проверка кеша в `ai_result`
4. Если miss — вызов LLM с `PARSE_VACANCY_PROMPT`
5. Сохранение результата
6. Возврат `VacancyParseResult`

## Prompt

Использует `PARSE_VACANCY_PROMPT` из `backend/prompts.py`.

Структура ожидаемого JSON:

```json
{
  "job_title": "string|null",
  "company": "string|null",
  "employment_type": "string|null",
  "location": "string|null",
  "required_skills": [
    {
      "name": "string",
      "type": "hard|soft|domain|tool",
      "evidence": "string"
    }
  ],
  "preferred_skills": [
    {
      "name": "string",
      "type": "hard|soft|domain|tool",
      "evidence": "string"
    }
  ],
  "experience_requirements": {
    "min_years": "number|null",
    "details": "string|null"
  },
  "responsibilities": ["string"],
  "ats_keywords": ["string"]
}
```

### Поля

| Field | Description |
|-------|-------------|
| `job_title` | Название должности |
| `company` | Название компании |
| `employment_type` | full-time, part-time, remote и т.д. |
| `location` | Город/страна/удалёнка |
| `required_skills` | Обязательные навыки с evidence |
| `preferred_skills` | Желательные навыки с evidence |
| `experience_requirements` | Требования к опыту |
| `responsibilities` | Список обязанностей |
| `ats_keywords` | Ключевые слова для ATS |

### Skill Types

| Type | Description | Examples |
|------|-------------|----------|
| `hard` | Технические навыки | Python, SQL, Docker |
| `soft` | Soft skills | Communication, Leadership |
| `domain` | Доменные знания | Fintech, E-commerce |
| `tool` | Инструменты | Jira, Confluence, Git |

## Пример

```python
service = VacancyService(session)

result = await service.parse_and_cache("""
    Senior Python Developer
    
    Требования:
    - Python 5+ лет
    - FastAPI или Django
    - PostgreSQL
    
    Желательно:
    - Kubernetes
    - CI/CD опыт
""")

print(result.parsed_vacancy["required_skills"])
# [
#   {"name": "Python", "type": "hard", "evidence": "Python 5+ лет"},
#   {"name": "FastAPI", "type": "hard", "evidence": "FastAPI или Django"},
#   {"name": "PostgreSQL", "type": "hard", "evidence": "PostgreSQL"}
# ]
```

## Логирование

```
INFO  | Created new vacancy record: <uuid>
INFO  | Cache hit for vacancy parsing: <hash[:16]>
INFO  | Saved parsed vacancy to cache: <hash[:16]>
```
