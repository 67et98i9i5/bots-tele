const path = require('path');
const fs = require('fs');

function getAnimeTitle(animeId, seasonId) {
  const dataPath = path.resolve(__dirname, '../../data/data.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to load data.json:', e);
    return null;
  }

  const animeEntry = Object.values(data.anime_list).find(anime => anime.anime_id === animeId);
  if (!animeEntry) {
    console.error(`Anime with id ${animeId} not found.`);
    return null;
  }

  const normalizedInput = seasonId.toLowerCase().replace(/\s|-/g, '');
  const seasonKey = Object.keys(animeEntry.content).find(key => {
    const normalizedKey = key.toLowerCase().replace(/\s|-/g, '');
    if (normalizedKey === normalizedInput) return true;
    if (normalizedKey === 'season' + normalizedInput.replace(/^s/, '')) return true;
    return false;
  });

  if (!seasonKey) {
    console.error(`Season ${seasonId} not found for anime id ${animeId}.`);
    return null;
  }

  const season = animeEntry.content[seasonKey];
  if (!season) {
    console.error(`Season data missing for key ${seasonKey} for anime id ${animeId}.`);
    return null;
  }

  // Prefer dubbed if not empty/null else fallback to title
  if (season.dubbed && season.dubbed.trim() !== '') return season.dubbed;
  if (season.title && season.title.trim() !== '') return season.title;

  console.error(`No valid title or dubbed found for anime id ${animeId} season ${seasonKey}.`);
  return null;
}

module.exports = { getAnimeTitle };
