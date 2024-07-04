require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = 3000;

const dataPath = path.join(__dirname, 'data.json');

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: true });

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const jsonData = JSON.parse(data);
        const players = jsonData.players || [];
        const player = players.find(p => p.id === chatId);

        if (!player) {
            players.push({ id: chatId, name: fullName, clicks: 0 });
            await fs.writeFile(dataPath, JSON.stringify({ players }), 'utf8');
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
                        web_app: { url: `https://7olyan.github.io/magley-game/?chatId=${chatId}` }
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

// Endpoint to handle click
app.post('/click', express.json(), async (req, res) => {
    const { chatId } = req.body;

    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const jsonData = JSON.parse(data);
        const players = jsonData.players || [];
        const player = players.find(p => p.id === chatId);

        if (player) {
            player.clicks += 1;
            await fs.writeFile(dataPath, JSON.stringify({ players }), 'utf8');
            res.status(201).send('Click recorded');
        } else {
            res.status(404).send('Player not found');
        }
    } catch (err) {
        res.status(500).send('Error processing click');
    }
});

// Endpoint to get leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const jsonData = JSON.parse(data);
        const players = jsonData.players || [];
        const sortedPlayers = players.sort((a, b) => b.clicks - a.clicks);
        res.send(sortedPlayers);
    } catch (err) {
        res.status(500).send('Error reading leaderboard');
    }
});

// Endpoint to get total clicks
app.get('/total-clicks', async (req, res) => {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const jsonData = JSON.parse(data);
        const totalClicks = jsonData.players.reduce((acc, player) => acc + player.clicks, 0);
        res.send({ totalClicks });
    } catch (err) {
        res.status(500).send('Error reading total clicks');
    }
});

app.listen(port, () => {
    console.log(`Server is running`);
});