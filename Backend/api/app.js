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
  
  // Don't expose internal error messages (like JSON.parse errors) in production
  let message = "Internal Server Error"
  
  if (err.message) {
    // Filter out technical error messages and provide user-friendly alternatives
    if (err.message.includes("JSON") || err.message.includes("Unexpected token") || err.message.includes("parse")) {
      // Check if this is from a specific route to provide better context
      if (err.message.includes("AI service") || err.message.includes("resume") || err.message.includes("interview")) {
        message = "Unable to process the request. Please try regenerating your interview report."
      } else {
        message = "Invalid data format. Please try again."
      }
    } else if (err.message.includes("timeout")) {
      message = "Request timed out. Please try again."
    } else if (err.message.includes("AI service") || err.message.includes("generateContent")) {
      message = "AI service is temporarily unavailable. Please try again in a few moments."
    } else if (process.env.NODE_ENV === "development") {
      // In development, show the actual error
      message = err.message
    } else {
      // For other errors, use a generic message
      message = "An error occurred. Please try again."
    }
  }
  
  res.status(err.status || 500).json({
    message: message,
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