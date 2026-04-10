import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { DirectMessage } from "../models/DirectMessage.js";
import { User } from "../models/User.js";

const router = express.Router();

router.use(requireAuth);

function isFriends(userDoc, otherId) {
  return (userDoc.friends || []).some((friendId) => friendId.toString() === otherId.toString());
}

async function ensureCanMessage(req, targetId) {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return { error: "Invalid user id", status: 400 };
  }

  if (req.user._id.toString() === targetId.toString()) {
    return { error: "Cannot message yourself", status: 400 };
  }

  const targetUser = await User.findById(targetId).select("_id username").lean();
  if (!targetUser) {
    return { error: "User not found", status: 404 };
  }

  if (!isFriends(req.user, targetId)) {
    return { error: "You can only message users in your friends list", status: 403 };
  }

  return { targetUser };
}

router.post("/:recipientId", async (req, res) => {
  const { recipientId } = req.params;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

  if (!body) {
    return res.status(400).json({ error: "Message body is required" });
  }

  const validation = await ensureCanMessage(req, recipientId);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const message = await DirectMessage.create({
    senderId: req.user._id,
    recipientId,
    body,
  });

  return res.status(201).json({
    message: {
      id: message._id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      body: message.body,
      createdAt: message.createdAt,
      readAt: message.readAt,
    },
  });
});

router.get("/conversation/:otherUserId", async (req, res) => {
  const { otherUserId } = req.params;
  const validation = await ensureCanMessage(req, otherUserId);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const rawBefore = req.query.before;
  const before = rawBefore ? new Date(rawBefore) : null;

  const query = {
    $or: [
      { senderId: req.user._id, recipientId: otherUserId },
      { senderId: otherUserId, recipientId: req.user._id },
    ],
  };

  if (before && !Number.isNaN(before.getTime())) {
    query.createdAt = { $lt: before };
  }

  const messages = await DirectMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadIncomingIds = messages
    .filter((m) => m.recipientId.toString() === req.user._id.toString() && !m.readAt)
    .map((m) => m._id);

  const unreadIncomingIdSet = new Set(unreadIncomingIds.map((id) => id.toString()));
  const markedReadAt = new Date().toISOString();

  if (unreadIncomingIds.length) {
    await DirectMessage.updateMany(
      { _id: { $in: unreadIncomingIds } },
      { $set: { readAt: new Date() } },
    );
  }

  return res.json({
    participant: validation.targetUser,
    messages: messages.reverse().map((m) => ({
      id: m._id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      body: m.body,
      createdAt: m.createdAt,
      readAt:
        m.recipientId.toString() === req.user._id.toString() && unreadIncomingIdSet.has(m._id.toString())
          ? markedReadAt
          : m.readAt,
    })),
  });
});

router.get("/inbox", async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("friends", "_id username email")
    .lean();

  const friends = user?.friends || [];
  const friendIds = friends.map((f) => f._id.toString());

  if (!friendIds.length) {
    return res.json({ threads: [] });
  }

  const latestMessages = await Promise.all(
    friendIds.map(async (friendId) => {
      const [lastMessage, unreadCount] = await Promise.all([
        DirectMessage.findOne({
          $or: [
            { senderId: req.user._id, recipientId: friendId },
            { senderId: friendId, recipientId: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .lean(),
        DirectMessage.countDocuments({
          senderId: friendId,
          recipientId: req.user._id,
          readAt: null,
        }),
      ]);

      const friend = friends.find((f) => f._id.toString() === friendId);

      return {
        participant: friend,
        lastMessage: lastMessage
          ? {
              id: lastMessage._id,
              senderId: lastMessage.senderId,
              recipientId: lastMessage.recipientId,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
      };
    }),
  );

  latestMessages.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return res.json({ threads: latestMessages });
});

router.post("/read/:otherUserId", async (req, res) => {
  const { otherUserId } = req.params;
  const validation = await ensureCanMessage(req, otherUserId);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const result = await DirectMessage.updateMany(
    {
      senderId: otherUserId,
      recipientId: req.user._id,
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    },
  );

  return res.json({ updated: result.modifiedCount || 0 });
});

export default router;
