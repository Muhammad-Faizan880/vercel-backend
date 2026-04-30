import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("Decoded token:", decoded);

    // ✅ FIXED: Extract user ID properly
    const userId = decoded.userId || decoded._id || decoded.id;
    
    if (!userId) {
      console.error("No user ID found in token:", decoded);
      return res.status(401).json({ message: "Invalid token structure" });
    }

    // ✅ Set both formats for compatibility
    req.user = {
      _id: userId,
      id: userId,
      role: decoded.role,
      email: decoded.email
    };
    
    req.userId = userId;  // ✅ Also set this for backward compatibility

    console.log("✅ Auth successful, userId:", userId);
    next(); 
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};