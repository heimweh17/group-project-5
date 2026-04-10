
import express from "express";
import mongoose from "mongoose";
import { attachOptionalAuth, requireAuth } from "../middleware/auth.js";
import { Vote } from "../models/Vote.js";
import { Comment } from "../models/Comment.js";
import { CaseModel } from "../models/Case.js";
import { User } from "../models/User.js";

const router = express.Router();

// --- FRIENDS SYSTEM ROUTES ---
// Send a friend request
router.post("/friends/request/:targetId", requireAuth, async (req, res) => {
  const { targetId } = req.params;
  if (req.user._id.toString() === targetId) return res.status(400).json({ error: "Cannot friend yourself" });
  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.friends?.includes(req.user._id)) return res.status(400).json({ error: "Already friends" });
  if (target.friendRequests?.includes(req.user._id)) return res.status(400).json({ error: "Request already sent" });
  target.friendRequests = [...(target.friendRequests || []), req.user._id];
  await target.save();
  return res.json({ success: true });
});

// Accept a friend request
router.post("/friends/accept/:requesterId", requireAuth, async (req, res) => {
  const { requesterId } = req.params;
  if (req.user.friendRequests?.includes(requesterId)) {
    req.user.friends = [...(req.user.friends || []), requesterId];
    req.user.friendRequests = req.user.friendRequests.filter((id) => id.toString() !== requesterId);
    await req.user.save();
    // Add user to requester's friends
    const requester = await User.findById(requesterId);
    if (requester) {
      requester.friends = [...(requester.friends || []), req.user._id];
      await requester.save();
    }
    return res.json({ success: true });
  }
  return res.status(400).json({ error: "No such friend request" });
});

// Remove a friend
router.post("/friends/remove/:friendId", requireAuth, async (req, res) => {
  const { friendId } = req.params;
  req.user.friends = (req.user.friends || []).filter((id) => id.toString() !== friendId);
  await req.user.save();
  // Remove user from friend's list
  const friend = await User.findById(friendId);
  if (friend) {
    friend.friends = (friend.friends || []).filter((id) => id.toString() !== req.user._id.toString());
    await friend.save();
  }
  return res.json({ success: true });
});

// List friends (detailed)
router.get("/friends/list", requireAuth, async (req, res) => {
  const populated = await User.findById(req.user._id).populate("friends", "_id username email").populate("friendRequests", "_id username email");
  return res.json({ friends: populated.friends, friendRequests: populated.friendRequests });
});

function calculateDifficultyBadges(difficultyBreakdown) {
  const badges = [];
  
  // Define thresholds for badges: [threshold, badge_name]
  const thresholds = [
    [5, "Novice"],
    [15, "Expert"],
    [30, "Master"],
  ];
  
  for (const [difficulty, stats] of Object.entries(difficultyBreakdown)) {
    for (const [threshold, level] of thresholds) {
      if (stats.correct >= threshold) {
        const badgeName = `${level}_${difficulty}`;
        badges.push(badgeName);
      }
    }
  }
  
  return badges;
}

