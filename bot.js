require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN1);

const API_URL = "https://noasaga-api-main.onrender.com/anime/data";
let cachedData = {};

// Logging Setup
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const updatesLog = path.join(logsDir, "updates.txt");
const actionsLog = path.join(logsDir, "actions.txt");

const logToFile = (file, message, userId = "Unknown") => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [User ID: ${userId}] ${message}\n`;
    fs.appendFile(file, logMessage, (err) => {
        if (err) console.error("❌ Failed to write log:", err);
    });
    if (file === actionsLog) console.log(logMessage.trim()); // Only print actionsLog to console
};

// Fetch Anime Data
const fetchAnimeData = async () => {
    try {
        const response = await axios.get(API_URL);
        cachedData = response.data;
        logToFile(updatesLog, "API Data Fetched");
    } catch (error) {
        logToFile(updatesLog, `Fetch Failed - ${error.message}`);
    }
};

setInterval(fetchAnimeData, 30000);
fetchAnimeData();

// Load Personalities
const personalities = JSON.parse(fs.readFileSync(path.join(__dirname, "json", "personalities.json")));
let userPersonalities = {}; // Default personality storage

const getMessage = (ctx, key, placeholders = {}) => {
    const userId = ctx.from.id;
    const personality = userPersonalities[userId] || "Rias Gremory";
    let message = personalities[personality]?.[key] || personalities["Rias Gremory"][key];

    Object.entries(placeholders).forEach(([k, v]) => {
        message = message.replace(`{${k}}`, v);
    });

    return message;
};

// Change Personality Command
bot.command("changepersonality", (ctx) => {
    ctx.reply(getMessage(ctx, "select_personality"), Markup.inlineKeyboard(
        Object.keys(personalities).map(name => [Markup.button.callback(name, `set_personality_${name}`)])
    ));
});

// Handle Personality Change
bot.action(/^set_personality_(.+)$/, (ctx) => {
    const userId = ctx.from.id;
    userPersonalities[userId] = ctx.match[1];
    ctx.reply(getMessage(ctx, "personality_changed", { personality: ctx.match[1] }));
});

// Show Anime List
const showAnimeList = (ctx) => {
    const animeList = Object.keys(cachedData || {});
    if (!animeList.length) return ctx.reply(getMessage(ctx, "no_anime"));

    ctx.reply(
        getMessage(ctx, "select_anime"),
        Markup.inlineKeyboard(animeList.map(anime => [Markup.button.callback(anime, `anime_${anime}`)]))
    );
};

// Show Season List
const showSeasonList = (ctx, anime) => {
    const seasons = Object.keys(cachedData[anime] || {}).filter(key => key !== "anime_id");
    if (!seasons.length) return ctx.reply(getMessage(ctx, "season_not_found"));

    ctx.reply(
        getMessage(ctx, "select_season", { anime }),
        Markup.inlineKeyboard(seasons.map(season => [Markup.button.callback(season, `season_${anime}_${season}`)])),
        { parse_mode: "Markdown" }
    );
};

// Show Episode List
const showEpisodeList = (ctx, anime, season) => {
    if (!cachedData[anime] || !cachedData[anime][season]) {
        return ctx.reply(`❌ Season *${season}* not found for *${anime}*.`);
    }

    const episodes = Object.keys(cachedData[anime][season]).filter(
        key => !["season_id", "season_name"].includes(key)
    );

    if (!episodes.length) {
        return ctx.reply(`❌ No episodes found for *${anime} - ${season}*.`);
    }

    ctx.reply(
        `🎬 Select an episode for *${anime} - ${season}*:`,
        Markup.inlineKeyboard(episodes.map(ep => [Markup.button.callback(`${ep}`, `episode_${anime}_${season}_${ep}`)])),
        { parse_mode: "Markdown" }
    );
};

// Handle User Interactions
bot.start((ctx) => {
    if (!Object.keys(cachedData).length) return ctx.reply(getMessage(ctx, "no_anime"));
    showAnimeList(ctx);
});

bot.command("api", (ctx) => {
    ctx.reply("🌐 Noasaga API: https://noasaga-api-main.onrender.com");
});

bot.command("mainchannel", (ctx) => {
    ctx.reply("📢 Noasaga Main Channel: https://t.me/NoasagaAnime");
});

bot.command("socials", (ctx) => {
    ctx.reply("📱 Socials: Coming soon!");
});

bot.action(/^anime_(.+)$/, (ctx) => {
    const anime = ctx.match[1];
    logToFile(actionsLog, `User selected anime: ${anime}`, ctx.from.id);
    if (!cachedData[anime]) return ctx.reply("❌ Anime not found.");
    showSeasonList(ctx, anime);
});

bot.action(/^season_(.+)_(.+)$/, (ctx) => {
    const [anime, season] = ctx.match.slice(1);
    logToFile(actionsLog, `User selected season: ${season} of ${anime}`, ctx.from.id);
    if (!cachedData[anime]?.[season]) return ctx.reply("❌ Season not found.");
    showEpisodeList(ctx, anime, season);
});

// **Fixed Episode Selection**
bot.action(/^episode_(.+)_(.+)_(.+)$/, (ctx) => {
    const [anime, season, ep] = ctx.match.slice(1);
    logToFile(actionsLog, `User selected episode: ${ep} of ${anime} - ${season}`, ctx.from.id);

    // Fix Telegram's underscore issue & normalize episode names
    const formattedEp = ep.replace(/_/g, " ").trim().toLowerCase();

    // Get list of episodes and normalize them for comparison
    const episodeKeys = Object.keys(cachedData[anime]?.[season] || {});
    const matchedEp = episodeKeys.find(e => e.trim().toLowerCase() === formattedEp);

    if (!matchedEp) {
        return ctx.reply(`❌ Episode *${ep}* not found in *${anime} - ${season}*.`);
    }

    const epData = cachedData[anime][season][matchedEp];

    // Generate quality buttons (only show valid links)
    const qualityButtons = Object.entries(epData.qualities || {})
        .filter(([_, data]) => data.file_url && data.file_url !== "N/A" && data.file_url.startsWith("http"))
        .map(([quality, data]) => [Markup.button.url(`${quality} (${data.file_size})`, data.file_url)]);

    if (!qualityButtons.length) {
        return ctx.reply(`❌ No valid download links found for *${epData.ep_name}*.`);
    }

    ctx.reply(
        `🎥 Download options for *${epData.ep_name}*`,
        Markup.inlineKeyboard(qualityButtons),
        { parse_mode: "Markdown" }
    );
});

bot.action("no_link", (ctx) => {
    ctx.answerCbQuery("❌ No link available for this quality.");
});

// Express Server
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(process.env.PORT || 3000, () => console.log("🚀 Server is running..."));

bot.launch();
console.log("🤖 Bot is running...");
