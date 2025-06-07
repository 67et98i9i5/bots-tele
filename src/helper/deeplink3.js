const { updateDeeplink3Log } = require('../helper/deeplinklogger');
const { getAnimeTitle } = require('../helper/titleHandler');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function handleDeeplink3({ ctx, animeCode, seasonId, quality, data }) {
  const userId = String(ctx.from.id);

  const animeEntry = Object.entries(data.anime_list).find(
    ([_, anime]) => anime.anime_id === animeCode
  );

  if (!animeEntry) {
    return ctx.reply('❌ Anime not found.');
  }

  const [, animeData] = animeEntry;

  const seasonKey = Object.keys(animeData.content).find(key => {
    const normalizedKey = key.toLowerCase().replace(/\s|-/g, '');
    const normalizedInput = seasonId.toLowerCase().replace(/\s|-/g, '');

    if (normalizedKey === normalizedInput) return true;
    if (normalizedKey === 'season' + normalizedInput.replace(/^s/, '')) return true;
    return false;
  });

  if (!seasonKey) {
    return ctx.reply('❌ Season not found.');
  }

  const season = animeData.content[seasonKey];

  if (!season) {
    return ctx.reply('❌ Season not found.');
  }

  const episodeEntries = Object.entries(season.episodes);

  episodeEntries.sort((a, b) => {
    const numA = parseInt(a[0].replace('Episode ', ''));
    const numB = parseInt(b[0].replace('Episode ', ''));
    return numA - numB;
  });

  const title = getAnimeTitle(animeCode, seasonId) || 'Unknown Title';

  let sentCount = 0;

  for (const [epName, episode] of episodeEntries) {
    const q = episode.qualities[quality];
    if (!q) continue;

    const caption = `
🎬 *${title}* — ${epName}
📥 Quality: *${quality}*
💾 ${q.file_size}
🔗 [Episode Link](${episode.episode_link})
    `.trim();

    try {
      await ctx.replyWithVideo(q.file_id, {
        caption,
        parse_mode: 'Markdown',
      });

      updateDeeplink3Log(userId, animeCode, seasonId, epName, quality);
      sentCount++;
      await sleep(300);
    } catch (error) {
      console.error(`❌ Failed to send ${epName}:`, error.message);
    }
  }

  if (sentCount === 0) {
    return ctx.reply(`❌ No episodes found in *${quality}* quality.`, { parse_mode: 'Markdown' });
  }

  ctx.reply(`✅ Sent ${sentCount} episodes in *${quality}* quality.`, { parse_mode: 'Markdown' });
};
