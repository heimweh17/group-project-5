import mongoose from "mongoose";

const directMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

directMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

directMessageSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);
