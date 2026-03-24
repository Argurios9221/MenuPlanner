const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

async function callClaude(model, prompt) {
  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

app.post('/api/generate-menu', async (req, res) => {
  try {
    const { diet, people, variety, allergies, prefs } = req.body;

    const prompt = `
Генерирай седмично меню на български за ${people} човека.
Диета: ${diet}.
Стил: ${variety}.
${allergies ? 'Алергии: ' + allergies + '.' : ''}
${prefs ? 'Предпочитания: ' + prefs + '.' : ''}

Върни САМО валиден JSON в следния формат:

{
  "days": [
    {
      "day": "Понеделник",
      "breakfast": { "name": "...", "desc": "..." },
      "lunch": { "name": "...", "desc": "..." },
      "dinner": { "name": "...", "desc": "..." }
    }
  ],
  "shopping": {
    "Зеленчуци и плодове": ["..."],
    "Месо и риба": ["..."],
    "Млечни": ["..."],
    "Хляб и зърнени": ["..."],
    "Консерви и подправки": ["..."],
    "Друго": []
  }
}

Описанията (desc) да са до 5 думи.
Попълни всичките 7 дни.
`;

    let result = await callClaude("claude-sonnet-4-6", prompt);

    if (!result.ok) {
      console.log("Sonnet 4.6 не е достъпен → fallback към Haiku 4.5");
      result = await callClaude("claude-haiku-4-5-20251001", prompt);
    }

    if (!result.ok) {
      return res.status(500).json({
        error: "API грешка",
        details: result.text
      });
    }

    let clean = result.text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Невалиден JSON отговор");
    }

    res.json(parsed);

  } catch (error) {
    console.error("Грешка при генериране:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Сървърът работи' });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/menu_planner.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Сървърът работи на http://localhost:${PORT}`);
});