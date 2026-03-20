const mongoose = require("mongoose")
require("dotenv").config()


async function connectToDB() {

    try {
        if (!process.env.MONGO_URI) {
            console.error("MONGO_URI environment variable is not set")
            return
        }
        
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connected to Database")
    }
    catch (err) {
        console.error("Database connection error:", err)
        // Don't throw - allow server to start even if DB connection fails
        // The server can still handle requests, but DB operations will fail
    }
}

module.exports = connectToDB