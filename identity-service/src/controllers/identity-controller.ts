import { Request, Response } from "express";
import { tryCatch } from "../utils/tryCatch";
import { validateRegistration } from "../utils/validation";
import { generateToken } from "../utils/generateToken";
import logger from "../config/logger";
import User from "../models/user";
import argon2 from "argon2";

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
  res.status(200).json({ message: "User logged in successfully" });
});
