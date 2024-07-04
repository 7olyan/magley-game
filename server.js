require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const dataPath = path.join(__dirname, 'data.json');

// Endpoint to get all players
app.get('/players', (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data');
        } else {
            res.send(JSON.parse(data));
        }
    });
});

// Endpoint to add a new player
app.post('/players', express.json(), (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data');
        } else {
            const players = JSON.parse(data).players;
            players.push(req.body);
            fs.writeFile(dataPath, JSON.stringify({ players }), 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error saving data');
                } else {
                    res.status(201).send('Player added');
                }
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
