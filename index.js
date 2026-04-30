import dotenv from "dotenv";
dotenv.config(); // MUST be first

import express from "express";
import cors from "cors";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

import { connectDB } from "./config/db.js";

const app = express();

// 🔍 DEBUG (temporary)
console.log("OPENAI KEY:", process.env.OPENAI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static("uploads"));

// DB
connectDB(process.env.MONGO_URI);

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/cart", cartRoutes);


app.use("/api/payments", paymentRoutes);



// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});