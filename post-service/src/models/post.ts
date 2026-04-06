import { ObjectId, Schema, model, Document } from "mongoose";

interface PostSchema extends Document {
  user: ObjectId;
  content: string;
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<PostSchema>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    mediaIds: [{ type: String }],
  },
  { timestamps: true },
);

postSchema.index({ content: "text" });

const Post = model<PostSchema>("Post", postSchema);

export default Post;
