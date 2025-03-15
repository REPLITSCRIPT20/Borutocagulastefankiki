const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'uploads/' });
let clients = {};

// API pentru upload creds.json
app.post('/upload_creds', upload.single('file'), (req, res) => {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ success: false, message: "User ID necesar!" });

    const userPath = path.join(__dirname, 'sessions', userId);
    if (!fs.existsSync(userPath)) fs.mkdirSync(userPath, { recursive: true });

    fs.rename(req.file.path, path.join(userPath, 'creds.json'), (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Eroare la salvare!' });

        clients[userId] = new Client({
            authStrategy: new LocalAuth({ dataPath: userPath }),
            puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        });

        clients[userId].on('ready', () => console.log(`✅ Utilizator ${userId} conectat!`));
        clients[userId].initialize();
        res.json({ success: true, message: 'WhatsApp inițializat!' });
    });
});

app.post('/send_message', (req, res) => {
    const { userId, targets, messageText, delay } = req.body;
    if (!clients[userId]) return res.status(400).json({ success: false, message: "Utilizator neautentificat!" });

    targets.split(',').forEach((number, index) => {
        setTimeout(() => {
            clients[userId].sendMessage(number.trim() + '@c.us', messageText)
                .then(() => console.log(`✅ Mesaj trimis către ${number} de la ${userId}`))
                .catch(err => console.error(`❌ Eroare la ${number}:`, err));
        }, delay * 1000 * index);
    });

    res.json({ success: true, message: "Mesajele sunt în curs de trimitere!" });
});

app.listen(port, () => console.log(`🚀 Serverul rulează la http://localhost:${port}`));
