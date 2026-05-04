import Product from "../models/productModel.js";
import Variant from "../models/variant.js";

// Create product with variants in separate table
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, variants } = req.body;

    // ✅ Find main image from req.files array
    const mainImage = req.files?.find(file => file.fieldname === "image");
    
    if (!mainImage) {
      return res.status(400).json({ message: "Image is required" });
    }

    let parsedVariants;
    try {
      parsedVariants = JSON.parse(variants);
    } catch (error) {
      return res.status(400).json({ message: "Invalid variants format" });
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      image: `/uploads/${mainImage.filename}`,
    });

    // Create variant documents
    const variantDocs = [];
    
    for (const v of parsedVariants) {
      // ✅ Find color image from req.files array
      const colorImageField = `colorImage_${v.size}_${v.color.name}`;
      const colorImageFile = req.files?.find(file => file.fieldname === colorImageField);
      
      variantDocs.push({
        productId: product._id,
        size: v.size,
        color: {
          name: v.color.name,
          hex: v.color.hex,
          image: colorImageFile 
            ? `/uploads/${colorImageFile.filename}`
            : `/uploads/${mainImage.filename}`, // Fallback to main product image
        },
        stock: Number(v.stock),
        sku: `${product._id}-${v.size}-${v.color.name}`.replace(/\s/g, ""),
      });
    }

    if (variantDocs.length > 0) {
      await Variant.insertMany(variantDocs);
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
      variants: variantDocs,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get product with its variants
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    const variants = await Variant.find({ 
      productId: product._id,
      isActive: true 
    });
    
    // Group variants by size for better frontend display
    const groupedVariants = {};
    variants.forEach(variant => {
      if (!groupedVariants[variant.size]) {
        groupedVariants[variant.size] = [];
      }
      groupedVariants[variant.size].push(variant);
    });
    
    res.json({ 
      ...product.toObject(), 
      variants: variants,
      variantsList: variants
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products (with variants populated)
export const getProducts = async (req, res) => {
  try {
    const { keyword, minPrice, maxPrice, page = 1, limit = 5 } = req.query;

    let query = {};
    if (keyword) {
      query.name = { $regex: keyword, $options: "i" };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query).skip(skip).limit(Number(limit));
    const total = await Product.countDocuments(query);

    const productIds = products.map(p => p._id);
    const allVariants = await Variant.find({ 
      productId: { $in: productIds },
      isActive: true 
    });

    const variantsByProduct = {};
    allVariants.forEach(v => {
      if (!variantsByProduct[v.productId]) variantsByProduct[v.productId] = [];
      variantsByProduct[v.productId].push(v);
    });

    const productsWithVariants = products.map(p => ({
      ...p.toObject(),
      variants: variantsByProduct[p._id] || []
    }));

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      products: productsWithVariants,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, variants } = req.body;

    const updateData = {
      name,
      description,
      price: Number(price),
    };

    // ✅ Find main image from req.files array
    const mainImage = req.files?.find(file => file.fieldname === "image");
    if (mainImage) {
      updateData.image = `/uploads/${mainImage.filename}`;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (variants) {
      let parsedVariants;
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        return res.status(400).json({ message: "Invalid variants format" });
      }

      // Delete existing variants
      await Variant.deleteMany({ productId: product._id });

      // Create new variants
      const variantDocs = [];
      
      for (const v of parsedVariants) {
        const colorImageField = `colorImage_${v.size}_${v.color.name}`;
        const colorImageFile = req.files?.find(file => file.fieldname === colorImageField);
        
        variantDocs.push({
          productId: product._id,
          size: v.size,
          color: {
            name: v.color.name,
            hex: v.color.hex,
            image: colorImageFile 
              ? `/uploads/${colorImageFile.filename}`
              : v.color.image || product.image,
          },
          stock: Number(v.stock),
          sku: `${product._id}-${v.size}-${v.color.name}`.replace(/\s/g, '')
        });
      }

      await Variant.insertMany(variantDocs);
    }

    const updatedVariants = await Variant.find({ productId: product._id });

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
      variants: updatedVariants
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const deletedVariants = await Variant.deleteMany({ productId: product._id });
    await Product.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: "Product and all its variants deleted successfully",
      deletedCount: {
        product: 1,
        variants: deletedVariants.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update variant stock (for checkout)
export const updateVariantStock = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;
    
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    
    if (variant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }
    
    variant.stock -= quantity;
    await variant.save();
    
    res.json({ message: "Stock updated", stock: variant.stock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get variant by ID
export const getVariantById = async (req, res) => {
  try {
    const variant = await Variant.findById(req.params.id).populate("productId");
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    res.json(variant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all variants of a product
export const getProductVariants = async (req, res) => {
  try {
    const variants = await Variant.find({ 
      productId: req.params.productId,
      isActive: true 
    });
    
    // Group by size for better UI
    const grouped = {};
    variants.forEach(v => {
      if (!grouped[v.size]) grouped[v.size] = [];
      grouped[v.size].push(v);
    });
    
    res.json({ variants, grouped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update single variant stock (admin)
export const updateSingleVariantStock = async (req, res) => {
  try {
    const { stock } = req.body;
    
    const variant = await Variant.findByIdAndUpdate(
      req.params.variantId,
      { stock: Number(stock) },
      { new: true }
    );
    
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    
    res.json({ message: "Stock updated", variant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};