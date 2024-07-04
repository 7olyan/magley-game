require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const dataPath = path.join(__dirname, 'data.json');

const readFile = (path) => new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(JSON.parse(data));
    });
});

const writeFile = (path, data) => new Promise((resolve, reject) => {
    fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
    });
});

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: true });

const clients = new Map();

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    try {
        const data = await readFile(dataPath);
        const players = data.players || [];
        const player = players.find(p => p.id === chatId);

        if (!player) {
            players.push({ id: chatId, name: fullName, clicks: 0 });
            await writeFile(dataPath, { players });
        }
    } catch (err) {
        console.error('Error handling /start command', err);
    }

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Играть',
                        web_app: { url: `https://7olyan.github.io/magley-game/?userId=${chatId}` } // Замените на ваш URL
                    }
                ]
            ]
        }
    };
    bot.sendMessage(chatId, 'Для начала игры нажмите кнопку ниже', opts);
});

// Serve static files from the "docs" directory
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// WebSocket connection
wss.on('connection', (ws, req) => {
    ws.on('message', async (message) => {
        const { userId, action } = JSON.parse(message);

        if (action === 'click') {
            try {
                const data = await readFile(dataPath);
                const players = data.players || [];
                const player = players.find(p => p.id === userId);

                if (player) {
                    player.clicks += 1;
                    await writeFile(dataPath, { players });

                    const totalClicks = players.reduce((acc, player) => acc + player.clicks, 0);
                    const sortedPlayers = players.sort((a, b) => b.clicks - a.clicks);

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ totalClicks, leaderboard: sortedPlayers }));
                        }
                    });
                }
            } catch (err) {
                console.error('Error processing click', err);
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
