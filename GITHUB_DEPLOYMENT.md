# 📖 Инструкция по запушу проекта на GitHub

## Шаг 1: Создай репозиторий на GitHub

1. Перейди на https://github.com/new
2. Создай новый репозиторий с именем `edtonai`
3. **НЕ инициализируй** README, .gitignore или лицензию (проект уже инициализирован локально)

## Шаг 2: Настрой локальный репозиторий

```bash
cd /Users/antonisaev/edtonai

# Проверь текущий статус
git status

# Если ещё не инициализирован:
# git init

# Посмотри существующий origin
git remote -v
```

## Шаг 3: Добавь remote и запусти push

```bash
# Замени USERNAME на свой GitHub username
git remote set-url origin https://github.com/USERNAME/edtonai.git

# Или если это первая настройка:
git remote add origin https://github.com/USERNAME/edtonai.git

# Проверь
git remote -v

# Добавь все файлы
git add .

# Коммит
git commit -m "Initial commit: EdtonAI - Resume Adapter Service

- Backend: FastAPI with PostgreSQL and DeepSeek AI integration
- Frontend: React + TypeScript with Tailwind CSS
- Docker Compose for full-stack deployment
- Resume parsing, analysis, and adaptation features
- Version history and comparison tools"

# Переименуй ветку в main (если нужно)
git branch -M main

# Запусти на GitHub
git push -u origin main
```

## Шаг 4: Защити .env

Убедись, что `.env` файл в `.gitignore`:

```bash
# Проверь
git ls-files | grep ".env"

# Не должно быть вывода (если .env не заккомичен)
```

## Альтернативно: Используй SSH (если настроено)

```bash
git remote set-url origin git@github.com:USERNAME/edtonai.git
git push -u origin main
```

## Что будет запушено

- ✅ Весь код frontend и backend
- ✅ Docker и docker-compose конфиг
- ✅ Документация в `/docs`
- ✅ `.env.example` (для примера)
- ❌ `.env` с реальными секретами
- ❌ `node_modules` и `__pycache__`

## После первого push

```bash
# Проверь на GitHub
git log --oneline

# Для следующих коммитов просто:
git add .
git commit -m "your message"
git push
```

## Если что-то пошло не так

```bash
# Посмотри что готово к коммиту
git status

# Отменить добавление файла
git restore --staged filename

# Отменить все локальные изменения
git reset --hard

# Посмотри историю
git log --oneline
```

---

**Готово!** Проект теперь на GitHub с полной историей и документацией. 🚀