function calculateStreakBadges(votes) {
  const badges = [];
  
  // Calculate current streak (consecutive correct answers)
  let currentStreak = 0;
  let maxStreak = 0;
  
  // Votes are sorted by createdAt descending, so we need to reverse for chronological order
  const chrono = [...votes].reverse();
  
  for (const vote of chrono) {
    if (vote.isCorrect) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  // Award streak badges based on max streak achieved
  if (maxStreak >= 5) badges.push("Hot_Streak_5");
  if (maxStreak >= 10) badges.push("Fire_Streak_10");
  if (maxStreak >= 25) badges.push("Legendary_Streak_25");
  if (maxStreak >= 50) badges.push("Unstoppable_Streak_50");
  
  return badges;
}

function calculatePointBadges(reputationScore) {
  const badges = [];
  
  const milestones = [
    [100, "Century"],
    [500, "Five_Hundred"],
    [1000, "Millennium"],
    [2500, "Apex"],
    [5000, "Godlike"],
  ];
  
  for (const [points, name] of milestones) {
    if (reputationScore >= points) {
      badges.push(`${name}_${points}`);
    }
  }
  
  return badges;
}

async function calculateLeaderboardBadges(userId) {
  const badges = [];
  
  // Get all users ranked by reputation score
  const rankedUsers = await User.find({ role: "user" })
    .select("_id reputationScore")
    .sort({ reputationScore: -1 })
    .lean();
  
  const userRank = rankedUsers.findIndex((u) => u._id.toString() === userId.toString()) + 1;
  
  if (userRank && userRank > 0) {
    if (userRank <= 10) badges.push("Top_10_Leaderboard");
    if (userRank <= 25) badges.push("Top_25_Leaderboard");
    if (userRank <= 50) badges.push("Top_50_Leaderboard");
    if (userRank <= 100) badges.push("Top_100_Leaderboard");
  }
  
  return badges;
}

function buildAnsweredCases(votes) {
  const seen = new Set();
  const answered = [];

  for (const vote of votes) {
    const caseId = vote.caseId?._id?.toString();
    if (!caseId || seen.has(caseId)) continue;
    seen.add(caseId);
    answered.push({
      id: caseId,
      title: vote.caseId?.title || "Unknown case",
      difficulty: vote.caseId?.difficulty || "unknown",
      contentType: vote.caseId?.contentType || "unknown",
      answer: vote.answer,
      isCorrect: vote.isCorrect,
      pointsAwarded: vote.pointsAwarded,
      createdAt: vote.createdAt,
    });
  }

  return answered.slice(0, 12);
}

async function buildUserProfilePayload(user, viewerRole = "public") {
  const [userVotes, commentsCount, publishedCasesCount, recentComments] = await Promise.all([
    Vote.find({ userId: user._id })
      .populate("caseId", "title difficulty contentType")
      .sort({ createdAt: -1 })
      .lean(),
    Comment.countDocuments({ userId: user._id }),
    CaseModel.countDocuments({ isPublished: true }),
    Comment.find({ userId: user._id })
      .populate("caseId", "title")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const recentVotes = userVotes.slice(0, 6);
  const answeredCases = buildAnsweredCases(userVotes);
  const progressPercent = publishedCasesCount
    ? Math.round((user.completedCases.length / publishedCasesCount) * 100)
    : 0;

  const confidenceScore = Math.min(
    100,
    Math.round(user.accuracyRate * 0.7 + Math.min(user.totalVotes, 30) * 1),
  );

  const difficultyBreakdown = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  };

  for (const vote of userVotes) {
    const difficulty = vote.caseId?.difficulty;
    if (!difficultyBreakdown[difficulty]) continue;
    difficultyBreakdown[difficulty].total += 1;
    if (vote.isCorrect) difficultyBreakdown[difficulty].correct += 1;
  }

  const difficultyBadges = calculateDifficultyBadges(difficultyBreakdown);
  const streakBadges = calculateStreakBadges(userVotes);
  const pointBadges = calculatePointBadges(user.reputationScore);
  const leaderboardBadges = await calculateLeaderboardBadges(user._id);
  
  const allBadges = [
    ...new Set([
      ...user.badges,
      ...difficultyBadges,
      ...streakBadges,
      ...pointBadges,
      ...leaderboardBadges,
    ]),
  ];

  const baseProfile = {
    id: user._id,
    username: user.username,
    role: user.role,
    reputationScore: user.reputationScore,
    level: user.level,
    accuracyRate: user.accuracyRate,
    totalVotes: user.totalVotes,
    correctVotes: user.correctVotes,
    completedCasesCount: user.completedCases.length,
    badges: allBadges,
    commentsCount,
    progressPercent,
    confidenceScore,
    remainingCasesCount: Math.max(0, publishedCasesCount - user.completedCases.length),
    recentPerformance: recentVotes.map((vote) => ({
      id: vote._id,
      caseId: vote.caseId?._id || null,
      isCorrect: vote.isCorrect,
      answer: vote.answer,
      pointsAwarded: vote.pointsAwarded,
      createdAt: vote.createdAt,
      caseTitle: vote.caseId?.title || "Unknown case",
      difficulty: vote.caseId?.difficulty || "unknown",
      contentType: vote.caseId?.contentType || "unknown",
    })),
    answeredCases,
    difficultyBreakdown: Object.entries(difficultyBreakdown).map(([difficulty, stats]) => ({
      difficulty,
      total: stats.total,
      correct: stats.correct,
      accuracyRate: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
    })),
    recentComments: recentComments.map((comment) => ({
      id: comment._id,
      body: comment.body,
      createdAt: comment.createdAt,
      caseId: comment.caseId?._id || null,
      caseTitle: comment.caseId?.title || "Unknown case",
    })),
    joinedAt: user.createdAt,
    friends: user.friends || [],
    friendRequests: user.friendRequests || [],
  };

  if (viewerRole === "self") {
    return {
      ...baseProfile,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };
  }

  if (viewerRole === "admin") {
    return {
      ...baseProfile,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      adminView: {
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        joinedAt: user.createdAt,
      },
    };
  }

  return baseProfile;
}

router.get("/me", requireAuth, async (req, res) => {
  const user = await buildUserProfilePayload(req.user, "self");
  return res.json({ user });
});

router.get("/:id", attachOptionalAuth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const targetUser = await User.findById(req.params.id).lean();
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const viewerRole =
    req.user?._id?.toString() === targetUser._id.toString()
      ? "self"
      : req.user?.role === "admin"
        ? "admin"
        : "public";

  const user = await buildUserProfilePayload(targetUser, viewerRole);
  return res.json({ user, viewerRole });
});

export default router;
