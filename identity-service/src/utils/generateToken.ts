import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import { IUser } from "../models/user";
import RefreshToken from "../models/refreshToken";

dotenv.config();

export const generateToken = async (user: IUser) => {
  const accessToken = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET!,
    {
      expiresIn: "60m",
    },
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token valid for 7 days

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id as any,
    expiresAt,
  });

  return { accessToken, refreshToken };
};
