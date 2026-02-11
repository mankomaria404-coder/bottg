const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.sqlite");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    photo_url TEXT,
    best_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

app.post("/api/user", (req, res) => {
    const { telegram_id, first_name, last_name, username, photo_url } = req.body;

    db.run(
        `INSERT INTO users (telegram_id, first_name, last_name, username, photo_url)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(telegram_id) DO UPDATE SET
            first_name=excluded.first_name,
            last_name=excluded.last_name,
            username=excluded.username,
            photo_url=excluded.photo_url`,
        [telegram_id, first_name, last_name, username, photo_url],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.get("/api/best-score/:id", (req, res) => {
    db.get(
        "SELECT best_score FROM users WHERE telegram_id = ?",
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ best_score: row?.best_score || 0 });
        }
    );
});

app.post("/api/best-score", (req, res) => {
    const { telegram_id, score } = req.body;

    db.run(
        `UPDATE users
         SET best_score = CASE
            WHEN best_score < ? THEN ?
            ELSE best_score
         END
         WHERE telegram_id = ?`,
        [score, score, telegram_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.get("/api/leaderboard", (req, res) => {
    db.all(
        "SELECT username, best_score FROM users ORDER BY best_score DESC LIMIT 10",
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
