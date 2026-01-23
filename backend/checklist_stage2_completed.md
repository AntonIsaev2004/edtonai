# ✅ Stage 2 Checklist (Hybrid): Адаптация резюме + "идеальное резюме" под вакансию
## Этап 2 из общего плана (последний перед фронтендом)

**✅ STAGE 2 COMPLETED — January 9, 2026**

Цель Stage 2:
1) Реализовать операцию адаптации резюме под вакансию по выбранным пунктам улучшений (checkbox_ids из analyze_match).
2) Реализовать операцию генерации "идеального" резюме под вакансию (без входного резюме).
3) Организовать хранение результатов в БД в гибридном формате:
   - Полный текст версии резюме (для вывода/экспорта/сравнения)
   - Массив изменений (change_log) как "диффы" (для истории, отката и будущей подсветки в UI)
   - (опционально) вычисленный diff на бэке как fallback

Важно:
- Stage 2 не включает Frontend, авторизацию, экспорт файлов, редактор в браузере, очередь задач.
- Реализация должна быть расширяемой под следующие этапы, но кодить их нельзя.

---

## 0) Соглашения и принципы Stage 2
- [x] Все ответы LLM возвращаются строго JSON.
- [x] Все LLM-результаты сохраняются в PostgreSQL (jsonb / text + metadata).
- [x] Повторные запросы с теми же входами должны отдавать cache_hit=true и НЕ вызывать LLM.
- [x] "Hybrid" = LLM отдаёт полный текст + change_log; backend дополнительно может считать diff.

---

## 1) AI Operations (новые операции Stage 2)
Добавить операции в слой AI (operation/type):
- [x] `adapt_resume` — адаптация резюме под вакансию по selected_checkbox_ids.
- [x] `ideal_resume` — генерация "идеального" резюме под вакансию без входного резюме.

Примечание:
- `parse_resume`, `parse_vacancy`, `analyze_match` остаются из Stage 1.
- `validate_json` остаётся.

---

## 2) База данных: сущности и хранение истории версий (Hybrid)

### 2.1 Базовые сущности (из Stage 1)
- [x] ResumeRaw, VacancyRaw (исходные тексты)
- [x] AIResult (универсальный кеш LLM): operation + input_hash -> output_json

### 2.2 Новые сущности Stage 2
- [x] `ResumeVersion` (история версий резюме):
  - id (uuid)
  - resume_id (fk -> ResumeRaw.id)
  - vacancy_id (fk -> VacancyRaw.id)
  - parent_version_id (nullable fk -> ResumeVersion.id)
  - text (text)
  - change_log (jsonb)
  - selected_checkbox_ids (jsonb)
  - safety_notes (jsonb)
  - analysis_id (nullable fk -> AIResult.id)
  - provider/model/prompt_version (nullable)
  - created_at
  - **File:** `backend/models/resume_version.py`

- [ ] (опционально) `ResumeVersionDiff` — **NOT IMPLEMENTED (optional)**

- [x] `IdealResume` (идеальный образец под вакансию):
  - id (uuid)
  - vacancy_id (fk -> VacancyRaw.id)
  - vacancy_hash (index)
  - text (text)
  - generation_metadata (jsonb) — renamed from `metadata` (SQLAlchemy reserved)
  - options (jsonb)
  - input_hash (unique)
  - provider/model (nullable)
  - created_at
  - **File:** `backend/models/ideal_resume.py`

---

## 3) Хеширование и кеширование (обязательное)

### 3.1 normalize/hash (как в Stage 1)
- [x] normalize(text) + sha256(normalized_text) для ResumeRaw/VacancyRaw

### 3.2 input_hash для adapt_resume
- [x] Implemented in `AdaptResumeService._compute_adapt_hash()`:
  - original_resume_text_hash
  - parsed_resume_hash
  - parsed_vacancy_hash
  - analysis_hash
  - selected_checkbox_ids (sorted)
  - template, language

### 3.3 input_hash для ideal_resume
- [x] Implemented in `IdealResumeService._compute_ideal_hash()`:
  - vacancy_hash
  - template, language, seniority

---

