import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import apiRouter from "./routes/index.js";

export const app = express();

// Render (and other hosts) sit behind a proxy — trust the first hop so
// req.ip resolves the real client address from X-Forwarded-For.
app.set("trust proxy", 1);

// Security & parsing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: env.corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

if (!env.isProduction) {
  app.use(morgan("dev"));
}

// Rate limit auth endpoints (brute-force protection)
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests — try again later" },
  }),
);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Mig Flares Car Wash API", data: null });
});

app.use("/api", apiRouter);

// 404 + centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);
