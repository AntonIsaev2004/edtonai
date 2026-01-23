# IdealResumeService

Сервис генерации идеального резюме-шаблона для вакансии.

## Файл

`backend/services/ideal.py`

## Назначение

Генерирует "идеальное резюме" — шаблон того, как должно выглядеть резюме идеального кандидата на данную вакансию.

## Класс

```python
class IdealResumeService:
    OPERATION = "ideal_resume"
    
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.vacancy_repo = VacancyRepository(session)
        self.ideal_repo = IdealResumeRepository(session)
        self.vacancy_service = VacancyService(session)
        self.ai_provider = DeepSeekProvider()
```

## Основной метод

### `generate_ideal()`

```python
async def generate_ideal(
    self,
    vacancy_text: Optional[str] = None,
    vacancy_id: Optional[UUID] = None,
    options: Optional[dict[str, Any]] = None,
) -> IdealResumeResult:
```

**Параметры:**
- `vacancy_text` или `vacancy_id` — вакансия (обязательно одно из двух)
- `options` — настройки {language, template, seniority}

**Возвращает:**
```python
@dataclass
class IdealResumeResult:
    ideal_id: UUID
    vacancy_id: UUID
    ideal_resume_text: str
    metadata: dict[str, Any]
    cache_hit: bool
```

## Pipeline

```
generate_ideal()
│
├── 1. Получить вакансию
│     ├── vacancy_id → загрузить из БД
│     └── vacancy_text → распарсить и сохранить
│
├── 2. Получить parsed_vacancy (из кеша)
│
├── 3. Вычислить input_hash (vacancy_hash + options)
│
├── 4. Проверить ideal_resume таблицу
│     │
│     ├── HIT → return existing
│     │
│     └── MISS ↓
│
├── 5. Построить промпт (IDEAL_RESUME_PROMPT)
│
├── 6. Вызвать LLM
│
├── 7. Создать IdealResume запись
│
└── 8. Return result
```

## Хэширование

```python
def _compute_ideal_hash(
    self,
    vacancy_hash: str,
    options: dict[str, Any],
) -> str:
```

Хэш вычисляется из:
- vacancy_hash (SHA256 текста вакансии)
- Options (language, template, seniority)

## Промпт

Использует `IDEAL_RESUME_PROMPT` из `prompts.py`:

```
Входные данные:
- РАСПАРСЕННАЯ вакансия (JSON)
- Опции (язык, шаблон, seniority)

Требования к LLM:
- Сгенерировать полный текст идеального резюме
- Включить все требуемые навыки
- Использовать ATS-ключевые слова
- Вернуть metadata (keywords_used, structure, assumptions)
```

## Кеширование

В отличие от других операций, идеальное резюме кешируется в отдельной таблице `ideal_resume`, а не в `ai_result`:

```sql
SELECT * FROM ideal_resume WHERE input_hash = ?
```

Причина: нужны дополнительные поля (vacancy_id, options, generation_metadata).

## Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `language` | ru, en, auto | auto | Язык резюме |
| `template` | default, harvard | default | Стиль оформления |
| `seniority` | junior, middle, senior, any | any | Уровень кандидата |

## Пример использования

```python
async with get_session() as session:
    service = IdealResumeService(session)
    
    result = await service.generate_ideal(
        vacancy_id=UUID("b86a0150-..."),
        options={
            "language": "ru",
            "seniority": "senior"
        }
    )
    
    print(result.ideal_resume_text)
    print(result.metadata["keywords_used"])
```

## Use Cases

### 1. Эталон для сравнения

Показать кандидату разницу между его резюме и "идеальным".

### 2. Заимствование формулировок

Кандидат может использовать фразы из идеального резюме.

### 3. Понимание требований

HR может лучше понять, какого кандидата искать.

## ⚠️ Важно

Идеальное резюме — это **шаблон с выдуманным кандидатом**, а не реальный человек! Используется только как референс.
