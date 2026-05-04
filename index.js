import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

import { connectDB } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 🔍 Debug
console.log("OPENAI KEY exists:", !!process.env.OPENAI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for local development only)
if (process.env.NODE_ENV !== 'production') {
  app.use("/uploads", express.static("uploads"));
}

// Connect to MongoDB (only if URI exists)
if (process.env.MONGO_URI) {
  connectDB(process.env.MONGO_URI);
} else {
  console.warn("⚠️ MONGO_URI not found in environment variables");
}

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Backend is running on Vercel!" });
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payments", paymentRoutes);

// ✅ THIS IS THE KEY CHANGE - Export for Vercel (no app.listen)
export default app;

// ⚠️ For local development only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}