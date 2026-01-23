# MatchService

Сервис анализа соответствия резюме вакансии.

## Файл

`backend/services/match.py`

## Класс

```python
class MatchService:
    OPERATION = "analyze_match"
```

## Зависимости

- `AIResultRepository` — CRUD для `ai_result`
- `DeepSeekProvider` — вызовы LLM

**Примечание:** MatchService не работает с `ResumeRaw` или `VacancyRaw` напрямую — он принимает уже распарсенные JSON.

## Методы

### `analyze_and_cache(parsed_resume: dict, parsed_vacancy: dict) -> MatchAnalysisResult`

Анализирует соответствие распарсенного резюме распарсенной вакансии.

#### Параметры

| Name | Type | Description |
|------|------|-------------|
| `parsed_resume` | dict | JSON от `ResumeService.parse_and_cache()` |
| `parsed_vacancy` | dict | JSON от `VacancyService.parse_and_cache()` |

#### Возвращает

```python
@dataclass
class MatchAnalysisResult:
    analysis_id: UUID    # ID записи в ai_result
    analysis: dict       # Результат анализа
    cache_hit: bool      # True если из кеша
```

#### Алгоритм

```
analyze_and_cache(parsed_resume, parsed_vacancy)
│
├── 1. _compute_match_hash(parsed_resume, parsed_vacancy)
│       │
│       ├── json.dumps(parsed_resume, sort_keys=True)
│       ├── json.dumps(parsed_vacancy, sort_keys=True)
│       └── sha256(resume_json + vacancy_json)
│
├── 2. ai_result_repo.get("analyze_match", hash)
│       │
│       ├── Found? → return MatchAnalysisResult(cache_hit=True)
│       │
│       └── Not found? → continue
│
├── 3. Build prompt
│       │
│       └── ANALYZE_MATCH_PROMPT
│             .replace("{{PARSED_RESUME_JSON}}", json.dumps(parsed_resume))
│             .replace("{{PARSED_VACANCY_JSON}}", json.dumps(parsed_vacancy))
│
├── 4. ai_provider.generate_json(prompt, "analyze_match")
│
├── 5. ai_result_repo.save(
│       operation="analyze_match",
│       input_hash=hash,
│       output_json=analysis,
│       ...
│   )
│
└── 6. return MatchAnalysisResult(cache_hit=False)
```

## Hash Computation

```python
def _compute_match_hash(
    self,
    parsed_resume: dict,
    parsed_vacancy: dict,
) -> str:
    combined = (
        json.dumps(parsed_resume, sort_keys=True) +
        json.dumps(parsed_vacancy, sort_keys=True)
    )
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()
```

**Важно:** `sort_keys=True` обеспечивает детерминированный хэш независимо от порядка ключей в dict.

## Prompt

Использует `ANALYZE_MATCH_PROMPT` из `backend/prompts.py`.

## Scoring Formula

Общий score (0-100) состоит из 4 компонентов:

### Skill Fit (max 50)

```
required_score = (matched_required / total_required) * 40
preferred_score = (matched_preferred / total_preferred) * 10
skill_fit = required_score + preferred_score
```

Если `preferred_skills` пустой — даётся 10 баллов.

### Experience Fit (max 25)

| Condition | Score |
|-----------|-------|
| Опыт >= min_years, релевантный | 25 |
| Опыт >= min_years, частично релевантный | 20 |
| Опыт < min_years, но релевантный | 15 |
| Опыт не подтверждён датами | max 8 |
| Опыт не соответствует | 0-5 |

### ATS Fit (max 15)

```
ats_fit = (covered_keywords / total_keywords) * 15
```

Если `ats_keywords` пустой — даётся 15 баллов.

### Clarity & Evidence (max 10)

Оценка качества формулировок:
- Навыки подтверждены опытом
- Конкретные метрики и результаты
- Чёткие формулировки

## Response Structure

```json
{
  "score": 72,
  "score_breakdown": {
    "skill_fit": {"value": 42, "comment": "..."},
    "experience_fit": {"value": 18, "comment": "..."},
    "ats_fit": {"value": 8, "comment": "..."},
    "clarity_evidence": {"value": 4, "comment": "..."}
  },
  "matched_required_skills": ["Python", "FastAPI"],
  "missing_required_skills": ["Kubernetes"],
  "matched_preferred_skills": ["Docker"],
  "missing_preferred_skills": ["CI/CD"],
  "ats": {
    "covered_keywords": ["Python", "FastAPI", "Docker"],
    "missing_keywords": ["Kubernetes", "микросервисы"],
    "coverage_ratio": 0.6
  },
  "gaps": [
    {
      "id": "gap_1",
      "type": "missing_skill",
      "severity": "high",
      "message": "Отсутствует Kubernetes",
      "suggestion": "Укажите опыт работы или готовность изучить",
      "target_section": "skills"
    }
  ],
  "checkbox_options": [
    {
      "id": "cb_1",
      "label": "Добавить Kubernetes",
      "impact": "high",
      "action_hint": "Укажите базовые знания или курсы"
    }
  ]
}
```

### Gap Types

| Type | Description |
|------|-------------|
| `missing_skill` | Отсутствует требуемый навык |
| `experience_gap` | Недостаточно опыта |
| `ats_keyword` | Отсутствует ATS-ключевое слово |
| `weak_evidence` | Навык не подтверждён опытом |
| `weak_wording` | Слабые/размытые формулировки |

### Severity Levels

| Level | Description |
|-------|-------------|
| `high` | Критично для прохождения отбора |
| `medium` | Желательно исправить |
| `low` | Минорное улучшение |

## Пример использования

```python
# После парсинга резюме и вакансии
match_service = MatchService(session)

result = await match_service.analyze_and_cache(
    parsed_resume=resume_result.parsed_resume,
    parsed_vacancy=vacancy_result.parsed_vacancy,
)

print(f"Score: {result.analysis['score']}/100")
print(f"Missing skills: {result.analysis['missing_required_skills']}")
```
