const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");

const bot = new Telegraf("8080886112:AAEi4A5SBK4RG796gvi-oTWMZqFvCGvm3rI");

// Load or initialize data
const CHANNELS_FILE = "./data/channels.json";
let botData = fs.existsSync(CHANNELS_FILE) ? JSON.parse(fs.readFileSync(CHANNELS_FILE)) : { channels: [] };

// Function to save data
function saveData() {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(botData, null, 2));
}

// Save a new channel
function saveChannel(channelId) {
    if (!botData.channels.includes(channelId)) {
        botData.channels.push(channelId);
        saveData();
    }
}

// Get a saved channel
function getChannel() {
    return botData.channels.length > 0 ? botData.channels[0] : null;
}

// User session storage
let userState = {};

// Start command
bot.start((ctx) => {
    let channelId = getChannel();
    if (channelId) {
        ctx.reply(
            "📌 Choose an option:",
            Markup.inlineKeyboard([
                [Markup.button.callback("✅ Send Episodes", "send_episodes")],
                [Markup.button.callback("📊 Send Poll", "send_poll")],
            ])
        );
    } else {
        ctx.reply("⚠️ Please forward a message from the channel first.");
        userState[ctx.from.id] = { step: "waiting_for_channel" };
    }
});

// Handle button clicks
bot.action("send_episodes", (ctx) => {
    ctx.reply("📅 Enter the number of seasons (e.g., 1):");
    userState[ctx.from.id] = { step: "waiting_for_seasons", episodes: {}, currentSeason: 1 };
});

bot.action("send_poll", async (ctx) => {
    let channelId = getChannel();
    if (!channelId) return ctx.reply("⚠️ No channel found. Forward a message first.");

    sendRatingPoll(channelId);
    ctx.reply("✅ Poll sent!");
});

// Message handling
bot.on("message", async (ctx) => {
    let userId = ctx.from.id;
    let state = userState[userId] || {};

    if (state.step === "waiting_for_channel") {
        if (ctx.message.forward_from_chat) {
            let channelId = ctx.message.forward_from_chat.id;
            saveChannel(channelId);
            ctx.reply("✅ Channel saved! Now, enter the number of seasons:");
            userState[userId] = { step: "waiting_for_seasons", channelId, episodes: {}, currentSeason: 1 };
        } else {
            ctx.reply("⚠️ Forward a valid channel message.");
        }
    } 
    else if (state.step === "waiting_for_seasons") {
        let seasons = parseInt(ctx.message.text);
        if (!isNaN(seasons) && seasons > 0) {
            userState[userId].seasons = seasons;
            userState[userId].step = "waiting_for_episodes";
            ctx.reply(`📅 Now enter the number of episodes for Season 1:`);
        } else {
            ctx.reply("⚠️ Invalid input. Please enter a valid number.");
        }
    } 
    else if (state.step === "waiting_for_episodes") {
        let seasonNum = userState[userId].currentSeason;
        let episodes = parseInt(ctx.message.text);

        if (!isNaN(episodes) && episodes > 0) {
            userState[userId].episodes[seasonNum] = episodes;

            if (seasonNum < userState[userId].seasons) {
                userState[userId].currentSeason++;
                ctx.reply(`📅 Now enter the number of episodes for Season ${userState[userId].currentSeason}:`);
            } else {
                userState[userId].step = "waiting_for_anime_code";
                ctx.reply("✅ All seasons recorded! Now enter the anime code:");
            }
        } else {
            ctx.reply("⚠️ Enter a valid number of episodes.");
        }
    } 
    else if (state.step === "waiting_for_anime_code") {
        userState[userId].animeCode = ctx.message.text;
        userState[userId].step = "ready_to_send";
        ctx.reply("✅ Anime code recorded! Now sending messages...");

        sendMessages(userId);
    }
});

// Send messages with delay
async function sendMessages(userId) {
    let state = userState[userId];
    let channelId = state.channelId;
    let animeCode = state.animeCode;

    for (let season = 1; season <= state.seasons; season++) {
        for (let episode = 1; episode <= state.episodes[season]; episode++) {
            let messageText = `
📺 <b>Season ${season} Episode ${episode}</b> 🟢`;

            let videoButtons = Markup.inlineKeyboard([
                [
                    Markup.button.url("1080p", `https://t.me/noasagaanime_bot?start=${animeCode}_s${season}_${episode}_1080p`),
                    Markup.button.url("720p", `https://t.me/noasagaanime_bot?start=${animeCode}_s${season}_${episode}_720p`),
                    Markup.button.url("360p", `https://t.me/noasagaanime_bot?start=${animeCode}_s${season}_${episode}_360p`),
                ],
            ]);

            try {
                await bot.telegram.sendMessage(channelId, messageText, { 
                    parse_mode: "HTML", 
                    ...videoButtons 
                });
                await new Promise(resolve => setTimeout(resolve, 12000)); // 2-second delay
            } catch (error) {
                console.log("❌ Error sending message:", error);
            }
        }
    }

    // After sending all episodes, prompt for poll
    bot.telegram.sendMessage(
        channelId,
        "Would you like to send a rating poll?",
        Markup.inlineKeyboard([[Markup.button.callback("📊 Send Poll", "send_poll")]])
    );
}

// Function to send a rating poll
async function sendRatingPoll(channelId) {
    try {
        await bot.telegram.sendPoll(
            channelId,
            "🎭 Rate this anime!",
            ["2/10", "4/10", "6/10", "8/10", "10/10"],
            { is_anonymous: true }
        );
    } catch (error) {
        console.error("❌ Error sending poll:", error);
    }
}

// Start bot
bot.launch();
console.log("🤖 Bot is running...");
