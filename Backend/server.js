require("dotenv").config()
const app = require("./api/app")
const connectToDB = require("./api/config/database")

// Connect to database
connectToDB().catch(err => {
    console.error("Database connection error:", err);
});

app.get("/", (req, res) => {
    res.send("Server started");
});

// For Vercel serverless functions
module.exports = app;