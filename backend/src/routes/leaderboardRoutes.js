import express from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { LeaderboardGroup } from "../models/LeaderboardGroup.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


// GET: leaderboard by group or all
router.get("/", async (req, res) => {
  const { group: groupId } = req.query;
  try {
    let userFilter = {};
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ error: "Invalid group id" });
      }
      const group = await LeaderboardGroup.findById(groupId).select("members").lean();
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      if (!group.members?.length) {
        return res.json({ leaderboard: [] });
      }
      userFilter = { _id: { $in: group.members } };
    }
    const users = await User.find(userFilter)
      .sort({ reputationScore: -1, accuracyRate: -1, createdAt: 1 })
      .limit(50)
      .select("username reputationScore level accuracyRate totalVotes badges")
      .lean();
    return res.json({
      leaderboard: users.map((user, idx) => ({
        rank: idx + 1,
        id: user._id,
        username: user.username,
        reputationScore: user.reputationScore,
        level: user.level,
        accuracyRate: user.accuracyRate,
        totalVotes: user.totalVotes,
        badges: user.badges,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// POST: leaderboard for specific userIds (for friends leaderboard)
router.post("/", async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.json({ leaderboard: [] });
  }
  try {
    const users = await User.find({ _id: { $in: userIds } })
      .sort({ reputationScore: -1, accuracyRate: -1, createdAt: 1 })
      .limit(50)
      .select("username reputationScore level accuracyRate totalVotes badges")
      .lean();
    return res.json({
      leaderboard: users.map((user, idx) => ({
        rank: idx + 1,
        id: user._id,
        username: user.username,
        reputationScore: user.reputationScore,
        level: user.level,
        accuracyRate: user.accuracyRate,
        totalVotes: user.totalVotes,
        badges: user.badges,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/groups", requireAuth, async (req, res) => {
  try {
    const groups = await LeaderboardGroup.find({})
      .sort({ createdAt: -1 })
      .select("name members createdBy")
      .lean();

    return res.json({
      groups: groups.map((group) => ({
        id: group._id,
        name: group.name,
        memberCount: group.members.length,
        createdBy: group.createdBy,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.post("/groups", requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const existing = await LeaderboardGroup.findOne({ name: name.trim() }).lean();
    if (existing) {
      return res.status(409).json({ error: "Group already exists" });
    }

    const group = await LeaderboardGroup.create({
      name: name.trim(),
      createdBy: req.user._id,
      members: [req.user._id],
    });

    return res.status(201).json({
      group: {
        id: group._id,
        name: group.name,
        memberCount: group.members.length,
        createdBy: group.createdBy,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to create group" });
  }
});

router.get("/groups/:groupId/members", requireAuth, async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ error: "Invalid group id" });
  }

  try {
    const group = await LeaderboardGroup.findById(groupId)
      .populate("members", "username reputationScore level")
      .lean();

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    return res.json({
      members: (group.members || []).map((user) => ({
        id: user._id,
        username: user.username,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/users/by-username/:username", requireAuth, async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username: username.trim() })
      .select("username level reputationScore")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user: { id: user._id, username: user.username, level: user.level } });
  } catch {
    return res.status(500).json({ error: "Lookup failed" });
  }
});

router.post("/groups/:groupId/join", requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user or group id" });
  }

  try {
    const [group, user] = await Promise.all([
      LeaderboardGroup.findById(groupId),
      User.findById(userId).select("username").lean(),
    ]);

    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    const alreadyMember = group.members.some((memberId) => memberId.toString() === userId.toString());
    if (!alreadyMember) {
      group.members.push(userId);
      await group.save();
    }

    return res.json({ message: "Added to group", userId, groupId });
  } catch {
    return res.status(500).json({ error: "Failed to join group" });
  }
});

router.delete("/groups/:groupId/members/:userId", requireAuth, async (req, res) => {
  const { groupId, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user or group id" });
  }

  try {
    const group = await LeaderboardGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    group.members = group.members.filter((memberId) => memberId.toString() !== userId.toString());
    await group.save();

    return res.json({ message: "Removed from group" });
  } catch {
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

router.delete("/groups/:groupId", requireAuth, async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ error: "Invalid group id" });
  }

  try {
    const group = await LeaderboardGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the group creator can delete this group" });
    }

    await LeaderboardGroup.findByIdAndDelete(groupId);
    return res.json({ message: "Group deleted" });
  } catch {
    return res.status(500).json({ error: "Failed to delete group" });
  }
});

export default router;
