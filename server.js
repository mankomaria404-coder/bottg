const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server started");
});
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
// Получить рекорд игрока
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

// Обновить рекорд
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

// Топ 10 игроков
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
