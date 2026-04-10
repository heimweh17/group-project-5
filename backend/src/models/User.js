import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    reputationScore: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    accuracyRate: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    correctVotes: { type: Number, default: 0 },
    completedCases: [{ type: mongoose.Schema.Types.ObjectId, ref: "Case" }],
    badges: [{ type: String }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
