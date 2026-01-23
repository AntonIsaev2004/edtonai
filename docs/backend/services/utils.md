# Utility Functions

Вспомогательные функции для сервисного слоя.

## Файл

`backend/services/utils.py`

## Функции

### `normalize_text(text: str) -> str`

Нормализует текст для детерминированного хэширования.

#### Операции

1. **Trim** — удаление пробелов в начале и конце
2. **Replace tabs** — табы → пробелы
3. **Collapse spaces** — множественные пробелы → один пробел
4. **Collapse newlines** — множественные переносы → два переноса
5. **Trim lines** — удаление пробелов в начале/конце каждой строки

#### Реализация

```python
def normalize_text(text: str) -> str:
    # Trim
    text = text.strip()
    
    # Replace tabs with spaces
    text = text.replace("\t", " ")
    
    # Collapse multiple spaces to single
    text = re.sub(r" +", " ", text)
    
    # Collapse multiple newlines to double
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    
    # Trim each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    
    return text
```

#### Примеры

| Input | Output |
|-------|--------|
| `"  hello  "` | `"hello"` |
| `"hello   world"` | `"hello world"` |
| `"line1\n\n\n\nline2"` | `"line1\n\nline2"` |
| `"  line1  \n  line2  "` | `"line1\nline2"` |

#### Почему важно

Нормализация гарантирует, что:
- `"hello world"` и `"hello  world"` дадут **одинаковый хэш**
- Незначимые различия в форматировании не создают дубликаты в кеше
- Кеширование работает эффективно

---

### `compute_hash(text: str) -> str`

Вычисляет SHA256 хэш нормализованного текста.

#### Реализация

```python
def compute_hash(text: str) -> str:
    normalized = normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
```

#### Возвращает

64-символьная hex-строка (SHA256).

#### Пример

```python
>>> compute_hash("Hello World")
'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'

>>> compute_hash("Hello  World")  # два пробела
'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'  # тот же хэш!
```

---

## Использование в сервисах

```python
from backend.services.utils import compute_hash

class ResumeService:
    async def parse_and_cache(self, resume_text: str):
        content_hash = compute_hash(resume_text)
        
        # Поиск в БД по хэшу
        resume = await self.resume_repo.get_by_hash(content_hash)
        
        # Поиск в кеше
        cached = await self.ai_result_repo.get("parse_resume", content_hash)
        ...
```

---

## Тестирование

```python
def test_normalize_text():
    assert normalize_text("  hello  ") == "hello"
    assert normalize_text("a  b") == "a b"
    assert normalize_text("a\n\n\nb") == "a\n\nb"

def test_compute_hash_deterministic():
    text1 = "Hello World"
    text2 = "Hello  World"  # extra space
    assert compute_hash(text1) == compute_hash(text2)

def test_compute_hash_different():
    assert compute_hash("Hello") != compute_hash("World")
```
