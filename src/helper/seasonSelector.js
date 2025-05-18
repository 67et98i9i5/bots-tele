const { Markup } = require('telegraf');
const { updateUserLog } = require('./logger');

function handleSeasonSelection(ctx, animeName, data) {
  const userId = String(ctx.from.id);
  const anime = data.anime_list[animeName];
  if (!anime) return ctx.reply('❌ Anime not found.');

  const seasons = Object.keys(anime.content);
  const seasonButtons = seasons.map(season =>
    [Markup.button.callback(`📅 ${season}`, `season_${animeName}_${season}`)]
  );

  ctx.editMessageText('📅 Select a Season:', Markup.inlineKeyboard(seasonButtons));
}

module.exports = handleSeasonSelection;
