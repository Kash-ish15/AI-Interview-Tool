require("dotenv").config()
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-interview-tool-164d.vercel.app"
];

// Simple CORS configuration - cors package handles OPTIONS automatically
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin or from allowed origins
    if (!origin || allowedOrigins.includes(origin) || origin.includes("vercel.app")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware - this automatically handles OPTIONS preflight requests
app.use(cors(corsOptions));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ✅ Then parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Helmet (safe version)
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Root route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Server started",
        status: "running",
        timestamp: new Date().toISOString()
    });
});

// routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// Debug route to check if app is working
app.get("/api/health", (req, res) => {
    res.status(200).json({
        message: "API is working",
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// 404 handler - must be last
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

module.exports = app;