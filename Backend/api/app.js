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
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
};

// ✅ Apply CORS FIRST
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ same config

// ✅ Then parsers
app.use(express.json());
app.use(cookieParser());

// ✅ Helmet (safe version)
app.use(helmet({ contentSecurityPolicy: false }));

// routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

module.exports = app;