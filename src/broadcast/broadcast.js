const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

const ADMIN_IDS = [7020664469]; // Replace with actual admin Telegram user IDs

// Your bot token
const bot = new Telegraf('');

let userData = {}; // Store user data temporarily

const delay = require('util').promisify(setTimeout);

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// Middleware to restrict access to admins only
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return; // Ignore updates without user id
  if (!isAdmin(userId)) {
    ctx.reply("The bot is in repairing right now please wait for some time!!!");
    return; // Stop processing further middleware/handlers
  }
  return next();
});

// 📤 Sends message to users from data/userIds.json
async function sendToUsersFromFile(uploaderId) {
  try {
    const filePath = path.join(__dirname, '../../data', 'userIds.json');
    const rawData = fs.readFileSync(filePath);
    const userIds = JSON.parse(rawData);

    if (userIds.length === 0) {
      console.log("❌ No users found in the file.");
      return;
    }

    if (!userData[uploaderId]) {
      console.log(`❌ No message data found for uploader ${uploaderId}`);
      return;
    }

    const { fileId, messageText, buttonText, buttonUrl } = userData[uploaderId];

    let successCount = 0;
    let errorCount = 0;

    for (let receiverId of userIds) {
      try {
        await bot.telegram.sendPhoto(receiverId, fileId, {
          caption: messageText,
          reply_markup: {
            inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
          },
        });
        console.log(`✅ Sent to user: ${receiverId}`);
        successCount++;
        await delay(200);
      } catch (err) {
        console.error(`❌ Failed to send to user ${receiverId}:`, err);
        errorCount++;
      }
    }

    console.log(`✅ Total Success: ${successCount} users`);
    console.log(`❌ Total Errors: ${errorCount} users`);

  } catch (err) {
    console.error("❌ Error reading the user IDs file or sending to users:", err);
  }
}

bot.start((ctx) => {
  ctx.reply('Welcome! Upload an image, I’ll send it with a button to users in the file.');
});

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const fileId = ctx.message.photo[0].file_id;
  userData[userId] = { fileId };

  ctx.reply('Got the image! Now enter the message text:');
});

bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const user = userData[userId];
  if (!user) return;

  if (!user.messageText) {
    user.messageText = ctx.message.text;
    ctx.reply('Now enter the button text:');
  } else if (!user.buttonText) {
    user.buttonText = ctx.message.text;
    ctx.reply('Now send the button URL:');
  } else if (!user.buttonUrl) {
    user.buttonUrl = ctx.message.text;

    const { fileId, messageText, buttonText, buttonUrl } = userData[userId];
    ctx.replyWithPhoto(fileId, {
      caption: messageText,
      reply_markup: {
        inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
      },
    });
    ctx.reply('Type "yes" to confirm and send it to users from the file.');
  } else {
    if (ctx.message.text.toLowerCase() === 'yes') {
      ctx.reply('Sending message...');
      sendToUsersFromFile(userId);
      delete userData[userId];
    } else {
      ctx.reply('Cancelled. Upload a new image to start again.');
      delete userData[userId];
    }
  }
});

bot.launch().then(() => console.log("Bot started ✅"));
