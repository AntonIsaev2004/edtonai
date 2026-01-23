# Stage 3 — Frontend (Web) Checklist для EdTon.ai
> Цель: реализовать фронтенд для прототипа адаптации резюме под вакансию (Stage 2), с упором на историю версий, сравнение/подсветку изменений и понятный workflow.  
> Ввод/вывод: **только текст** (resume_text, vacancy_text, output_resume_text). Файлы/парсинг на фронте пока не делаем.  
> Контекст: backend + DB уже в Docker.

---

## 0) Принципы и рамки
- [ ] **MVP-ориентированность**: без сложных интеграций, SSO, платежей, парсинга PDF/DOCX, WYSIWYG-редактора.
- [ ] **Единый UX-поток**: Вставил резюме → вставил вакансию → получил адаптацию → сравнил изменения → сохранил версию → можно вернуться/сравнить.
- [ ] **История версий — first-class**: версия = snapshot (входные тексты + результат + метаданные + дифф/статистика).
- [ ] **Безопасность**: санитизация при рендере подсветки/диффа, лимиты на размер текста, защита от XSS.
- [ ] **Деплой одной командой**: локально и на сервере поднимаем фронт+бек+бд через docker-compose.

---

## 1) Технологический стек и заготовки
### 1.1 Стек (фиксируем для MVP)
- [ ] React + TypeScript (Next.js или Vite — выбрать один и закрепить).
- [ ] UI kit — выбрать один и закрепить.
- [ ] API state: TanStack Query.
- [ ] Router: встроенный (Next) или React Router.
- [ ] Diff: библиотека для diff по словам/строкам (выбрать одну и закрепить).

### 1.2 Базовая структура проекта
- [ ] `src/api` (клиент, типы DTO, обработка ошибок)
- [ ] `src/pages` / `src/routes`
- [ ] `src/components`
- [ ] `src/features` (workspace, history, compare)
- [ ] `src/utils` (diff, sanitize, helpers)
- [ ] `src/styles` (theme)

### 1.3 Качество
- [ ] ESLint + Prettier + Husky (pre-commit).
- [ ] TypeScript strict.
- [ ] ErrorBoundary + единый обработчик ошибок API.

---

## 2) Экранная модель продукта (страницы/экраны)
### 2.1 Workspace (главный экран)
- [ ] Layout: 2–3 панели (резюме / вакансия / результат).
- [ ] Поля:
  - [ ] `ResumeTextArea` (textarea)
  - [ ] `VacancyTextArea` (textarea)
  - [ ] `ResultTextArea` (readonly textarea)
- [ ] Действия:
  - [ ] **Adapt resume** (stage2: адаптация резюме под вакансию)
  - [ ] **Generate ideal resume** (stage2: генерация идеального резюме по вакансии, без входного резюме)
  - [ ] **Save version** (сохранить snapshot)
  - [ ] **Compare** (выбрать версию и сравнить с текущим результатом)
  - [ ] Copy result (в буфер)
- [ ] Валидация:
  - [ ] резюме+вакансия обязательны для Adapt
  - [ ] вакансия обязательна для Ideal
  - [ ] лимиты размера (см. backend limits) + понятные сообщения
- [ ] UX:
  - [ ] индикатор выполнения (loading)
  - [ ] отмена запроса (AbortController)
  - [ ] автосохранение черновика в localStorage (resume_text, vacancy_text)

### 2.2 History (экран истории версий)
- [ ] Список версий:
  - [ ] timestamp
  - [ ] тип операции (adapt/ideal)
  - [ ] title/notes (если есть)
  - [ ] действия: View / Compare / Restore / Delete
- [ ] Просмотр версии:
  - [ ] входные тексты (resume может быть null для ideal)
  - [ ] vacancy
  - [ ] result
  - [ ] summary/статистика (если backend отдаёт)

### 2.3 Compare (экран сравнения)
- [ ] Сравнение A vs B:
  - [ ] side-by-side или inline diff (выбрать один режим и закрепить)
  - [ ] переключение granularity: line/word
  - [ ] “показывать только изменения”
- [ ] Copy:
  - [ ] Copy full after-text
  - [ ] (опционально) Copy only changes

---

## 3) Компоненты и UI-блоки
### 3.1 Основные
- [ ] `TextAreaWithCounter` (символы, лимиты, autosize)
- [ ] `ActionBar` (кнопки, статус)
- [ ] `ResultPanel` (readonly + copy + save)
- [ ] `VersionList` + `VersionItem`
- [ ] `DiffViewer`
- [ ] `Toast/Notifications`
- [ ] `ConfirmDialog`

### 3.2 Подсветка изменений (ключевая фича)
- [ ] Diff считается для:
  - [ ] исходное резюме (before) vs результат (after) после Adapt
  - [ ] версия A vs версия B (result_text)
- [ ] Правила подсветки:
  - [ ] add (вставки)
  - [ ] remove (удаления)
  - [ ] replace (комбинация remove+add)
- [ ] Санитизация/безопасность:
  - [ ] никогда не рендерить пользовательский HTML без sanitize
  - [ ] при больших текстах ограничивать diff (лимит символов / предупреждение)

---

## 4) API интеграция (frontend ↔ backend)
> Минимально необходимые методы. Если часть уже есть — адаптировать.

### 4.1 Stage 2 операции
- [ ] `POST /api/v1/resume/adapt`
  - input: `{ resume_text: string, vacancy_text: string, options?: {...} }`
  - output: `{ result_text: string, change_summary?: string, tokens?: {...} }`

