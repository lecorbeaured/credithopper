import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { connectDB } from "./db.js";
import config from "./config.js";

// Load env vars
dotenv.config();

const app = express();

/* -------------------- Middleware -------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

/* -------------------- Health + Root -------------------- */
app.get("/", (req, res) => {
  res.status(200).send("CreditHopper backend is live");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "credithopper-backend",
    env: config.env,
  });
});

/* -------------------- Routes -------------------- */
// Example:
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);

/* -------------------- Startup -------------------- */
const startServer = async () => {
  try {
    const dbConnected = await connectDB();

    if (!dbConnected && config.env === "production") {
      console.error("❌ Database connection failed in production");
      process.exit(1);
    }

    const PORT = process.env.PORT || config.port || 3000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 CreditHopper backend started");
      console.log(`🌍 Environment: ${config.env}`);
      console.log(`📡 Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

startServer();
