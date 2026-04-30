
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
    required: true,
  },
  quantity: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 },
  location: { type: String }, 
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("Inventory", inventorySchema);
