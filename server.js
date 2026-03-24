const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Статични файлове
app.use(express.static(__dirname));

/**
 * POST /api/generate-menu
 * Генерира седмично меню чрез Copilot
 */
app.post('/api/generate-menu', async (req, res) => {
  try {
    const { diet, people, variety, allergies, prefs } = req.body;

    // Проверка на входните данни
    if (!diet || !people || !variety) {
      return res.status(400).json({ error: 'Липсват задължени параметри' });
    }

    // Промпт на български
    const prompt = `Генерирай седмично меню на БЪЛГАРСКИ за ${people} човека. Диета: ${diet}. Стил: ${variety}.${allergies ? ' Без: ' + allergies + '.' : ''}${prefs ? ' Предпочитания: ' + prefs + '.' : ''}

Върни САМО валиден JSON без никакъв друг текст. Описанията (desc) да са до 5 думи.

{"days":[{"day":"Понеделник","breakfast":{"name":"...","desc":"..."},"lunch":{"name":"...","desc":"..."},"dinner":{"name":"...","desc":"..."}},...всичките 7 дни],"shopping":{"Зеленчуци и плодове":["..."],"Месо и риба":["..."],"Млечни":["..."],"Хляб и зърнени":["..."],"Консерви и подправки":["..."],"Друго":[]}}

Попълни всичките 7 дни: Понеделник, Вторник, Сряда, Четвъртък, Петък, Събота, Неделя.`;

    // Groq API - 100% БЕЗПЛАТНО (без платежна карта)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    // Fallback към Claude ако Groq не работи
    if (!response.ok && process.env.ANTHROPIC_API_KEY) {
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (claudeResponse.ok) {
        const claudeData = await claudeResponse.json();
        let text = '';
        if (claudeData.content && claudeData.content[0]) {
          text = claudeData.content[0].text || '';
        }
        
        const clean = text.replace(/```json\n?|```/g, '').trim();
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch (jsonErr) {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error('Невалиден JSON отговор');
        }
        res.json(parsed);
        return;
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API грешка');
    }

    const data = await response.json();
    
    // Екстракция на текста (Groq използва OpenAI формат)
    let text = '';
    if (data.choices && data.choices[0]) {
      text = data.choices[0].message?.content || data.choices[0].text || '';
    }

    // Парсване на JSON
    const clean = text.replace(/```json\n?|```/g, '').trim();
    let parsed;
    
    try {
      parsed = JSON.parse(clean);
    } catch (jsonErr) {
      // Fallback: опит да се намери JSON в отговора
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Невалиден JSON отговор');
      }
    }

    res.json(parsed);
  } catch (error) {
    console.error('Грешка при генериране на меню:', error);
    res.status(500).json({ 
      error: error.message || 'Грешка при генериране на меню' 
    });
  }
});

/**
 * GET /api/health
 * Проверка на здравето на сървъра
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Сървърът е активен' });
});

/**
 * GET /
 * Служба на главната страница (menu_planner.html)
 */
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/menu_planner.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Сървърът работи на http://localhost:${PORT}`);
  console.log('📝 Генератор на менюта е активен');
});
