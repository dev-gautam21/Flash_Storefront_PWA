const { MongoClient } = require("mongodb");
require("dotenv").config();

let db;

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("❌ Missing MONGO_URI in .env file");

    console.log(`🔌 Connecting to MongoDB at: ${uri}`);

    // No need for useUnifiedTopology (deprecated)
    const client = new MongoClient(uri);
    await client.connect();

    // ✅ Automatically picks DB name from your URI (flashsaleDB)
    db = client.db();
    console.log(`✅ Connected to MongoDB database: ${db.databaseName}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
};

module.exports = { connectDB, getDB };
