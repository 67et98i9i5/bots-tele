const { Markup } = require('telegraf');

function handleAnimeSelection(ctx, data) {
  const userId = String(ctx.from.id);

  const animeButtons = Object.keys(data.anime_list).map(anime =>
    [Markup.button.callback(anime, `anime_${anime}`)]
  );

  ctx.reply('📺 Select an Anime:', Markup.inlineKeyboard(animeButtons));
}

module.exports = handleAnimeSelection;
