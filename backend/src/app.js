import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (req, res) => {
    res.json({ service: "ScamShield Hub API", docs: "/api/health" });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/cases", caseRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/messages", messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
