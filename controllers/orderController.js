import Order from "../models/OrderModel.js";
import Variant from "../models/variant.js";

// Create order after successful payment
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentIntentId, totalAmount } = req.body;

    // Verify stock before creating order
    for (const item of items) {
      const variant = await Variant.findById(item.variantId);
      if (!variant || variant.stock < item.quantity) {
        return res.status(400).json({ 
          message: `${item.productName} is out of stock!` 
        });
      }
    }

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: items.map(item => ({
        variantId: item.variantId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        image: item.image,
      })),
      shippingAddress,
      paymentIntentId,
      totalAmount,
      status: "pending",
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};