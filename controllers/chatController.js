import jwt from "jsonwebtoken";
import { generateAIResponse } from "../services/aiService.js";

export const chatHandler = async (req, res) => {
  try {
    const { message, token } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log("Invalid token");
        user = null;
      }
    }

    const reply = await generateAIResponse({ message, user });

    res.json({ reply });

  } catch (error) {
    console.log("ERROR:", error);

    res.status(500).json({
      error: error.message || "Something went wrong",
    });
  }
};