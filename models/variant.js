// models/Variant.js
import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    size: { type: String, required: true },
    color: {
      name: { type: String, required: true },
      hex: { type: String, default: "#000000" },
      image: { type: String },
    },
    stock: { type: Number, default: 0, index: true },
    price: { type: Number },
    sku: { type: String, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Compound index for quick lookup
variantSchema.index({ productId: 1, size: 1, "color.name": 1 });

export default mongoose.model("Variant", variantSchema);
