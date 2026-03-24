// Vercel serverless function for /api/generate
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt } = req.body;
    const data = await callAnthropic(prompt);

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || "";
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function callAnthropic(prompt) {
  const SYSTEM_PROMPT = `Ти си асистент за планиране на седмично меню. Върни САМО валиден JSON в този формат:
{
  "days": [
    {
      "name": "Понеделник",
      "meals": [
        "Закуска: ...",
        "Обяд: ...",
        "Вечеря: ..."
      ]
    }
  ]
}
ВАЖНО: Не добавяй никакви обяснения, коментари, текст преди или след JSON-а. Започни и завърши отговора си само с { и }. Ако не можеш да генерираш меню, върни празен валиден JSON в същия формат.`;
  const ANTHROPIC_API_KEY = "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";
  const body = {
    model: "claude-sonnet-4-6",
    system: SYSTEM_PROMPT,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Anthropic API error: " + errorText);
  }
  return await response.json();
}
