const { Telegraf, Markup, session, Scenes } = require("telegraf");
const fs = require("fs");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN2);
bot.use(session());

const episodesFile = "json/episodes.json";
if (!fs.existsSync(episodesFile)) fs.writeFileSync(episodesFile, JSON.stringify({ anime_list: {} }, null, 2));

const extras = JSON.parse(fs.readFileSync("json/extras.json", "utf8"));

const loadEpisodes = () => JSON.parse(fs.readFileSync(episodesFile, "utf-8"));
const saveEpisodes = (data) => fs.writeFileSync(episodesFile, JSON.stringify(data, null, 2));

bot.use(async (ctx, next) => {
  console.log("Update received:", ctx.update);
  return next();
});

const addAnimeWizard = new Scenes.WizardScene(
  "ADD_ANIME_WIZARD",
  async (ctx) => {
    await ctx.reply("Send the anime name:");
    ctx.wizard.state.animeData = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.animeData.name = ctx.message?.text;
    if (!ctx.wizard.state.animeData.name) return ctx.reply("Invalid name, try again.");
    await ctx.reply("Number of seasons:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const numSeasons = parseInt(ctx.message?.text);
    if (isNaN(numSeasons) || numSeasons <= 0) return ctx.reply("Invalid number, try again.");
    ctx.wizard.state.animeData.seasons = numSeasons;
    ctx.wizard.state.animeData.episodes = {};
    ctx.wizard.state.currentSeason = 1;
    await ctx.reply(`Number of episodes for Season 1:`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const numEpisodes = parseInt(ctx.message?.text);
    if (isNaN(numEpisodes) || numEpisodes <= 0) return ctx.reply("Invalid number, try again.");

    const { animeData, currentSeason } = ctx.wizard.state;
    animeData.episodes[`s${currentSeason}`] = {};

    for (let j = 1; j <= numEpisodes; j++) {
      animeData.episodes[`s${currentSeason}`][`ep${j}`] = {
        ep_name: `Episode ${j}`,
        ep_number: j,
        file_size: "N/A",
        file_url_360p: "N/A",
        file_url_720p: "N/A",
        file_url_1080p: "N/A",
      };
    }

    if (currentSeason < animeData.seasons) {
      ctx.wizard.state.currentSeason++;
      await ctx.reply(`Number of episodes for Season ${ctx.wizard.state.currentSeason}:`);
      return;
    }

    const existingData = loadEpisodes();
    existingData.anime_list[animeData.name] = animeData.episodes;
    saveEpisodes(existingData);

    await ctx.reply(`✅ Anime "${animeData.name}" has been added!`);
    return ctx.scene.leave();
  }
);

const editEpisodeWizard = new Scenes.WizardScene(
  "EDIT_EPISODE_WIZARD",
  async (ctx) => {
    const episodes = loadEpisodes();
    const animeButtons = Object.keys(episodes.anime_list).map((anime) =>
      Markup.button.callback(anime, `anime_${anime}`)
    );

    if (animeButtons.length === 0) return ctx.reply("No anime available!");

    await ctx.reply("Choose an anime:", Markup.inlineKeyboard(animeButtons, { columns: 1 }));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.selectedAnime = ctx.callbackQuery.data.replace("anime_", "");

    const episodes = loadEpisodes();
    const seasons = Object.keys(episodes.anime_list[ctx.wizard.state.selectedAnime]);

    const seasonButtons = seasons.map((season) => Markup.button.callback(season, `season_${season}`));
    await ctx.reply(`Choose a season:`, Markup.inlineKeyboard(seasonButtons, { columns: 1 }));

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.selectedSeason = ctx.callbackQuery.data.replace("season_", "");

    const episodes = loadEpisodes();
    const { selectedAnime, selectedSeason } = ctx.wizard.state;
    const episodeButtons = Object.keys(episodes.anime_list[selectedAnime][selectedSeason]).map(
      (ep) => Markup.button.callback(ep, `ep_${ep}`)
    );

    await ctx.reply("Choose an episode to edit:", Markup.inlineKeyboard(episodeButtons, { columns: 3 }));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.epNumber = ctx.callbackQuery.data.replace("ep_", "");

    await ctx.reply("Choose quality to edit:", Markup.inlineKeyboard([
      [Markup.button.callback("360p", "360p"), Markup.button.callback("720p", "720p"), Markup.button.callback("1080p", "1080p")],
    ]));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.quality = ctx.callbackQuery.data;
    await ctx.reply(`Enter new file URL for ${ctx.wizard.state.quality}:`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.fileUrl = ctx.message?.text;
    if (!ctx.wizard.state.fileUrl.startsWith("http")) return ctx.reply("Invalid URL, try again.");
    
    await ctx.reply("Enter new file size (e.g., 500MB):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.fileSize = ctx.message?.text;
    const episodes = loadEpisodes();
    const { selectedAnime, selectedSeason, epNumber, quality, fileSize, fileUrl } = ctx.wizard.state;

    if (!episodes.anime_list[selectedAnime]?.[selectedSeason]?.[`ep${epNumber}`]) {
      return ctx.reply("❌ Episode doesn't exist!");
    }

    const episodeData = episodes.anime_list[selectedAnime][selectedSeason][`ep${epNumber}`];

    episodeData.file_size = fileSize;
    episodeData[`file_url_${quality}`] = fileUrl;

    saveEpisodes(episodes);
    await ctx.reply(`✅ Episode ${epNumber} updated successfully with ${quality} quality!`);
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([addAnimeWizard, editEpisodeWizard]);
bot.use(stage.middleware());

bot.start(async (ctx) => {
  await ctx.reply("Welcome! Choose an option:", Markup.inlineKeyboard([
    [Markup.button.callback("📂 View Anime List", "view_anime")],
    [Markup.button.callback("➕ Add Anime", "add_anime")],
    [Markup.button.callback("✏️ Edit Episode", "edit_episode")],
  ]));
});

bot.action("view_anime", async (ctx) => {
  const episodes = loadEpisodes();
  const animeButtons = Object.keys(episodes.anime_list).map((anime) =>
    Markup.button.callback(anime, `anime_${anime}`)
  );

  if (animeButtons.length === 0) return ctx.reply("No anime added yet!");
  await ctx.reply("Choose an anime:", Markup.inlineKeyboard(animeButtons, { columns: 1 }));
});

bot.action("add_anime", (ctx) => ctx.scene.enter("ADD_ANIME_WIZARD"));
bot.action("edit_episode", (ctx) => ctx.scene.enter("EDIT_EPISODE_WIZARD"));

bot.launch().then(() => console.log("Bot is running...")).catch((err) => console.error("Error:", err));
