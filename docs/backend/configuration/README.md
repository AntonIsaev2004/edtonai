# Configuration

Документация по конфигурации приложения.

## Содержание

- [Overview](#overview)
- [Settings Class](#settings-class)
- [Environment Variables](#environment-variables)
- [Database URL](#database-url)
- [Files](#files)

## Overview

Приложение использует **Pydantic Settings** для управления конфигурацией:

- Все настройки читаются из `.env` файла
- Типизация и валидация значений
- Computed properties для составных значений
- Никаких hardcoded констант в коде

## Settings Class

### Файл

`backend/core/config.py`

### Структура

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # Database
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str
    postgres_port: int
    
    # AI
    deepseek_api_key: str
    deepseek_base_url: str
    ai_model: str
    ai_timeout_seconds: int
    ai_max_retries: int
    ai_temperature: float
    ai_max_tokens: int
    
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
```

### Singleton Pattern

```python
# Global instance
settings = Settings()
```

Использование:

```python
from backend.core.config import settings

# Access any setting
print(settings.ai_model)
print(settings.database_url)
```

## Environment Variables

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `POSTGRES_USER` | str | PostgreSQL username |
| `POSTGRES_PASSWORD` | str | PostgreSQL password |
| `POSTGRES_DB` | str | Database name |
| `DEEPSEEK_API_KEY` | str | DeepSeek API key |

### Optional Variables (have defaults)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `POSTGRES_HOST` | str | `db` | Database host |
| `POSTGRES_PORT` | int | `5432` | Database port |
| `DEEPSEEK_BASE_URL` | str | `https://api.deepseek.com/v1` | DeepSeek API base URL |
| `AI_MODEL` | str | `deepseek-chat` | LLM model name |
| `AI_TIMEOUT_SECONDS` | int | `120` | Base timeout (read timeout per chunk = 60s) |
| `AI_MAX_RETRIES` | int | `3` | Number of retries on network errors |
| `AI_TEMPERATURE` | float | `0.0` | LLM temperature |
| `AI_MAX_TOKENS` | int | `4096` | Max output tokens |

## Database URL

### Computed Property

URL для подключения к PostgreSQL формируется динамически:

```python
@property
def database_url(self) -> str:
    return (
        f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
        f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    )
```

### Пример

```env
POSTGRES_USER=appuser
POSTGRES_PASSWORD=secret123
POSTGRES_DB=resume_adapter
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

Результат:
```
postgresql+asyncpg://appuser:secret123@db:5432/resume_adapter
```

### Зачем отдельные переменные?

**Безопасность**: `docker-compose.yml` может использовать те же переменные:

```yaml
services:
  db:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
```

Это гарантирует:
- Одни credentials для БД и приложения
- Не нужно дублировать пароли
- Централизованное управление секретами

## Files

### .env (development)

Создайте из `.env.example`:

```bash
cp .env.example .env
# Edit .env with your values
```

### .env.example

```env
# ============================================
# DATABASE
# ============================================
POSTGRES_USER=resume_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=resume_adapter_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

# ============================================
# AI PROVIDER (DeepSeek)
# ============================================
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_TIMEOUT_SECONDS=60
AI_MAX_RETRIES=1
AI_TEMPERATURE=0.0
AI_MAX_TOKENS=4096
```

### Docker vs Local

| Environment | `POSTGRES_HOST` |
|-------------|-----------------|
| Docker Compose | `db` (service name) |
| Local development | `localhost` |

При локальной разработке без Docker:

```env
POSTGRES_HOST=localhost
```

## Adding New Settings

1. Добавьте переменную в `.env`:
   ```env
   MY_NEW_SETTING=value
   ```

2. Добавьте в Settings class:
   ```python
   class Settings(BaseSettings):
       my_new_setting: str  # имя в snake_case
   ```

3. Обновите `.env.example` с документацией

4. Используйте:
   ```python
   from backend.core.config import settings
   print(settings.my_new_setting)
   ```

## Validation

Pydantic автоматически валидирует:

- **Типы**: `int`, `float`, `str`, `bool`
- **Required**: отсутствие обязательной переменной = ошибка при старте
- **Format**: некорректный тип (строка вместо int) = ошибка

```python
# При старте приложения с ошибкой в .env:
# POSTGRES_PORT=not_a_number

# pydantic_core._pydantic_core.ValidationError:
# 1 validation error for Settings
# postgres_port
#   Input should be a valid integer, unable to parse string as an integer
```
