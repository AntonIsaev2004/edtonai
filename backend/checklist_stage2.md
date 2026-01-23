# ✅ Stage 2 Checklist (Hybrid): Адаптация резюме + “идеальное резюме” под вакансию
## Этап 2 из общего плана (последний перед фронтендом)

Цель Stage 2:
1) Реализовать операцию адаптации резюме под вакансию по выбранным пунктам улучшений (checkbox_ids из analyze_match).
2) Реализовать операцию генерации “идеального” резюме под вакансию (без входного резюме).
3) Организовать хранение результатов в БД в гибридном формате:
   - Полный текст версии резюме (для вывода/экспорта/сравнения)
   - Массив изменений (change_log) как “диффы” (для истории, отката и будущей подсветки в UI)
   - (опционально) вычисленный diff на бэке как fallback

Важно:
- Stage 2 не включает Frontend, авторизацию, экспорт файлов, редактор в браузере, очередь задач.
- Реализация должна быть расширяемой под следующие этапы, но кодить их нельзя.

---

## 0) Соглашения и принципы Stage 2
- [ ] Все ответы LLM возвращаются строго JSON.
- [ ] Все LLM-результаты сохраняются в PostgreSQL (jsonb / text + metadata).
- [ ] Повторные запросы с теми же входами должны отдавать cache_hit=true и НЕ вызывать LLM.
- [ ] “Hybrid” = LLM отдаёт полный текст + change_log; backend дополнительно может считать diff.

---

## 1) AI Operations (новые операции Stage 2)
Добавить операции в слой AI (operation/type):
- [ ] `adapt_resume` — адаптация резюме под вакансию по selected_checkbox_ids.
- [ ] `ideal_resume` — генерация “идеального” резюме под вакансию без входного резюме.

Примечание:
- `parse_resume`, `parse_vacancy`, `analyze_match` остаются из Stage 1.
- `validate_json` остаётся.

---

## 2) База данных: сущности и хранение истории версий (Hybrid)

### 2.1 Базовые сущности (из Stage 1)
- [ ] ResumeRaw, VacancyRaw (исходные тексты)
- [ ] AIResult (универсальный кеш LLM): operation + input_hash -> output_json

### 2.2 Новые сущности Stage 2
- [ ] `ResumeVersion` (история версий резюме):
  - id (uuid)
  - resume_id (fk -> ResumeRaw.id)  # базовый документ пользователя
  - vacancy_id (fk -> VacancyRaw.id)
  - parent_version_id (nullable fk -> ResumeVersion.id)  # для отката/ветвления
  - text (text)  # полный текст версии резюме
  - change_log (jsonb)  # массив изменений (из LLM)
  - selected_checkbox_ids (jsonb)  # что выбрал пользователь
  - analysis_id (nullable fk -> AIResult.id для analyze_match)  # анализ, на основе которого улучшали
  - provider/model/prompt_version (nullable)
  - created_at

- [ ] (опционально) `ResumeVersionDiff` (fallback diff, вычисленный на бэке):
  - id (uuid)
  - from_version_id (fk)
  - to_version_id (fk)
  - diff_format (enum: "unified" | "word" | "html" | "json")
  - diff_payload (text/jsonb)

- [ ] `IdealResume` (идеальный образец под вакансию):
  - id (uuid)
  - vacancy_id (fk -> VacancyRaw.id)
  - vacancy_hash (index)  # для быстрого кеша
  - text (text)  # полный текст идеального резюме
  - metadata (jsonb)  # keywords_used, assumptions, template, language, model info
  - provider/model/prompt_version (nullable)
  - created_at

---

## 3) Хеширование и кеширование (обязательное)
### 3.1 normalize/hash (как в Stage 1)
- [ ] normalize(text) + sha256(normalized_text) для ResumeRaw/VacancyRaw

### 3.2 input_hash для adapt_resume
- [ ] input_hash = sha256(
  json.dumps({
    "operation": "adapt_resume",
    "original_resume_text_hash": <resume_hash or sha256(original_text)>,
    "parsed_resume_hash": sha256(canonical_json(parsed_resume)),
    "parsed_vacancy_hash": sha256(canonical_json(parsed_vacancy)),
    "analysis_hash": sha256(canonical_json(match_analysis)),
    "selected_checkbox_ids": sorted(list),
    "template": <optional>,
    "language": <optional>
  })
)