## 4) Сервисный слой (бизнес-логика Stage 2)

### 4.1 AdaptResumeService (Hybrid)
- [x] `adapt_and_version(...)` — **File:** `backend/services/adapt.py`
  - [x] Вход: resume_text/resume_id, vacancy_text/vacancy_id, selected_checkbox_ids, base_version_id, options
  - [x] Получить/создать ResumeRaw и VacancyRaw
  - [x] Получить parsed_resume из кеша
  - [x] Получить parsed_vacancy из кеша
  - [x] Получить match_analysis из кеша
  - [x] Вызвать LLM adapt_resume
  - [x] Создать ResumeVersion
  - [x] Вернуть результат
  - [x] **Fix:** base_version_id validation (if not found → reset to None)

### 4.2 IdealResumeService
- [x] `generate_ideal(...)` — **File:** `backend/services/ideal.py`
  - [x] Вход: vacancy_text/vacancy_id, options
  - [x] Получить/создать VacancyRaw
  - [x] Получить parsed_vacancy из кеша
  - [x] Проверить IdealResume кеш по input_hash
  - [x] Вызвать LLM ideal_resume
  - [x] Сохранить IdealResume
  - [x] Вернуть результат

---

## 5) API Endpoints Stage 2

### POST /v1/resumes/adapt
- [x] **File:** `backend/api/v1/adapt.py`
- [x] Request: resume_id/resume_text, vacancy_id/vacancy_text, selected_checkbox_ids, base_version_id, options
- [x] Response: version_id, parent_version_id, updated_resume_text, change_log, safety_notes, cache_hit

### POST /v1/resumes/ideal
- [x] **File:** `backend/api/v1/ideal.py`
- [x] Request: vacancy_id/vacancy_text, options
- [x] Response: ideal_id, vacancy_id, ideal_resume_text, metadata, cache_hit

### Optional endpoints
- [ ] GET /v1/resumes/{resume_id}/versions — **NOT IMPLEMENTED**
- [ ] GET /v1/resumes/versions/{version_id} — **NOT IMPLEMENTED**

---

## 6) Schemas (Pydantic)

- [x] `AdaptResumeRequest`, `AdaptResumeResponse`, `ChangeLogEntry` — **File:** `backend/schemas/adapt.py`
- [x] `IdealResumeRequest`, `IdealResumeResponse`, `IdealResumeMetadata` — **File:** `backend/schemas/ideal.py`

---

## 7) Repositories

- [x] `ResumeVersionRepository` — **File:** `backend/repositories/resume_version.py`
  - [x] create()
  - [x] get_by_id()
  - [x] get_versions_for_resume()
  - [x] get_latest_version()

- [x] `IdealResumeRepository` — **File:** `backend/repositories/ideal_resume.py`
  - [x] create()
  - [x] get_by_hash()
  - [x] get_by_vacancy_id()

---

## 8) Prompts

- [x] `GENERATE_UPDATED_RESUME_PROMPT` — **File:** `backend/prompts.py`
- [x] `IDEAL_RESUME_PROMPT` — **File:** `backend/prompts.py`

---

## 9) Качество результата (Definition of Done)
- [x] Операция adapt_resume создаёт новую версию и сохраняет change_log.
- [x] Операция ideal_resume создаёт идеальный текст и кешируется по input_hash.
- [x] Повторные запросы с теми же входами → cache_hit=true без вызова LLM.
- [x] Ответ LLM валидируется (json.loads -> validate_json fallback).
- [x] safety_notes заполняется, если выбранные пункты невозможно применить честно.

---

## Documentation Updated

- [x] `docs/backend/api/README.md` — added Stage 2 endpoints
- [x] `docs/backend/api/adapt.md` — NEW
- [x] `docs/backend/api/ideal.md` — NEW
- [x] `docs/backend/services/README.md` — added Stage 2 services
- [x] `docs/backend/services/adapt_service.md` — NEW
- [x] `docs/backend/services/ideal_service.md` — NEW
- [x] `docs/backend/database/README.md` — added Stage 2 tables
- [x] `docs/backend/README.md` — updated project structure
