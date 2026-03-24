# 🍽️ Menu Planner - Backend Setup

## Инструкции за стартиране

### 1️⃣ Инсталирай зависимостите
```bash
npm install
```

### 2️⃣ Конфигурирай API ключа

Създай файл `.env` в същата директория като `server.js`:

```bash
# Избор 1: OpenAI API (препоръчано)
OPENAI_API_KEY=sk-your-actual-api-key-here

# Или Избор 2: GitHub Copilot (ако е налично)
# GITHUB_TOKEN=your_github_token_here

PORT=3000
```

**Как да получиш API ключ:**
- 🔑 **OpenAI**: https://platform.openai.com/account/api-keys
- 🔑 **GitHub**: https://github.com/settings/tokens

### 3️⃣ Стартирай сървъра
```bash
# Production
npm start

# Разработка (с автоматично рестартиране)
npm run dev
```

✅ **Резултат:** `🚀 Сървърът работи на http://localhost:3000`

### 4️⃣ Отвори приложението

Отвори в браузъра: **http://localhost:3000**

---

## 📡 API Endpoints

### `POST /api/generate-menu`
Генерира седмично меню

**Параметри:**
```json
{
  "diet": "обикновена",
  "people": "2",
  "variety": "балансирано",
  "allergies": "(опционално)",
  "prefs": "(опционално)"
}
```

**Отговор:**
```json
{
  "days": [
    {
      "day": "Понеделник",
      "breakfast": {"name": "...", "desc": "..."},
      "lunch": {"name": "...", "desc": "..."},
      "dinner": {"name": "...", "desc": "..."}
    }
    // ... 7 дни
  ],
  "shopping": {
    "Зеленчуци и плодове": ["..."],
    // ... други категории
  }
}
```

### `GET /api/health`
Проверка на здравето на сървъра

**Отговор:**
```json
{
  "status": "OK",
  "message": "Сървърът е активен"
}
```

---

## 🔧 Файлова структура

```
📁 menu_planner/
├── 📄 menu_planner.html       # Frontend (вече актуализиран)
├── 📄 server.js               # Backend (Express)
├── 📄 package.json            # Зависимости
├── 📄 .env                    # API ключ (не commitвай!)
├── 📄 .env.example            # Пример на .env
└── 📄 README.md               # Това файло
```

---

## 🚀 Production (Опционално)

Ако искаш да деплойваш сървъра:

### Вариант 1: Heroku
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Вариант 2: DigitalOcean / AWS / другo
1. Копирай файлове на сървъра
2. Инсталирай Node.js
3. Стартирай `npm install && npm start`
4. Използвай PM2 за production:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "menu-planner"
   ```

---

## ⚠️ Важно

- **НЕ** commitвай `.env` файла с реални API ключове
- Пази своя API ключ в тайна
- OpenAI API е платена услуга (pay-as-you-go)
- GitHub Copilot API все още е ограничен достъп

---

## 🐛 Troubleshooting

**Грешка: "Cannot find module 'express'"**
→ Стартирай `npm install`

**Грешка: "ECONNREFUSED localhost:3000"**
→ Сървърът не е активен. Стартирай `npm start`

**Грешка: "401 Unauthorized"**
→ API ключът е невалиден. Провери `.env` файла

**Грешка: "CORS error"**
→ Проверка дали используеш правилния localhost порт

---

## 📝 Лиценция
MIT
