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

// Favicon handler - return 204 No Content to prevent 500 errors
app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
});

// Root route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Server started",
        status: "running",
        timestamp: new Date().toISOString()
    });
});

// routes
try {
    const authRouter = require("./routes/auth.routes");
    const interviewRouter = require("./routes/interview.routes");

    app.use("/api/auth", authRouter);
    app.use("/api/interview", interviewRouter);
} catch (error) {
    console.error("Error loading routes:", error);
    // Don't crash - add a fallback route
    app.use("/api/*", (req, res) => {
        res.status(500).json({
            message: "Routes failed to load. Please check server configuration.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    });
}

// Debug route to check if app is working
app.get("/api/health", (req, res) => {
    res.status(200).json({
        message: "API is working",
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // If response already sent, don't try to send another response
  if (res.headersSent) {
    console.error("Error occurred but response already sent:", err.message);
    return next(err);
  }

  console.error("Error:", err);
  console.error("Request path:", req.path);
  console.error("Request method:", req.method);
  
  // Don't expose internal error messages (like JSON.parse errors) in production
  let message = "An error occurred. Please try again."
  
  // Check request path to provide context-specific messages
  const isInterviewRoute = req.path && (
    req.path.includes("/interview") || 
    req.path.includes("/resume") || 
    req.path.includes("/pdf")
  )
  
  const isAuthRoute = req.path && req.path.includes("/auth")
  
  if (err.message) {
    // Filter out technical error messages and provide user-friendly alternatives
    // Note: "malformed JSON" errors should be handled by controllers, not here
    if (err.message.includes("JSON") || err.message.includes("Unexpected token") || err.message.includes("parse") || (err.message.includes("invalid response format") && !err.message.includes("malformed JSON"))) {
      if (isInterviewRoute) {
        message = "Unable to process the request. Please try regenerating your interview report."
      } else if (isAuthRoute) {
        message = "Authentication error. Please try logging in again."
      } else {
        message = "Invalid data format. Please try again."
      }
    } else if (err.message.includes("timeout")) {
      if (isInterviewRoute) {
        message = "Request timed out. This may take longer than expected. Please try again."
      } else {
        message = "Request timed out. Please try again."
      }
    } else if (err.message.includes("AI service") || err.message.includes("generateContent")) {
      if (isInterviewRoute) {
        message = "AI service is temporarily unavailable. Please try regenerating your interview report in a few moments."
      } else {
        message = "AI service is temporarily unavailable. Please try again in a few moments."
      }
    } else if (err.message.includes("Puppeteer") || err.message.includes("browser")) {
      message = "PDF generation service is temporarily unavailable. Please try again in a few moments."
    } else if (process.env.NODE_ENV === "development") {
      // In development, show the actual error
      message = err.message
    } else if (err.message.includes("resume") || err.message.includes("HTML content")) {
      message = "Resume content could not be generated. Please try regenerating your interview report."
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