require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf("7846813473:AAGentIPQ68PUJA2sxj99mMsWpA-Oe9j2yc");
const dataFile = './data/data.json';
const userState = {};

function loadData() {
    if (!fs.existsSync(dataFile)) {
        console.log("❌ data.json not found, returning empty object.");
        return { anime_list: {} };
    }
    const rawData = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(rawData);
}

function saveData(data) {
    console.log("💾 Saving Data:", JSON.stringify(data, null, 2));  // Debugging line
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

bot.start((ctx) => {
    ctx.reply(
        'Welcome! Choose an option:',
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add Anime', 'add_anime')],
            [Markup.button.callback('✏️ Edit Anime', 'edit_anime')]
        ])
    );
});


bot.action('add_anime', (ctx) => {
    userState[ctx.from.id] = { step: 'anime_name' };
    ctx.editMessageText('Enter the anime name:');
});


bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state) return;

    const data = loadData();
    const userInput = ctx.message.text.trim();

    // ✅ Step 1: Enter Anime Name
    if (state.step === 'anime_name') {
        if (data.anime_list[userInput]) {
            delete userState[userId];
            return ctx.reply('❌ Anime already exists.');
        }

        state.animeName = userInput;
        state.animeId = (67900 + Object.keys(data.anime_list).length + 1).toString(); // Generate unique ID
        state.step = 'season_count';
        state.seasonData = {};

        return ctx.reply(`✅ Anime '${state.animeName}' added! Now enter the number of seasons:`);
    }

    // ✅ Step 2: Enter Season Count
    if (state.step === 'season_count') {
        const seasonCount = parseInt(userInput);
        if (isNaN(seasonCount) || seasonCount < 1) return ctx.reply('❌ Invalid number! Try again.');

        state.seasonCount = seasonCount;
        state.currentSeason = 1;
        state.step = 'episode_count';

        return ctx.reply(`📢 Enter the number of episodes for Season 1:`);
    }

    // ✅ Step 3: Enter Episodes per Season
    if (state.step === 'episode_count') {
        const episodeCount = parseInt(userInput);
        if (isNaN(episodeCount) || episodeCount < 1) return ctx.reply('❌ Invalid number! Try again.');

        const seasonKey = `Season ${state.currentSeason}`;

        state.seasonData[seasonKey] = {
            season_id: `s${state.currentSeason}`,
            episodes: {}
        };

        for (let i = 1; i <= episodeCount; i++) {
            state.seasonData[seasonKey].episodes[`Episode ${i}`] = {
                ep_name: `Episode ${i}`,
                ep_number: i.toString(),
                qualities: {
                    "360p": { file_url: "N/A", file_id: "", file_unique_id: "", file_size: "N/A MB" },
                    "720p": { file_url: "N/A", file_id: "", file_unique_id: "", file_size: "N/A" },
                    "1080p": { file_url: "N/A", file_id: "", file_unique_id: "", file_size: "N/A" }
                }
            };
        }

        if (state.currentSeason < state.seasonCount) {
            state.currentSeason++;
            return ctx.reply(`📢 Episodes added! Now enter the number of episodes for Season ${state.currentSeason}:`);
        }

        // ✅ Save Data
        data.anime_list[state.animeName] = {
            anime_id: state.animeId,
            ...state.seasonData
        };
        saveData(data);

        delete userState[userId];
        ctx.reply(`🎉 Anime '${state.animeName}' added with ${state.seasonCount} seasons!`);
    }
});

// 🔹 Edit Anime Start
bot.action('edit_anime', async (ctx) => {
    const data = loadData();
    const animeList = Object.keys(data.anime_list);

    if (animeList.length === 0) return ctx.reply("❌ No anime available to edit.");

    await ctx.editMessageText(
        "Select an anime to edit:",
        Markup.inlineKeyboard(
            animeList.map(name => [Markup.button.callback(name, `anime_${encodeURIComponent(name)}`)])
        )
    );
});

