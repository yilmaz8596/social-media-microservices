import { Router } from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/post-controllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", createPost);
router.get("/", getPosts);
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

export default router;
