import { Request, Response } from "express";
import { tryCatch } from "../utils/tryCatch";
import { validateLogin, validateRegistration } from "../utils/validation";
import { generateToken } from "../utils/generateToken";
import logger from "../config/logger";
import User from "../models/user";
import argon2 from "argon2";
import RefreshToken from "../models/refreshToken";

export const register = tryCatch(async (req: Request, res: Response) => {
  const { error } = validateRegistration(req.body);
  if (error) {
    logger.error(
      "Validation error during registration: %s",
      error.details[0].message,
    );
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, email, password } = req.body;

  // Registration logic here (e.g., check if user exists, hash password, save to DB)

  let user = await User.findOne({ $or: [{ email }, { username }] });
  if (user) {
    logger.error(
      "Registration error: User with email %s or username %s already exists",
      email,
      username,
    );
    return res
      .status(400)
      .json({ error: "User with this email or username already exists" });
  }

  const hashedPassword = await argon2.hash(password);

  user = new User({ username, email, password: hashedPassword });
  await user.save();

  const { accessToken, refreshToken } = await generateToken(user);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    refreshToken,
  });
});

export const login = tryCatch(async (req: Request, res: Response) => {
  // Login logic here
  const { error } = validateLogin(req.body);

  if (error) {
    logger.error("Validation error during login: %s", error.details[0].message);
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    logger.error("Login error: User with email %s not found", email);
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const validPassword = await argon2.verify(user.password, password);
  if (!validPassword) {
    logger.error("Login error: Invalid password for email %s", email);
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const { accessToken, refreshToken } = await generateToken(user);
  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    userId: user._id,
    accessToken,
    refreshToken,
  });
});

export const refreshToken = tryCatch(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.error("Refresh token error: No refresh token provided");
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken || storedToken.expiresAt < new Date()) {
    logger.error("Refresh token error: Invalid refresh token");
    return res.status(400).json({ error: "Invalid refresh token" });
  }

  const user = await User.findById(storedToken.userId);
  if (!user) {
    logger.error(
      "Refresh token error: User with ID %s not found",
      storedToken.userId,
    );
    return res.status(400).json({ error: "Invalid refresh token" });
  }

  const { accessToken: newAccessToken } = await generateToken(user);

  await refreshToken.deleteOne({ _id: storedToken._id });
  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

export const logout = tryCatch(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.error("Logout error: No refresh token provided");
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    logger.error("Logout error: Invalid refresh token");
    return res.status(400).json({ error: "Invalid refresh token" });
  }

  await storedToken.deleteOne();
  res
    .status(200)
    .json({ success: true, message: "User logged out successfully" });
});
