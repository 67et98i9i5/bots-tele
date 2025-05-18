const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const docsOutputPath = path.join(__dirname, "../../data/allDocs.json");
const idsOutputPath = path.join(__dirname, "../../data/userIds.json");

async function exportAllDocsAndUserIds() {
  console.log("🔌 Connecting to database...");
  await connectDB();

  const db = mongoose.connection;
  const collections = await db.db.listCollections().toArray();
  const allDocs = [];

  console.log(`📚 Found ${collections.length} collections`);

  try {
    for (const { name } of collections) {
      console.log(`📂 Exporting collection: ${name}`);
      const cursor = db.collection(name).find({}, { projection: {} }).batchSize(1000);
      let count = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        allDocs.push(JSON.parse(JSON.stringify(doc)));
        count++;
        if (count % 1000 === 0) console.log(`   ↪ ${count} documents collected...`);
      }

      console.log(`✅ Finished ${name}: ${count} documents`);
    }

    fs.writeFileSync(docsOutputPath, JSON.stringify(allDocs, null, 2));
    console.log(`💾 All documents written to ${docsOutputPath}`);
  } catch (err) {
    console.error("❌ Error during export:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔒 Disconnected from database");
  }

  console.log("🔎 Extracting userId values...");
  extractUserIds(allDocs);
}

function extractUserIds(docs) {
  const ids = new Set();
  for (const doc of docs) scanObjectForUserIds(doc, ids);
  const idArray = Array.from(ids).sort((a, b) => a - b);
  fs.writeFileSync(idsOutputPath, JSON.stringify(idArray, null, 2));
  console.log(`✅ Extracted and saved ${idArray.length} unique userId values to ${idsOutputPath}`);
}

function scanObjectForUserIds(obj, acc) {
  if (Array.isArray(obj)) {
    for (const item of obj) scanObjectForUserIds(item, acc);
  } else if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes("userid") && (typeof value === "string" || typeof value === "number")) {
        const id = parseInt(value);
        if (!isNaN(id)) acc.add(id);
      } else {
        scanObjectForUserIds(value, acc);
      }
    }
  }
}


exportAllDocsAndUserIds();
