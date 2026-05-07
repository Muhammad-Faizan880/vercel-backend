import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";

export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    email = email.toLowerCase().trim();

    // 2. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. OTP expiry (5 min)
    const otpExpire = Date.now() + 5 * 60 * 1000;

    // 6. Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      otp,
      otpExpire,
      isVerified: false,
    });

    console.log("Sending OTP to:", email);

    // 7. Send OTP email
    await sendEmail(
      email,
      "Verify Your Account",
      `
    <div style="font-family: Arial; padding: 20px;">
      <h2>OTP Verification</h2>
      <p>Hello ${name},</p>
      <p>Your OTP is:</p>
      <h1 style="letter-spacing: 6px; color: #333;">${otp}</h1>
      <p>This OTP will expire in 5 minutes.</p>
    </div>
  `,
    );
    return res.status(201).json({
      message: "OTP sent to email",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

//  OTP verification
export const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    email = email.toLowerCase().trim();
    otp = otp.trim();
    const otpExpire = Date.now() + 5 * 60 * 1000;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (!user.otp) {
      return res.status(400).json({ message: "OTP expired or not generated" });
    }

    if (Date.now() > user.otpExpire) {
      return res.status(400).json({ message: "OTP expired" });
    }

    console.log("DB OTP:", user.otp);
    console.log("USER OTP:", otp);

    // strict match
    if (String(user.otp).trim() !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // verify user
    user.isVerified = true;
    user.otp = null;

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      token,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.toLowerCase();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🔥 IMPORTANT CHECK
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify OTP first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // For JWT, logout is handled on the client by deleting the token.
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============= UPDATED FORGOT PASSWORD WITH RESET LINK =============

// 1. FORGOT PASSWORD - Send password reset link via email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Generate password reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        purpose: "password_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Store token in database (optional but recommended for additional security)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Create reset link (adjust URL based on your frontend)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log(`Reset link for ${email}: ${resetLink}`); // Debugging

    // Send email with reset link
    await sendEmail(
      email,
      "Password Reset Request",
      `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${resetLink}" 
           style="display: inline-block; 
                  background-color: #4F46E5; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #4F46E5; word-break: break-all;">${resetLink}</p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
      `,
    );

    res.json({
      message: "Password reset link sent successfully to your email",
      email: email,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. VERIFY RESET TOKEN - Check if reset token is valid
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    // Find user and check if token matches
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link has expired or is invalid" });
    }

    res.json({
      message: "Token is valid",
      email: user.email,
      token: token,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. RESET PASSWORD - Save new password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link has expired. Please request a new one." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    console.log("Password reset successful for:", user.email);

    res.json({
      message:
        "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
