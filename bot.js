require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const express = require("express");
const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN1);
const API_URL = "https://noasaga-api-main.onrender.com/anime/data";

// ✅ Fetch Anime Data
let cachedData = {}; // Store previous data for comparison

const fetchAnimeData = async () => {
    try {
        const response = await axios.get(API_URL);
        console.log("✅ API Data Fetched Successfully");

        const newData = response.data;
        if (JSON.stringify(newData) !== JSON.stringify(cachedData)) {
            console.log("🔄 New update detected!");
            cachedData = newData;
            // You can notify users about the update here
        } else {
            console.log("✅ No new updates.");
        }

        return newData;
    } catch (error) {
        console.error("❌ Failed to fetch anime data:", error.message);
        return null;
    }
};

// ✅ Check for updates every 30 seconds
setInterval(fetchAnimeData, 30000);

// ✅ Fetch immediately when the bot starts
fetchAnimeData();

// ✅ Paginate Helper
const paginate = (items, page = 1, pageSize = 10) => ({
    paginatedItems: items.slice((page - 1) * pageSize, page * pageSize),
    totalPages: Math.ceil(items.length / pageSize),
});

// ✅ Pagination Buttons
const paginationButtons = (prefix, page, totalPages) => {
    let buttons = [];
    if (page > 1)
        buttons.push(Markup.button.callback("⬅️ Prev", `${prefix}_${page - 1}`));
    if (page < totalPages)
        buttons.push(Markup.button.callback("Next ➡️", `${prefix}_${page + 1}`));
    return buttons.length > 0 ? [buttons] : [];
};

// ✅ Show Anime List
bot.start(async (ctx) => {
    const animeData = await fetchAnimeData();
    if (!animeData) return ctx.reply("❌ Failed to fetch anime list");

    const animeList = Object.keys(animeData);
    if (!animeList.length) return ctx.reply("❌ No anime found");

    const { paginatedItems, totalPages } = paginate(animeList, 1);

    ctx.reply(
        "🎭 Select an anime:",
        Markup.inlineKeyboard([
            ...paginatedItems.map((anime) => [Markup.button.callback(anime, `anime_${anime}`)]),
            ...paginationButtons("anime_page", 1, totalPages),
        ])
    );
});

bot.action(/^anime_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    const animeData = await fetchAnimeData();
    if (!animeData) return ctx.reply("❌ Failed to fetch anime list");

    const animeList = Object.keys(animeData);
    const { paginatedItems, totalPages } = paginate(animeList, page);

    ctx.editMessageReplyMarkup(
        Markup.inlineKeyboard([
            ...paginatedItems.map((anime) => [Markup.button.callback(anime, `anime_${anime}`)]),
            ...paginationButtons("anime_page", page, totalPages),
        ])
    );
});

// ✅ Anime Selection
bot.action(/^anime_(.+)$/, async (ctx) => {
    const anime = ctx.match[1];
    const animeData = await fetchAnimeData();
    if (!animeData || !animeData[anime]) return ctx.reply("❌ Anime not found");

    const seasons = Object.keys(animeData[anime]).filter((s) => s !== "anime_id");
    if (!seasons.length) return ctx.reply("❌ No seasons available for this anime");

    ctx.reply(
        `📺 Select a season for *${anime}*:`,
        Markup.inlineKeyboard(
            seasons.map((season) => [Markup.button.callback(season, `season_${anime}_${season}`)])
        )
    );
});

// ✅ Show Episodes
const showEpisodeList = async (ctx, anime, season, page = 1) => {
    const animeData = await fetchAnimeData();
    if (!animeData || !animeData[anime] || !animeData[anime][season])
        return ctx.reply("❌ Season not found");

    const episodes = Object.keys(animeData[anime][season]).filter((e) => e !== "season_id");
    const { paginatedItems, totalPages } = paginate(episodes, page);

    ctx.reply(
        `📜 Episodes for *${anime} - ${season}*:`,
        Markup.inlineKeyboard([
            ...paginatedItems.map((ep) => [
                Markup.button.callback(
                    animeData[anime][season][ep].ep_name,
                    `episode_${anime}_${season}_${ep}`
                ),
            ]),
            ...paginationButtons(`episode_page_${anime}_${season}`, page, totalPages),
        ])
    );
};

bot.action(/^season_(.+)_(.+)$/, async (ctx) => {
    const [anime, season] = ctx.match.slice(1);
    await showEpisodeList(ctx, anime, season, 1);
});

bot.action(/^episode_page_(.+)_(.+)_(\d+)$/, async (ctx) => {
    const [anime, season, page] = ctx.match.slice(1);
    await showEpisodeList(ctx, anime, season, parseInt(page));
});

// ✅ Episode Selection
bot.action(/^episode_(.+)_(.+)_(.+)$/, async (ctx) => {
    const [anime, season, ep] = ctx.match.slice(1);
    const animeData = await fetchAnimeData();
    if (!animeData || !animeData[anime] || !animeData[anime][season][ep])
        return ctx.reply("❌ Episode not found");

    const epData = animeData[anime][season][ep];

    const qualityButtons = Object.entries(epData.qualities || {})
        .filter(([_, data]) => data.file_url?.startsWith("http"))
        .map(([quality, data]) => [
            Markup.button.url(`${quality} (${data.file_size})`, data.file_url),
        ]);

    if (!qualityButtons.length) {
        return ctx.reply(`❌ No download links available for *${epData.ep_name}*`);
    }

    ctx.reply(
        `📥 Download options for *${epData.ep_name}*:`,
        Markup.inlineKeyboard(qualityButtons)
    );
});

// ✅ Express Server
app.get("/", (req, res) => {
    res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// ✅ Launch Bot
bot.launch();
console.log("🤖 Bot is running...");