- [ ] `POST /api/v1/resume/ideal`
  - input: `{ vacancy_text: string, options?: {...} }`
  - output: `{ result_text: string, change_summary?: string }`

### 4.2 Дополнительные методы backend для фронта (история версий)
- [ ] `POST /api/v1/versions`
  - input:
    ```json
    {
      "type": "adapt|ideal",
      "resume_text": "string|null",
      "vacancy_text": "string",
      "result_text": "string",
      "meta": { "title": "string?", "notes": "string?" }
    }
    ```
  - output: `{ id: string, created_at: string }`

- [ ] `GET /api/v1/versions?limit=50&offset=0`
  - output: список (id, created_at, type, title, короткие превью)

- [ ] `GET /api/v1/versions/{id}`
  - output: полная версия (все тексты + meta)

- [ ] `DELETE /api/v1/versions/{id}`

### 4.3 Методы для качества UX (обязательные для прототипа)
- [ ] `GET /api/v1/health` → `{ status: "ok", db: "ok" }`
- [ ] `GET /api/v1/limits` → `{ max_chars_resume, max_chars_vacancy, max_chars_result }`

### 4.4 Diff как API (опционально, только если решено делать diff на backend)
- [ ] `POST /api/v1/diff`
  - input: `{ before_text: string, after_text: string, granularity: "line|word" }`
  - output:
    ```json
    { "segments": [{ "type": "equal|add|remove", "text": "..." }], "stats": { "added": 0, "removed": 0 } }
    ```

---

## 5) Модели данных (DTO) для фронта
- [ ] `AdaptRequest`, `AdaptResponse`
- [ ] `IdealRequest`, `IdealResponse`
- [ ] `VersionItem`, `VersionDetail`
- [ ] `LimitsResponse`, `HealthResponse`
- [ ] `ApiError` (единый формат)

---

## 6) Сценарии пользователя (flows)
### 6.1 Adapt
- [ ] Вставить резюме → вставить вакансию → Adapt → получить результат
- [ ] Показать подсветку изменений (before=resume_text, after=result_text)
- [ ] Save version → версия появляется в History

### 6.2 Ideal
- [ ] Вставить вакансию → Ideal → получить результат
- [ ] Save version → сравнение идеалов между собой

### 6.3 History/Compare
- [ ] View version → просмотр входов/выхода
- [ ] Compare current vs selected version
- [ ] Restore → перенести тексты версии в Workspace

---

## 7) Ошибки и UX-устойчивость
- [ ] Пустой History: CTA “Сохраните первую версию”.
- [ ] Обработка ошибок API:
  - [ ] validation error → подсказка пользователю
  - [ ] payload too large → подсказка по лимитам (из /limits)
  - [ ] rate limit → retry/backoff
- [ ] Долгие запросы:
  - [ ] loading + cancel

---

## 8) Тестирование
- [ ] Unit: diff utils, валидаторы лимитов, мапперы DTO
- [ ] E2E smoke: adapt, ideal, save version, history, compare, restore, delete

---

## 9) Deployment и запуск (обязательно, т.к. backend+DB уже в Docker)
> Требование: фронт добавляется к текущей docker-инфраструктуре так, чтобы всё поднималось одной командой.

### 9.1 Dockerfile для фронта (фиксируем подход)
- [ ] Добавить `Dockerfile` для фронтенда:
  - [ ] build (node) → сборка production артефактов
  - [ ] runtime (nginx) → раздача статики
- [ ] В nginx конфиге фронта:
  - [ ] проксировать `/api/*` на backend service внутри docker network
  - [ ] увеличить таймауты для долгих операций (адаптация/генерация)

### 9.2 docker-compose интеграция
- [ ] Обновить существующий `docker-compose.yml`:
  - [ ] добавить сервис `frontend`
  - [ ] все сервисы (frontend, backend, db) в одной сети
  - [ ] наружу публикуется только фронт (80/443); backend и db наружу не публиковать (для прототипа можно открыть backend только в dev)
- [ ] Настроить зависимости и healthchecks:
  - [ ] db healthcheck
  - [ ] backend healthcheck через `/api/v1/health`
  - [ ] backend зависит от db
  - [ ] frontend зависит от backend

### 9.3 Переменные окружения и конфигурация
- [ ] Ввести `.env` для compose (dev) и `.env.prod` (prod) с:
  - [ ] backend DB настройки (host=db и т.д.)
  - [ ] CORS (если нужен; в целевой схеме API ходит через фронтовый nginx на том же домене → CORS не требуется)
- [ ] Зафиксировать базовый API путь на фронте: все запросы идут на `/api/...` (без хардкода хоста).

### 9.4 Критерий готовности деплоя
- [ ] `docker compose up -d` поднимает frontend+backend+db
- [ ] UI доступен в браузере, операции Adapt/Ideal работают
- [ ] История версий работает (create/list/get/delete)
- [ ] `/api/v1/health` и `/api/v1/limits` доступны через фронт по `/api/...`

---

## 10) Definition of Done (Stage 3)
- [ ] Вставка резюме и вакансии текстом → адаптация работает.
- [ ] Генерация идеального резюме по вакансии работает.
- [ ] Результат показывается текстом, есть Copy.
- [ ] Подсветка изменений работает стабильно.
- [ ] История версий: сохранить → список → просмотр → сравнение → восстановление → удалить.
- [ ] Понятные ошибки и лимиты.
- [ ] Деплой одной командой через docker-compose (фронт добавлен к существующим backend+db в Docker).

---
