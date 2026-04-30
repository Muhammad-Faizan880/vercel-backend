import OpenAI from "openai";
import { AI_CONFIG } from "../config/aiConfig.js";

const getOpenAI = () => {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
};

export const generateAIResponse = async ({ message, user }) => {
  const openai = getOpenAI();

  const systemPrompt = `
${AI_CONFIG.systemPrompt}
User name: ${user?.name || "Guest"}
`;

  const modelsToTry = [
    AI_CONFIG.models.primary,
    AI_CONFIG.models.fallback,
  ];

  let response;

  for (const model of modelsToTry) {
    try {
      response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });
      break;
    } catch (err) {
  console.log("❌ MODEL:", model);
  console.log("❌ STATUS:", err.status);
  console.log("❌ GROQ RESPONSE:", err.response?.data);
  console.log("❌ FULL ERROR:", err);

  throw err; // 👈 IMPORTANT (custom error mat hide karo)
}
  }

  if (!response) {
    throw new Error("All AI models failed");
  }

  return response.choices[0].message.content;
};