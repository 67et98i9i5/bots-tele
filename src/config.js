require("dotenv").config();
const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect("mongodb+srv://noasaga-project:7xwlXO28YNkfBHuW@noasaga-bots.tvb0y1h.mongodb.net/?retryWrites=true&w=majority&appName=noasaga-bots", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB Connected!");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
    }
}

module.exports = connectDB;