### 3.3 input_hash для ideal_resume
- [ ] input_hash = sha256(
  json.dumps({
    "operation": "ideal_resume",
    "parsed_vacancy_hash": sha256(canonical_json(parsed_vacancy)),
    "vacancy_hash": vacancy_hash,
    "template": <optional>,
    "language": <optional>,
    "seniority": <optional>
  })
)

---

## 4) Сервисный слой (бизнес-логика Stage 2)

### 4.1 AdaptResumeService (Hybrid)
- [ ] `adapt_and_version(...)`:
  Вход:
  - resume_text (сырой текст) ИЛИ resume_id (если уже сохранён)
  - vacancy_text ИЛИ vacancy_id
  - selected_checkbox_ids (список id, выбранных пользователем)
  - (опционально) base_version_id (если улучшаем не оригинал, а версию)
  Шаги:
  1) Получить/создать ResumeRaw и VacancyRaw
  2) Получить parsed_resume из AIResult(parse_resume) (cache)
  3) Получить parsed_vacancy из AIResult(parse_vacancy) (cache)
  4) Получить match_analysis из AIResult(analyze_match) (cache)
  5) Вызвать AI operation=adapt_resume:
     - ожидаем JSON: updated_resume_text + applied_checkbox_ids + change_log + safety_notes
  6) (опционально) посчитать diff между base_text и updated_resume_text и сохранить ResumeVersionDiff
  7) Создать ResumeVersion:
     - text = updated_resume_text
     - change_log = change_log
     - parent_version_id = base_version_id (или null если база)
     - analysis_id = id результата analyze_match
     - selected_checkbox_ids = выбранные пользователем
  8) Вернуть пользователю:
     - version_id, parent_version_id
     - updated_resume_text
     - change_log
     - safety_notes
     - cache_hit

### 4.2 IdealResumeService
- [ ] `generate_ideal(...)`:
  Вход:
  - vacancy_text или vacancy_id
  - (опционально) language/template/seniority
  Шаги:
  1) Получить/создать VacancyRaw
  2) Получить parsed_vacancy из AIResult(parse_vacancy) (cache)
  3) Вызвать AI operation=ideal_resume:
     - ожидаем JSON: ideal_resume_text + metadata (keywords_used, structure, assumptions)
  4) Сохранить IdealResume (и/или AIResult с operation=ideal_resume)
  5) Вернуть ideal_resume_text + metadata + cache_hit

---

## 5) API Endpoints Stage 2 (для Swagger)
- [ ] POST `/v1/resumes/adapt`
  request:
  {
    "resume_text": "...",            # или resume_id
    "vacancy_text": "...",           # или vacancy_id
    "selected_checkbox_ids": ["..."],
    "base_version_id": "uuid|null",
    "options": { "language": "ru|en", "template": "default|harvard" }
  }
  response:
  {
    "version_id": "uuid",
    "parent_version_id": "uuid|null",
    "updated_resume_text": "...",
    "change_log": [...],
    "safety_notes": [...],
    "cache_hit": true|false
  }

- [ ] POST `/v1/resumes/ideal`
  request:
  {
    "vacancy_text": "...",           # или vacancy_id
    "options": { "language": "ru|en", "template": "default|harvard", "seniority": "junior|middle|senior|any" }
  }
  response:
  {
    "ideal_resume_text": "...",
    "metadata": {...},
    "cache_hit": true|false
  }

- [ ] (опционально) GET `/v1/resumes/{resume_id}/versions`
- [ ] (опционально) GET `/v1/resumes/versions/{version_id}`

---

## 6) Требования к качеству результата (Definition of Done)
- [ ] Операция adapt_resume создаёт новую версию и сохраняет change_log.
- [ ] Операция ideal_resume создаёт идеальный текст и кешируется по vacancy_hash/parsed_vacancy_hash.
- [ ] Повторные запросы с теми же входами → cache_hit=true без вызова LLM.
- [ ] Ответ LLM валидируется (json.loads -> validate_json fallback).
- [ ] Нельзя “выдумывать факты”: safety_notes должен заполняться, если выбранные пункты невозможно применить честно.
