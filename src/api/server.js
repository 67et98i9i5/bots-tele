const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

const dataDir = path.join(__dirname, '..', '..', 'data');

const endpoints = [
  'allDocs.json',
  'channel_links.json',
  'channels.json',
  'data.json',
  'ids_new.json',
  'ids.json',
  'userIds.json'
];

endpoints.forEach(file => {
  const route = `/${file.replace('.json', '')}`;
  app.get(route, async (req, res) => {
    try {
      const filePath = path.join(dataDir, file);
      const data = await fs.readFile(filePath, 'utf-8');
      res.type('application/json').send(data);
    } catch {
      res.status(500).send({ error: 'Failed to read file.' });
    }
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