// 🔹 Select Anime
bot.action(/^anime_(.+)$/, async (ctx) => {
    const animeName = decodeURIComponent(ctx.match[1]);
    const data = loadData();

    if (!data.anime_list[animeName]) return ctx.answerCbQuery("❌ Invalid selection!");

    const seasons = Object.keys(data.anime_list[animeName]).filter(key => key !== "anime_id");

    await ctx.editMessageText(
        `📌 Selected Anime: *${animeName}*\n\nChoose a season:`,
        Markup.inlineKeyboard(
            seasons.map(name => [Markup.button.callback(name, `season_${encodeURIComponent(animeName)}_${name}`)])
        )
    );
});

// 🔹 Select Season
bot.action(/^season_(.+)_(.+)$/, async (ctx) => {
    const animeName = decodeURIComponent(ctx.match[1]);
    const seasonName = ctx.match[2];
    const data = loadData();

    if (!data.anime_list[animeName][seasonName]) return ctx.answerCbQuery("❌ Invalid selection!");

    const episodes = Object.keys(data.anime_list[animeName][seasonName].episodes);

    await ctx.editMessageText(
        `📌 Selected: *${animeName}* > *${seasonName}*\n\nChoose an episode:`,
        Markup.inlineKeyboard(
            episodes.map(name => [
                Markup.button.callback(name, `episode_${encodeURIComponent(animeName)}_${seasonName}_${name}`)
            ])
        )
    );
});

// 🔹 Select Episode & Prompt for Files
bot.action(/^episode_(.+)_(.+)_(.+)$/, async (ctx) => {
    const animeName = decodeURIComponent(ctx.match[1]);
    const seasonName = ctx.match[2];
    const episodeName = ctx.match[3];

    userState[ctx.from.id] = {
        animeName,
        seasonName,
        episodeName,
        step: 'waiting_for_file'
    };

    await ctx.reply(
        `📌 Selected: *${animeName}* > *${seasonName}* > *${episodeName}*\n\n📂 Please send up to *3 files* (one for each quality: 360p, 720p, 1080p).`
    );
});

// 🔹 Reset state on bot restart
const fileQueue = {};  // Resets on every restart

bot.on('video', async (ctx) => {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state || state.step !== 'waiting_for_file') return;

    const file = ctx.message.video;
    if (!file) return ctx.reply("❌ No file detected. Please send a valid video file.");

    const data = loadData();
    const episodeData = data.anime_list[state.animeName][state.seasonName].episodes[state.episodeName];

    // 🔹 Ensure 'qualities' object exists
    if (!episodeData.qualities) episodeData.qualities = { '360p': {}, '720p': {}, '1080p': {} };

    // 🔹 Reset file queue for the current episode on bot restart
    if (!fileQueue[state.animeName]) fileQueue[state.animeName] = {};
    if (!fileQueue[state.animeName][state.seasonName]) fileQueue[state.animeName][state.seasonName] = {};
    if (!fileQueue[state.animeName][state.seasonName][state.episodeName]) {
        fileQueue[state.animeName][state.seasonName][state.episodeName] = [];
    }

    const qualityOrder = ['360p', '720p', '1080p'];
    const currentQueue = fileQueue[state.animeName][state.seasonName][state.episodeName];

    // 🔹 Assign the file to the next quality slot or overwrite the oldest one
    let targetQuality = qualityOrder[currentQueue.length % 3];

    episodeData.qualities[targetQuality] = {
        file_url: "n/a",
        file_id: file.file_id,
        file_unique_id: file.file_unique_id,
        file_size: `${(file.file_size / (1024 * 1024)).toFixed(2)} MB`
    };

    // 🔹 Add file to tracking queue
    currentQueue.push(file.file_id);

    saveData(data);

    await ctx.reply(
        `✅ *File Saved Successfully!*\n\n` +
        `📌 *Anime:* ${state.animeName}\n` +
        `📌 *Season:* ${state.seasonName}\n` +
        `📌 *Episode:* ${state.episodeName}\n` +
        `📌 *Quality:* ${targetQuality} (Updated)\n\n` +
        `📂 *File ID:* \`${file.file_id}\`\n` +
        `🔑 *Unique File ID:* \`${file.file_unique_id}\`\n` +
        `📏 *File Size:* ${((file.file_size) / (1024 * 1024)).toFixed(2)} MB`
    );
});

// Start the bot
bot.launch();
