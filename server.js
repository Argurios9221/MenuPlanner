import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `
Ти си асистент за планиране на седмично меню.
Върни САМО валиден JSON в този формат:

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

Без обяснения, без текст извън JSON.
`;

async function callAnthropic(prompt) {
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
      "x-api-key": process.env.ANTHROPIC_API_KEY,
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

app.post("/api/generate", async (req, res) => {
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
});

app.listen(3000, () => {
  console.log("Локален сървър работи на http://localhost:3000");
});