import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { diet, people, variety, allergies, prefs } = req.body || {};

    const prompt = `
Генерирай седмично меню на български за ${people || 2} човека.
Диета: ${diet || 'balanced'}.
Стил: ${variety || 'mixed'}.
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const text = await response.text();

    let clean = text
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

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}