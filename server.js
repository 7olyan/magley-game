require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = 3000;

const dataPath = path.join(__dirname, 'data.json');

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: true });

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data', err);
        } else {
            const jsonData = JSON.parse(data);
            const players = jsonData.players || [];
            const player = players.find(p => p.id === chatId);

            if (!player) {
                players.push({ id: chatId, name: fullName, clicks: 0 });
                fs.writeFile(dataPath, JSON.stringify({ players }), 'utf8', (err) => {
                    if (err) {
                        console.error('Error saving data', err);
                    }
                });
            }
        }
    });

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Играть',
                        web_app: { url: 'https://7olyan.github.io/magley-game/' } // Замените на ваш URL
                    }
                ]
            ]
        }
    };
    bot.sendMessage(chatId, 'Для начала игры нажмите кнопку ниже', opts);
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// Endpoint to handle click
app.post('/click', express.json(), (req, res) => {
    const { user } = req.body;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data');
        } else {
            const jsonData = JSON.parse(data);
            const players = jsonData.players || [];
            const player = players.find(p => p.name === user);

            if (player) {
                player.clicks += 1;
            }

            fs.writeFile(dataPath, JSON.stringify({ players }), 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error saving data');
                } else {
                    res.status(201).send('Click recorded');
                }
            });
        }
    });
});

// Endpoint to get leaderboard
app.get('/leaderboard', (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data');
        } else {
            const jsonData = JSON.parse(data);
            const players = jsonData.players || [];
            const sortedPlayers = players.sort((a, b) => b.clicks - a.clicks);
            res.send(sortedPlayers);
        }
    });
});

app.listen(port, () => {
    console.log(`Magley's Accord is racing!`);
});
