import express from "express";
import { uploadAny } from "../middleware/upload.js"; // Changed to uploadAny
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateVariantStock,
  getVariantById,
  getProductVariants,
  updateSingleVariantStock,
} from "../controllers/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

// Product routes - USE uploadAny instead of upload.fields()
router.post(
  "/",
  authMiddleware,
  isAdmin,
  uploadAny, // ✅ Changed to accept all fields
  createProduct,
);

router.get("/", getProducts);
router.get("/:id", getProductById);

router.put(
  "/:id",
  authMiddleware,
  isAdmin,
  uploadAny, // ✅ Changed for update as well
  updateProduct,
);

router.delete("/:id", authMiddleware, isAdmin, deleteProduct); 

// Variant routes
router.get("/:productId/variants", getProductVariants);
router.get("/variant/:id", getVariantById);
router.put("/variant/:variantId/stock", authMiddleware, isAdmin, updateSingleVariantStock);
router.post("/checkout/update-stock", authMiddleware, updateVariantStock);

export default router;