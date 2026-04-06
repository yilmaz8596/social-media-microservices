import logger from "../utils/logger";
import { tryCatch } from "../utils/tryCatch";
import { Request, Response } from "express";
import Post from "../models/post";
import { validateRequest } from "../utils/validation";

async function invalidatePostCache(req: Request | any, postId: string) {
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
    logger.info("Invalidated post cache for post ID: %s", postId);
  } else {
    logger.info("No post cache to invalidate for post ID: %s", postId);
  }
}

export const createPost = tryCatch(
  async (req: Request | any, res: Response) => {
    const { content, mediaIds } = req.body;

    const { error } = validateRequest(req.body);
    if (error) {
      logger.warn("Validation failed: %s", error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    const post = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await post.save();
    await invalidatePostCache(req, post._id.toString());
    logger.info("Post created with ID: %s", post._id);
    res.status(201).json({ success: true, data: post });
  },
);

export const getPosts = tryCatch(async (req: Request | any, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const cacheKey = `posts:page:${page}:limit:${limit}`;
  const cachedPosts = await req.redisClient.get(cacheKey);

  if (cachedPosts) {
    logger.info(
      "Posts retrieved from cache for page: %d, limit: %d",
      page,
      limit,
    );
    return res.json({ success: true, data: JSON.parse(cachedPosts) });
  }

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Post.countDocuments();
  const totalPages = Math.ceil(total / limit);

  const result = {
    posts,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
  await req.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60); // Cache for 60 seconds
  logger.info(
    "Posts retrieved from database for page: %d, limit: %d",
    page,
    limit,
  );
  logger.debug("Total posts: %d, Total pages: %d", total, totalPages);
  logger.info("Retrieved %d posts", posts.length);
  res.json({
    success: true,
    data: result,
  });
});

export const getPostById = tryCatch(
  async (req: Request | any, res: Response) => {
    const { id } = req.params;
    const cacheKey = `post:${id}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      logger.info("Post retrieved from cache with ID: %s", id);
      return res.json({ success: true, data: JSON.parse(cachedPost) });
    }

    const post = await Post.findById(id);

    if (!post) {
      logger.warn("Post not found with ID: %s", id);
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await req.redisClient.set(cacheKey, JSON.stringify(post), "EX", 60); // Cache for 60 seconds
    logger.info("Retrieved post with ID: %s", id);
    res.json({ success: true, data: post });
  },
);

export const updatePost = tryCatch(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  const post = await Post.findById(id);

  if (!post) {
    logger.warn("Post not found with ID: %s", id);
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (content) post.content = content;
  await post.save();
  logger.info("Post updated with ID: %s", id);
  res.json({ success: true, data: post });
});

export const deletePost = tryCatch(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const post = await Post.findByIdAndDelete(id);

  if (!post) {
    logger.warn("Post not found with ID: %s", id);
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  await invalidatePostCache(req, id);
  logger.info("Post deleted with ID: %s", id);
  res.json({ success: true, message: "Post deleted successfully" });
});
