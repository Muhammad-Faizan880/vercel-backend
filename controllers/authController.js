import express from "express";
import bcrypt from "bcrypt";
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
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
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
