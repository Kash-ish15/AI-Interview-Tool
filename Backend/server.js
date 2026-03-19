require("dotenv").config()
const app = require("./api/app")
const connectToDB = require("./api/config/database")

// Connect to database
connectToDB().catch(err => {
    console.error("Database connection error:", err);
});

// For Vercel serverless functions
// Note: All routes are defined in ./api/app.js
module.exports = app;