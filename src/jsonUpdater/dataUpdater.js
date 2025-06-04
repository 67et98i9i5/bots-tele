const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const FILES = [
  'allDocs.json',
  'channel_links.json',
  'channels.json',
  'data.json',
  'ids_new.json',
  'ids.json',
  'userIds.json'
];

const API_BASE = 'https://noasaga-data.onrender.com';
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function updateFile(file) {
  try {
    const url = `${API_BASE}/${file.replace('.json', '')}`;
    const res = await axios.get(url);
    const content = JSON.stringify(res.data, null, 2);
    const dest = path.join(DATA_DIR, file);
    await fs.writeFile(dest, content, 'utf-8');
    console.log(`[${new Date().toISOString()}] Updated ${file}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to update ${file}`);
  }
}

async function updateAllFiles() {
  for (const file of FILES) {
    await updateFile(file);
  }
}

// Initial run
updateAllFiles();

// Schedule every hour
setInterval(updateAllFiles, 1000 * 60 * 60);
