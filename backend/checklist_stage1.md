# ✅ Stage 1 Checklist: Backend (AI + PostgreSQL) — без UI, без экспорта, тест через Swagger

Цель этапа: получить минимальный backend, который:
1) принимает текст резюме и текст вакансии,
2) вызывает LLM по 3 операциям (parse_resume, parse_vacancy, analyze_match),
3) сохраняет всё в PostgreSQL в виде JSON,
4) повторно использует результаты (кеш по хэшу) без повторных вызовов LLM,
5) позволяет протестировать через Swagger полный цикл до анализа (без генерации обновлённого резюме).

---

## 1) Базовая структура проекта (минимум)
- [ ] FastAPI проект без “толстого main.py”
- [ ] Модули:
  - [ ] `core/` (config, logging)
  - [ ] `db/` (session, base, migrations placeholder)
  - [ ] `models/` (ORM сущности)
  - [ ] `schemas/` (Pydantic request/response)
  - [ ] `repositories/` (работа с БД)
  - [ ] `ai/` (provider + prompts + client)
  - [ ] `services/` (бизнес-логика orchestrator)
  - [ ] `api/` (роуты)

---

## 2) Конфигурация и окружение
- [ ] Настройки через env (Pydantic Settings):
  - [ ] DATABASE_URL
  - [ ] AI_PROVIDER (deepseek)
  - [ ] DEEPSEEK_API_KEY
  - [ ] DEEPSEEK_BASE_URL (если надо)
  - [ ] AI_MODEL (если надо)
  - [ ] AI_TIMEOUT_SECONDS
- [ ] Логирование (request_id/trace_id на уровне приложения)

---

## 3) AI слой (интеграция + промпты)
- [ ] `SYSTEM_PROMPT` отдельной константой
- [ ] Константы промптов:
  - [ ] `PARSE_RESUME_PROMPT`
  - [ ] `PARSE_VACANCY_PROMPT`
  - [ ] `ANALYZE_MATCH_PROMPT`
  - [ ] `VALIDATE_JSON_PROMPT`
- [ ] AIProvider интерфейс:
  - [ ] `generate_json(prompt: str) -> dict`
- [ ] Реализация DeepSeekProvider:
  - [ ] HTTP client (requests/httpx)
  - [ ] таймауты
  - [ ] retry (ограниченный) на сетевые ошибки
- [ ] JSON-валидация ответа:
  - [ ] сначала попытка `json.loads()`
  - [ ] если невалидно → 1 доп. вызов LLM с `VALIDATE_JSON_PROMPT`
  - [ ] если снова невалидно → ошибка 422/500 с понятным message
- [ ] Логирование метаданных вызова AI:
  - [ ] prompt_name
  - [ ] model
  - [ ] latency_ms
  - [ ] input_hash
  - [ ] success/fail

---

## 4) Модель данных PostgreSQL (минимум для Stage 1)
### 4.1 Сущности (ORM)
- [ ] `ResumeRaw`:
  - [ ] id (uuid)
  - [ ] source_text (text)
  - [ ] content_hash (unique) — sha256 normalized
  - [ ] created_at
- [ ] `VacancyRaw`:
  - [ ] id (uuid)
  - [ ] source_text (text)
  - [ ] content_hash (unique)
  - [ ] created_at
- [ ] `AIResult` (универсальная таблица кеша LLM):
  - [ ] id (uuid)
  - [ ] operation (enum/str: parse_resume | parse_vacancy | analyze_match)
  - [ ] input_hash (index, unique вместе с operation)
  - [ ] output_json (jsonb)
  - [ ] model (str|null)
  - [ ] provider (str|null)
  - [ ] created_at
  - [ ] error (text|null) — если сохраним неуспех (опционально)
- [ ] `AnalysisLink` (связка для удобства):
  - [ ] id (uuid)
  - [ ] resume_id (fk)
  - [ ] vacancy_id (fk)
  - [ ] analysis_result_id (fk на AIResult где operation=analyze_match)
  - [ ] created_at

### 4.2 Нормализация текста для хэша
- [ ] функция normalize(text):
  - [ ] trim
  - [ ] унификация пробелов
  - [ ] удаление повторяющихся пустых строк
- [ ] hash = sha256(normalized_text)

---

## 5) Репозитории (DB слой)
- [ ] `ResumeRepository`:
  - [ ] get_by_hash(hash)
  - [ ] create(text, hash)
- [ ] `VacancyRepository`:
  - [ ] get_by_hash(hash)
  - [ ] create(text, hash)
- [ ] `AIResultRepository`:
  - [ ] get(operation, input_hash)
  - [ ] save(operation, input_hash, output_json, provider, model)
- [ ] `AnalysisRepository`:
  - [ ] link(resume_id, vacancy_id, analysis_result_id)

---

## 6) Сервисы (бизнес-логика и кеширование)
- [ ] `ResumeService.parse_and_cache(resume_text)`:
  - [ ] сохраняет ResumeRaw (если новый)
  - [ ] ищет AIResult(operation=parse_resume, input_hash)
  - [ ] если нет → вызывает AI → сохраняет AIResult
  - [ ] возвращает parsed_resume_json
- [ ] `VacancyService.parse_and_cache(vacancy_text)` аналогично
- [ ] `MatchService.analyze_and_cache(parsed_resume, parsed_vacancy)`:
  - [ ] input_hash = sha256(json.dumps(parsed_resume)+json.dumps(parsed_vacancy))
  - [ ] ищет AIResult(operation=analyze_match, input_hash)
  - [ ] если нет → вызывает AI → сохраняет AIResult
  - [ ] возвращает match_analysis_json
- [ ] `OrchestratorService.run_analysis(resume_text, vacancy_text)`:
  - [ ] parse_resume (c cache)
  - [ ] parse_vacancy (c cache)
  - [ ] analyze_match (c cache)
  - [ ] сохраняет AnalysisLink
  - [ ] отдаёт полный ответ: ids + 3 json результата

---

## 7) API endpoints (для Swagger теста Stage 1)
- [ ] POST `/v1/resumes/parse`:
  - input: `{ "resume_text": "..." }`
  - output: `{ "resume_id": "...", "resume_hash": "...", "parsed_resume": {...}, "cache_hit": true/false }`
- [ ] POST `/v1/vacancies/parse`:
  - input: `{ "vacancy_text": "..." }`
  - output: `{ "vacancy_id": "...", "vacancy_hash": "...", "parsed_vacancy": {...}, "cache_hit": true/false }`
- [ ] POST `/v1/match/analyze`:
  - input: `{ "resume_text": "...", "vacancy_text": "..." }`
  - output: `{ "resume_id": "...", "vacancy_id": "...", "analysis_id": "...", "analysis": {...}, "cache_hit": true/false }`

---

## 8) Минимальные критерии готовности Stage 1
- [ ] Swagger позволяет прогнать полный сценарий: текст резюме + текст вакансии → score + gaps
- [ ] Повторный запрос с теми же входами не вызывает LLM (cache_hit=true)
- [ ] Все JSON ответы LLM сохраняются в postgres (jsonb)
- [ ] Ошибки LLM/JSON корректно обрабатываются и логируются