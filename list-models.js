import dotenv from "dotenv";
dotenv.config();

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function listModels() {
  try {
    const models = await client.models.list();
    console.log("=== AVAILABLE MODELS ===");
    console.log(models);
  } catch (err) {
    console.error("MODEL LIST ERROR:", err);
  }
}

listModels();