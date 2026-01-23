# AdaptResumeService

Сервис адаптации резюме под вакансию по выбранным улучшениям.

## Файл

`backend/services/adapt.py`

## Назначение

Принимает checkbox_options из analyze_match и генерирует адаптированное резюме с историей версий.

## Класс

```python
class AdaptResumeService:
    OPERATION = "adapt_resume"
    
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.resume_repo = ResumeRepository(session)
        self.vacancy_repo = VacancyRepository(session)
        self.ai_result_repo = AIResultRepository(session)
        self.version_repo = ResumeVersionRepository(session)
        self.resume_service = ResumeService(session)
        self.vacancy_service = VacancyService(session)
        self.match_service = MatchService(session)
        self.ai_provider = DeepSeekProvider()
```

## Основной метод

### `adapt_and_version()`

```python
async def adapt_and_version(
    self,
    resume_text: Optional[str] = None,
    resume_id: Optional[UUID] = None,
    vacancy_text: Optional[str] = None,
    vacancy_id: Optional[UUID] = None,
    selected_checkbox_ids: list[str] = None,
    base_version_id: Optional[UUID] = None,
    options: Optional[dict[str, Any]] = None,
) -> AdaptResumeResult:
```

**Параметры:**
- `resume_text` или `resume_id` — резюме (обязательно одно из двух)
- `vacancy_text` или `vacancy_id` — вакансия (обязательно одно из двух)
- `selected_checkbox_ids` — список ID улучшений для применения
- `base_version_id` — ID родительской версии (опционально)
- `options` — настройки {language, template}

**Возвращает:**
```python
@dataclass
class AdaptResumeResult:
    version_id: UUID
    parent_version_id: Optional[UUID]
    resume_id: UUID
    vacancy_id: UUID
    updated_resume_text: str
    change_log: list[dict[str, Any]]
    applied_checkbox_ids: list[str]
    safety_notes: list[str]
    cache_hit: bool
```

## Pipeline

```
adapt_and_version()
│
├── 1. Получить резюме
│     ├── resume_id → загрузить из БД
│     └── resume_text → распарсить и сохранить
│
├── 2. Получить вакансию
│     ├── vacancy_id → загрузить из БД
│     └── vacancy_text → распарсить и сохранить
│
├── 2.5. Валидация base_version_id
│     └── Если не найден в БД → reset to None
│
├── 3. Получить parsed_resume (из кеша)
│
├── 4. Получить parsed_vacancy (из кеша)
│
├── 5. Получить match_analysis (из кеша)
│
├── 6. Вычислить input_hash
│
├── 7. Проверить кеш adapt_resume
│     │
│     ├── HIT → создать ResumeVersion → return
│     │
│     └── MISS ↓
│
├── 8. Построить промпт (GENERATE_UPDATED_RESUME_PROMPT)
│
├── 9. Вызвать LLM
│
├── 10. Сохранить в ai_result
│
├── 11. Создать ResumeVersion
│
└── 12. Return result
```

## Хэширование

```python
def _compute_adapt_hash(
    self,
    original_resume_text: str,
    parsed_resume: dict,
    parsed_vacancy: dict,
    analysis: dict,
    selected_checkbox_ids: list[str],
    options: dict,
) -> str:
```

Хэш вычисляется из:
- SHA256 оригинального текста резюме
- SHA256 parsed_resume JSON
- SHA256 parsed_vacancy JSON
- SHA256 analysis JSON
- Отсортированные selected_checkbox_ids
- Options (language, template)

## Промпт

Использует `GENERATE_UPDATED_RESUME_PROMPT` из `prompts.py`:

```
Входные данные:
- ОРИГИНАЛЬНЫЙ ТЕКСТ резюме
- РАСПАРСЕННОЕ резюме (JSON)
- РАСПАРСЕННАЯ вакансия (JSON)
- АНАЛИЗ СООТВЕТСТВИЯ (JSON)
- ВЫБРАННЫЕ улучшения (checkbox_ids)
- Опции (язык, шаблон)

Требования к LLM:
- Вернуть updated_resume_text (полный текст)
- Вернуть change_log (список изменений)
- Вернуть applied_checkbox_ids
- Вернуть safety_notes (предупреждения)
```

## Version History

Каждый вызов создаёт запись в `resume_version`:

```sql
INSERT INTO resume_version (
    id, resume_id, vacancy_id, parent_version_id,
    text, change_log, selected_checkbox_ids,
    safety_notes, analysis_id, provider, model
) VALUES (...)
```

Это позволяет:
- Отслеживать историю адаптаций
- Откатиться к предыдущей версии
- Сравнивать версии

## Пример использования

```python
async with get_session() as session:
    service = AdaptResumeService(session)
    
    result = await service.adapt_and_version(
        resume_id=UUID("94367c01-..."),
        vacancy_id=UUID("b86a0150-..."),
        selected_checkbox_ids=["detail_tech_exp", "add_ceremonies"],
        options={"language": "ru"}
    )
    
    print(result.updated_resume_text)
    print(result.change_log)
```
