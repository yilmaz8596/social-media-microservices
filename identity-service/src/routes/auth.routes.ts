import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
} from "../controllers/identity-controller";

const router = Router();

router.post("/register", register as any);
router.post("/login", login as any);
router.post("/refresh-token", refreshToken as any);
router.post("/logout", logout as any);

export default router;
