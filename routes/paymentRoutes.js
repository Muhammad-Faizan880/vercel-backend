import express from "express";
import Stripe from "stripe";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Variant from "../models/variant.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

console.log("=== Payment Routes Loading ===");
console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);

let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing in .env file");
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe initialized successfully");
} catch (error) {
  console.error("❌ Stripe initialization failed:", error.message);
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_fallbacksecretkey"); // Fallback to a test key to prevent crashes
}

// Create payment intent
router.post("/create-payment-intent", authMiddleware, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    console.log("=== Payment Route Hit ===");
    console.log("req.user:", req.user);
    
    // ✅ FIXED: Get user ID safely
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    
    console.log("User ID extracted:", userId);
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }

    // Calculate total amount
    let totalAmount = 0;

    for (const item of items) {
      const variant = await Variant.findById(item.variantId);
      if (!variant || variant.stock < item.quantity) {
        return res.status(400).json({ 
          message: `${item.productName} is out of stock!` 
        });
      }

      const itemTotal = Math.round(item.price * item.quantity * 100);
      totalAmount += itemTotal;
    }

    console.log("Creating payment intent for amount:", totalAmount);

    // ✅ FIXED: Use userId variable instead of req.userId
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      metadata: {
        userId: userId.toString(),  // ✅ FIXED
        items: JSON.stringify(items.map(i => ({
          variantId: i.variantId,
          quantity: i.quantity,
          price: i.price
        }))),
        shippingAddress: JSON.stringify(shippingAddress),
      },
    });

    console.log("✅ Payment intent created:", paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Payment intent error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;