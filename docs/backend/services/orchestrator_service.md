# OrchestratorService

Сервис-координатор, объединяющий pipeline анализа.

## Файл

`backend/services/orchestrator.py`

## Класс

```python
class OrchestratorService:
    ...
```

## Зависимости

- `ResumeService` — парсинг резюме
- `VacancyService` — парсинг вакансий
- `MatchService` — анализ соответствия
- `AnalysisRepository` — связывание результатов

## Методы

### `run_analysis(resume_text: str, vacancy_text: str) -> FullAnalysisResult`

Выполняет полный pipeline анализа: парсинг обоих документов + анализ соответствия.

#### Параметры

| Name | Type | Description |
|------|------|-------------|
| `resume_text` | str | Исходный текст резюме |
| `vacancy_text` | str | Исходный текст вакансии |

#### Возвращает

```python
@dataclass
class FullAnalysisResult:
    resume_id: UUID
    vacancy_id: UUID
    analysis_id: UUID
    parsed_resume: dict
    parsed_vacancy: dict
    analysis: dict
    cache_hit: bool  # True только если ВСЕ 3 из кеша
```

#### Алгоритм

```
run_analysis(resume_text, vacancy_text)
│
├── Step 1: Resume parsing
│   │
│   └── resume_result = resume_service.parse_and_cache(resume_text)
│         │
│         ├── resume_id
│         ├── parsed_resume
│         └── cache_hit_1
│
├── Step 2: Vacancy parsing
│   │
│   └── vacancy_result = vacancy_service.parse_and_cache(vacancy_text)
│         │
│         ├── vacancy_id
│         ├── parsed_vacancy
│         └── cache_hit_2
│
├── Step 3: Match analysis
│   │
│   └── match_result = match_service.analyze_and_cache(
│             parsed_resume,
│             parsed_vacancy
│         )
│         │
│         ├── analysis_id
│         ├── analysis
│         └── cache_hit_3
│
├── Step 4: Create link
│   │
│   └── analysis_repo.link(
│             resume_id,
│             vacancy_id,
│             analysis_result_id
│         )
│
└── Return FullAnalysisResult(
        cache_hit = cache_hit_1 AND cache_hit_2 AND cache_hit_3
    )
```

## Sequence Diagram

```
┌────────┐     ┌────────────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────────┐
│ Client │     │ OrchestratorSvc│     │ ResumeService │     │VacancyService│    │ MatchService │
└───┬────┘     └───────┬────────┘     └───────┬───────┘     └──────┬───────┘    └──────┬───────┘
    │                  │                      │                    │                   │
    │ run_analysis()   │                      │                    │                   │
    │─────────────────>│                      │                    │                   │
    │                  │                      │                    │                   │
    │                  │ parse_and_cache()    │                    │                   │
    │                  │─────────────────────>│                    │                   │
    │                  │                      │                    │                   │
    │                  │      ResumeResult    │                    │                   │
    │                  │<─────────────────────│                    │                   │
    │                  │                      │                    │                   │
    │                  │ parse_and_cache()    │                    │                   │
    │                  │──────────────────────────────────────────>│                   │
    │                  │                      │                    │                   │
    │                  │      VacancyResult   │                    │                   │
    │                  │<──────────────────────────────────────────│                   │
    │                  │                      │                    │                   │
    │                  │ analyze_and_cache()  │                    │                   │
    │                  │───────────────────────────────────────────────────────────────>
    │                  │                      │                    │                   │
    │                  │      MatchResult     │                    │                   │
    │                  │<───────────────────────────────────────────────────────────────
    │                  │                      │                    │                   │
    │ FullAnalysisResult                      │                    │                   │
    │<─────────────────│                      │                    │                   │
    │                  │                      │                    │                   │
```

## Пример использования

```python
async with AsyncSessionLocal() as session:
    orchestrator = OrchestratorService(session)
    
    result = await orchestrator.run_analysis(
        resume_text="Иван Иванов, Python Developer...",
        vacancy_text="Senior Python Developer, требования..."
    )
    
    print(f"Score: {result.analysis['score']}")
    print(f"All from cache: {result.cache_hit}")
    
    # Первый вызов:
    # Score: 72
    # All from cache: False
    
    # Повторный вызов с теми же данными:
    # Score: 72
    # All from cache: True
```

## Cache Hit Logic

`cache_hit` в ответе = `True` **только если все 3 операции** взяты из кеша:

```python
all_cache_hit = (
    resume_result.cache_hit
    and vacancy_result.cache_hit
    and match_result.cache_hit
)
```

### Сценарии

| Resume | Vacancy | Match | Result |
|--------|---------|-------|--------|
| cache | cache | cache | `cache_hit=True` |
| cache | cache | miss | `cache_hit=False` |
| cache | miss | - | `cache_hit=False` |
| miss | - | - | `cache_hit=False` |

## AnalysisLink

После успешного анализа создаётся запись в `analysis_link`:

```sql
INSERT INTO analysis_link (resume_id, vacancy_id, analysis_result_id)
VALUES (:resume_id, :vacancy_id, :analysis_id)
```

Это позволяет:
- Отслеживать историю анализов
- Быстро находить все анализы для конкретного резюме/вакансии
- Готовить данные для Stage 2 (улучшение резюме)

## Логирование

```
INFO | Resume parsed: id=<uuid> cache_hit=False
INFO | Vacancy parsed: id=<uuid> cache_hit=True
INFO | Match analyzed: id=<uuid> cache_hit=False
```
