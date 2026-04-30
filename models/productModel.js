import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    image: {
      type: String,
    },

    // ✅ FIXED VARIANTS
    variants: [
      {
        size: {
          type: String,
          required: true,
        },

        color: {
          name: {
            type: String,
            required: true,
          },
          hex: {
            type: String,
            required: true,
          },
        },

        image: {
          type: String,
        },

        stock: {
          type: Number,
          default: 0,
        },
      },
    ],

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);