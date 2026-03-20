require("dotenv").config()
const app = require("./api/app")
const connectToDB = require("./api/config/database")

// Connect to database (non-blocking)
// In Vercel serverless, this will be called on each cold start
// The connection will be cached by mongoose
connectToDB().catch(err => {
    console.error("Database connection error:", err);
    // Don't crash the server if DB connection fails
});

// For Vercel serverless functions
// Note: All routes are defined in ./api/app.js
module.exports = app;