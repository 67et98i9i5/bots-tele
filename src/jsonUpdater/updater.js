const fs = require('fs');
const axios = require('axios');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../..', 'data', 'data.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAnimeData(mal_id) {
  const base = 'https://api.jikan.moe/v4/anime/';
  const res = await axios.get(`${base}${mal_id}/full`);
  const data = res.data.data;

  return {
    mal_id: mal_id,
    aired_on: data.aired?.from || '',
    title: data.title || '',
    rating: data.rating || '',
    genres: data.genres.map(g => g.name),
    studio: data.studios?.[0]?.name || '',
    production_company: data.producers?.[0]?.name || '',
    official_site: data.url || '',
    streaming_links: [],
    synopsis: data.synopsis || '',
    prequel: '',
    sequel: '',
    spin_off: '',
    start_date: data.aired?.from || '',
    end_date: data.aired?.to || '',
    total_episodes: data.episodes || 0,
    popularity_rank: data.popularity?.toString() || '',
    language: data.type || '',
    dubbed: data.title_english || '',
    poster_image_url: data.images?.jpg?.image_url || '',
    trailer_url: data.trailer?.url || ''
  };
}

const reorderKeys = [
  'mal_id', 'aired_on', 'title', 'rating', 'genres', 'studio',
  'production_company', 'official_site', 'streaming_links', 'synopsis',
  'prequel', 'sequel', 'spin_off', 'start_date', 'end_date',
  'total_episodes', 'popularity_rank', 'language', 'dubbed',
  'poster_image_url', 'trailer_url'
];

async function updateAnimeData() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Data file not found at ${DATA_PATH}`);
    return;
  }

  let file;
  try {
    file = fs.readFileSync(DATA_PATH, 'utf-8');
  } catch (err) {
    console.error('Error reading data.json:', err.message);
    return;
  }

  let json;
  try {
    json = JSON.parse(file);
  } catch (err) {
    console.error('Invalid JSON format in data.json:', err.message);
    return;
  }

  const animeList = json.anime_list;

  for (const animeName in animeList) {
    const anime = animeList[animeName];
    const content = anime.content;

    for (const season in content) {
      let details = content[season];
      const mal_id = details.mal_id;

      try {
        const updated = await fetchAnimeData(mal_id);
        // Overwrite existing keys with updated data
        for (const key in updated) {
          details[key] = updated[key];
        }
        // Reorder keys in details
        const reordered = {};
        for (const key of reorderKeys) {
          if (details.hasOwnProperty(key)) {
            reordered[key] = details[key];
          }
        }
        // Append any keys not in reorderKeys
        for (const key in details) {
          if (!reorderKeys.includes(key)) {
            reordered[key] = details[key];
          }
        }
        content[season] = reordered;

        console.log(`Updated ${animeName} - ${season}`);
      } catch (err) {
        console.error(`Failed to update ${animeName} - ${season}:`, err.message);
      }

      await sleep(1100);
    }
  }

  try {
    console.log('Writing to:', DATA_PATH);
    fs.writeFileSync(DATA_PATH, JSON.stringify(json, null, 2));
    console.log('Write complete');
  } catch (err) {
    console.error('Error writing data.json:', err.message);
  }
}

(async () => {
  console.log('Script started');
  await updateAnimeData();
})();
