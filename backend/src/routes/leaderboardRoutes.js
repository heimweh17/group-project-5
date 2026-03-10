import express from "express";
import { User } from "../models/User.js";

const router = express.Router();

let groups = [];
const groupMembers = {};

router.get("/", async (req, res) => {
  const { group: groupId } = req.query;

  try {
    let users;

    if (groupId) {
      const members = groupMembers[groupId];

      if (!members || members.size === 0) {
        return res.json({ leaderboard: [] });
      }

      const memberIds = [...members];
      users = await User.find({ _id: { $in: memberIds } })
        .sort({ reputationScore: -1, accuracyRate: -1, createdAt: 1 })
        .limit(50)
        .select("username reputationScore level accuracyRate totalVotes badges")
        .lean();
    } else {
      users = await User.find({})
        .sort({ reputationScore: -1, accuracyRate: -1, createdAt: 1 })
        .limit(50)
        .select("username reputationScore level accuracyRate totalVotes badges")
        .lean();
    }

    res.json({
      leaderboard: users.map((u, idx) => ({
        rank: idx + 1,
        id: u._id,
        username: u.username,
        reputationScore: u.reputationScore,
        level: u.level,
        accuracyRate: u.accuracyRate,
        totalVotes: u.totalVotes,
        badges: u.badges,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/groups", (req, res) => {
  res.json({ groups });
});

router.post("/groups", (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  if (groups.some((g) => g.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(409).json({ error: "Group already exists" });
  }

  const group = { id: Date.now().toString(), name: name.trim() };
  groups.push(group);
  groupMembers[group.id] = new Set();

  res.status(201).json({ group });
});

router.get("/groups/:groupId/members", async (req, res) => {
  const { groupId } = req.params;

  if (!groups.some((g) => g.id === groupId)) {
    return res.status(404).json({ error: "Group not found" });
  }

  try {
    const members = groupMembers[groupId];
    if (!members || members.size === 0) return res.json({ members: [] });

    const users = await User.find({ _id: { $in: [...members] } })
      .select("username reputationScore level")
      .lean();

    res.json({ members: users.map((u) => ({ id: u._id, username: u.username })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/users/by-username/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username: username.trim() })
      .select("username level reputationScore")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user: { id: user._id, username: user.username, level: user.level } });
  } catch (err) {
    res.status(500).json({ error: "Lookup failed" });
  }
});

router.post("/groups/:groupId/join", async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!groups.some((g) => g.id === groupId)) {
    return res.status(404).json({ error: "Group not found" });
  }

  try {
    const user = await User.findById(userId).select("username").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!groupMembers[groupId]) groupMembers[groupId] = new Set();
    groupMembers[groupId].add(userId.toString());

    res.json({ message: "Added to group", userId, groupId });
  } catch (err) {
    res.status(500).json({ error: "Failed to join group" });
  }
});

router.delete("/groups/:groupId/members/:userId", (req, res) => {
  const { groupId, userId } = req.params;

  if (!groups.some((g) => g.id === groupId)) {
    return res.status(404).json({ error: "Group not found" });
  }

  groupMembers[groupId]?.delete(userId);
  res.json({ message: "Removed from group" });
});

export default router;