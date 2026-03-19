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

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all vercel preview URLs
    if (
      allowedOrigins.includes(origin) ||
      origin.includes("vercel.app")
    ) {
      callback(null, true);
    } else {
      // Reject other origins
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
};

// ✅ Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes - must be before other routes
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isAllowed = !origin || 
    allowedOrigins.includes(origin) || 
    origin.includes("vercel.app");
  
  if (isAllowed && origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (isAllowed) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400");
  res.sendStatus(200);
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

// routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

module.exports = app;