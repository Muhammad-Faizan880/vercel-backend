import express from "express";
import Variant from "../models/variant.js";

const router = express.Router();

// Validate cart items
router.post("/validate", async (req, res) => {
  try {
    const { variantIds } = req.body;
    
    if (!variantIds || variantIds.length === 0) {
      return res.json({ validVariants: [], invalidVariants: [] });
    }
    
    // Find all variants that still exist and are active
    const validVariants = await Variant.find({
      _id: { $in: variantIds },
      isActive: true
    }).select("_id");
    
    const validIds = validVariants.map(v => v._id.toString());
    const invalidIds = variantIds.filter(id => !validIds.includes(id));
    
    res.json({ 
      validVariants: validIds,
      invalidVariants: invalidIds 
    });
  } catch (error) {
    console.error("Cart validation error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;