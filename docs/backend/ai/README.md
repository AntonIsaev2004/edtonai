# AI Integration

Документация по интеграции с LLM-провайдерами.

## Содержание

- [Architecture](#architecture)
- [DeepSeek Provider](#deepseek-provider)
- [Prompts](#prompts)
- [JSON Validation](#json-validation)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Services                                 │
│  (ResumeService, VacancyService, MatchService)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ generate_json(prompt)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AIProvider (ABC)                            │
│                                                                 │
│  @abstractmethod                                                │
│  async def generate_json(prompt, prompt_name) -> dict           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ implements
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DeepSeekProvider                             │
│                                                                 │
│  • HTTP client (httpx) with streaming                           │
│  • SYSTEM_PROMPT injection                                      │
│  • SSE streaming (Server-Sent Events)                           │
│  • JSON parsing + validation                                    │
│  • Retry logic                                                  │
│  • Logging                                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ POST /chat/completions (stream=true)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DeepSeek API                                │
│                                                                 │
│  https://api.deepseek.com/v1/chat/completions                  │
└─────────────────────────────────────────────────────────────────┘
```

## DeepSeek Provider

### Файл

`backend/ai/deepseek.py`

### Конфигурация

Все параметры читаются из `settings`:

| Setting | Description | Default |
|---------|-------------|---------|
| `DEEPSEEK_API_KEY` | API ключ | required |
| `DEEPSEEK_BASE_URL` | Base URL | `https://api.deepseek.com/v1` |
| `AI_MODEL` | Модель | `deepseek-chat` |
| `AI_TIMEOUT_SECONDS` | Базовый таймаут (read timeout = 60s per chunk) | 120 |
| `AI_MAX_RETRIES` | Количество ретраев | 3 |
| `AI_TEMPERATURE` | Температура | 0.0 |
| `AI_MAX_TOKENS` | Max tokens | 4096 |

### Метод `generate_json()`

```python
async def generate_json(
    self,
    prompt: str,
    prompt_name: Optional[str] = None
) -> dict[str, Any]:
```

#### Flow

```
generate_json(prompt, prompt_name)
│
├── 1. Compute input_hash (для логирования)
│
├── 2. _call_model(prompt)
│       │
│       ├── Build payload:
│       │     {
│       │       "model": settings.ai_model,
│       │       "messages": [...],
│       │       "temperature": settings.ai_temperature,
│       │       "max_tokens": settings.ai_max_tokens,
│       │       "stream": true  ← SSE streaming enabled
│       │     }
│       │
│       ├── _stream_response() with retry
│       │     │
│       │     ├── Open SSE stream
│       │     ├── Read chunks: "data: {...}"
│       │     ├── Extract delta.content from each chunk
│       │     ├── Accumulate until "data: [DONE]"
│       │     └── Return concatenated content
│       │
│       └── Return (raw_output, latency_ms)
│
├── 3. _parse_or_validate(raw_output)
│       │
│       ├── Try json.loads()
│       │     │
│       │     ├── Success → return parsed
│       │     │
│       │     └── Fail → _validate_with_model()
│       │                   │
│       │                   ├── Call LLM with VALIDATE_JSON_PROMPT
│       │                   │
│       │                   ├── Try json.loads() again
│       │                   │     │
│       │                   │     ├── Success → return parsed
│       │                   │     │
│       │                   │     └── Fail → AIResponseFormatError
│       │                   │
│       │                   └── Request failed → AIResponseFormatError
│
└── 4. Log success/failure with metrics
```

### Streaming (SSE)

DeepSeek API поддерживает Server-Sent Events для потоковой передачи ответа.

**Почему streaming:**
- При `stream: false` DeepSeek генерирует весь ответ, затем отправляет — соединение простаивает
- Keep-alive timeout (~30 сек) может разорвать соединение до завершения генерации
- При `stream: true` каждый токен отправляется сразу — соединение постоянно активно

**Формат SSE:**
```
data: {"choices":[{"delta":{"content":"{"}}]}
data: {"choices":[{"delta":{"content":"\"score\""}}]}
...
data: [DONE]
```

**Реализация:**
```python
async def _stream_response(self, client, headers, payload) -> str:
    content_parts: list[str] = []
    
    async with client.stream("POST", url, headers=headers, json=payload) as response:
        response.raise_for_status()
        
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                chunk = json.loads(data_str)
                delta = chunk["choices"][0].get("delta", {})
                if "content" in delta:
                    content_parts.append(delta["content"])
    
    return "".join(content_parts)
```

### Retry Logic

```python
for attempt in range(self.max_retries + 1):
    try:
        content = await self._stream_response(client, headers, payload)
        return content, latency_ms
    except (TimeoutException, TransportError, HTTPStatusError, RemoteProtocolError):
        logger.warning("ai_request_retry | attempt=%d/%d error=%s", ...)
        if attempt < self.max_retries:
            continue
        raise AIRequestError(...)
```

Ретраи на:
- `httpx.TimeoutException` — таймаут соединения/чтения
- `httpx.TransportError` — сетевые ошибки
- `httpx.HTTPStatusError` — HTTP 5xx ошибки
- `httpx.RemoteProtocolError` — peer closed connection (chunked read interrupted)

**НЕ** ретраятся:
- Невалидный JSON от LLM (используется validation fallback)
- 401/403 (auth errors)

### Timeouts

```python
timeout = httpx.Timeout(
    connect=30.0,   # Время на установку соединения (увеличено для медленных сетей)
    read=60.0,      # Время ожидания каждого chunk'а (не общее!)
    write=30.0,     # Время на отправку запроса
    pool=30.0,      # Время ожидания свободного соединения в пуле
)
```

**Важно:** `read=60.0` — это таймаут на **каждый chunk**, не на весь ответ. При streaming каждый токен приходит отдельно, поэтому общее время может быть неограниченным.

## Prompts

### Файл

`backend/prompts.py`

### SYSTEM_PROMPT

Глобальный системный промпт для всех операций:

```
Ты — AI-модуль, встроенный в backend веб-сервиса.
Ты работаешь как часть программной системы, а не как чат.
Ты ОБЯЗАН возвращать ТОЛЬКО валидный JSON, без пояснений, без markdown.
Структура JSON должна СТРОГО соответствовать описанию в запросе.
Если данные отсутствуют — используй null или пустые списки.
Запрещено выдумывать факты, опыт, технологии, даты, компании.
```

### Операционные промпты

| Constant | Operation | Description |
|----------|-----------|-------------|
| `PARSE_RESUME_PROMPT` | parse_resume | Структурирование резюме |
| `PARSE_VACANCY_PROMPT` | parse_vacancy | Структурирование вакансии |
| `ANALYZE_MATCH_PROMPT` | analyze_match | Анализ соответствия |
| `VALIDATE_JSON_PROMPT` | (validation) | Исправление невалидного JSON |

### Template Variables

Промпты содержат плейсхолдеры:

| Placeholder | Prompt | Replaced with |
|-------------|--------|---------------|
| `{{RESUME_TEXT}}` | PARSE_RESUME | Текст резюме |
| `{{VACANCY_TEXT}}` | PARSE_VACANCY | Текст вакансии |
| `{{PARSED_RESUME_JSON}}` | ANALYZE_MATCH | JSON резюме |
| `{{PARSED_VACANCY_JSON}}` | ANALYZE_MATCH | JSON вакансии |
| `{{RAW_MODEL_OUTPUT}}` | VALIDATE_JSON | Невалидный output |

## JSON Validation

### Проблема

LLM иногда возвращает:
- JSON с комментариями
- JSON с markdown-оформлением (```json ... ```)
- Невалидный JSON с лишними запятыми

### Решение: Validation Fallback

```python
async def _parse_or_validate(self, raw_output: str) -> dict:
    # 1. Try direct parse
    try:
        return json.loads(raw_output)
    except json.JSONDecodeError:
        pass
    
    # 2. Try validation via LLM
    validated = await self._validate_with_model(raw_output)
    if validated:
        try:
            return json.loads(validated)
        except json.JSONDecodeError:
            pass
    
    # 3. Give up
    raise AIResponseFormatError("Cannot parse LLM output as JSON")
```

`VALIDATE_JSON_PROMPT` просит LLM:
- Удалить лишний текст
- Исправить синтаксические ошибки
- Вернуть только JSON

## Error Handling

### Exceptions

| Exception | Cause | HTTP Code |
|-----------|-------|-----------|
| `AIRequestError` | Network/timeout/HTTP error | 502 |
| `AIResponseFormatError` | Invalid JSON after validation | 502 |

### Usage in Routes

```python
@router.post("/parse")
async def parse_resume(request: ResumeParseRequest, db: AsyncSession = Depends(get_db)):
    service = ResumeService(db)
    try:
        result = await service.parse_and_cache(request.resume_text)
    except AIError as e:
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")
    return result
```

## Configuration

### Environment Variables

```env
# Required
DEEPSEEK_API_KEY=sk-...

# Optional (have defaults in .env.example)
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_TIMEOUT_SECONDS=120
AI_MAX_RETRIES=3
AI_TEMPERATURE=0.0
AI_MAX_TOKENS=4096
```

### Settings Class

```python
# backend/core/config.py

class Settings(BaseSettings):
    deepseek_api_key: str
    deepseek_base_url: str
    ai_model: str
    ai_timeout_seconds: int
    ai_max_retries: int
    ai_temperature: float
    ai_max_tokens: int
```

## Logging

Каждый вызов LLM логируется:

```
INFO | ai_call_success | prompt_name=parse_resume model=deepseek-chat provider=deepseek input_hash=abc123... latency_ms=2341

WARNING | ai_request_retry | attempt=1/4 error=peer closed connection...

ERROR | ai_call_failed | prompt_name=parse_resume model=deepseek-chat input_hash=abc123... error=DeepSeek request failed...
```

Метрики:
- `prompt_name` — тип операции
- `model` — используемая модель
- `provider` — провайдер (deepseek)
- `input_hash` — хэш входных данных
- `latency_ms` — время ответа
- `attempt` — номер попытки при retry
