const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

async function fetchAnimeData(mal_id) {
  const base = 'https://api.jikan.moe/v4/anime/';
  const res = await axios.get(`${base}${mal_id}/full`);
  const data = res.data.data;

  return {
    mal_id: mal_id,
    aired_on: data.aired.from || '',
    title: data.title || '',
    rating: data.rating || '',
    genres: data.genres.map(g => g.name),
    studio: data.studios?.[0]?.name || '',
    production_company: data.producers?.[0]?.name || '',
    official_site: data.url || '',
    streaming_links: [], // Jikan doesn't provide this
    synopsis: data.synopsis || '',
    prequel: '', // Jikan doesn't directly provide this
    sequel: '',  // same
    spin_off: '', // same
    start_date: data.aired.from || '',
    end_date: data.aired.to || '',
    total_episodes: data.episodes || 0,
    popularity_rank: data.popularity?.toString() || '',
    language: data.type || '',
    dubbed: data.title_english || '',
    poster_image_url: data.images?.jpg?.image_url || '',
    trailer_url: data.trailer?.url || ''
  };
}

async function updateAnimeData() {
  const file = fs.readFileSync(DATA_PATH, 'utf-8');
  const json = JSON.parse(file);

  const animeList = json.anime_list;

  for (const animeName in animeList) {
    const anime = animeList[animeName];
    const content = anime.content;

    for (const season in content) {
      const details = content[season];
      const mal_id = details.mal_id;

      try {
        const updated = await fetchAnimeData(mal_id);

        // Overwrite fields with fetched data
        for (const key in updated) {
          details[key] = updated[key];
        }

        console.log(`Updated ${animeName} - ${season}`);
      } catch (err) {
        console.error(`Failed to update ${animeName} - ${season}:`, err.message);
      }
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(json, null, 2));
}

// Update every hour
cron.schedule('0 * * * *', () => {
  updateAnimeData();
});
