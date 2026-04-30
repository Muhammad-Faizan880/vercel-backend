export const AI_CONFIG = {
  provider: "groq",

 models: {
    primary: "llama-3.1-8b-instant",
    fallback: "llama-3.3-70b-versatile",
  },

  systemPrompt: "You are a helpful AI assistant",
};