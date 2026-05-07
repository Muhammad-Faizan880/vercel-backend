import express from "express";
import { forgotPassword, login, logout, register, resetPassword, verifyOtp, verifyResetToken } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post("/reset-password", resetPassword);


export default router;