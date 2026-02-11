const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const user = tg.initDataUnsafe?.user;

if (user) {
    fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            telegram_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            photo_url: user.photo_url
        })
    });
}

function navigate(page) {
    const content = document.getElementById("content");

    if (page === "profile") {
        content.innerHTML = `
            <h2>Профиль</h2>
            <p><b>ID:</b> ${user?.id || ""}</p>
            <p><b>Имя:</b> ${user?.first_name || ""}</p>
            <p><b>Username:</b> @${user?.username || ""}</p>
        `;
    }

    if (page === "snake") {
        content.innerHTML = `
            <h2>🐍 Snake</h2>
            <p>Рекорд: <span id="bestScore">0</span></p>
            <canvas id="gameCanvas" width="300" height="300"></canvas>
            <p id="gameOver" style="color:red;"></p>
            <button onclick="startGame()">Начать</button>
            <h3>🏆 Топ 10</h3>
            <div id="leaderboard"></div>
        `;
        loadBestScore();
        loadLeaderboard();
    }
}

navigate("profile");

let canvas, ctx, snake, food, dx, dy, gameInterval, score;

function startGame() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    snake = [{ x: 150, y: 150 }];
    food = randomFood();
    dx = 10;
    dy = 0;
    score = 0;

    document.getElementById("gameOver").innerText = "";
    clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 100);
}

function updateGame() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (
        head.x < 0 || head.x >= 300 ||
        head.y < 0 || head.y >= 300 ||
        snake.some(seg => seg.x === head.x && seg.y === head.y)
    ) {
        clearInterval(gameInterval);
        document.getElementById("gameOver").innerText = "Игра окончена! Очки: " + score;
        saveBestScore(score);
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        food = randomFood();
    } else {
        snake.pop();
    }

    drawGame();
}

function drawGame() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.fillStyle = "lime";
    snake.forEach(seg => ctx.fillRect(seg.x, seg.y, 10, 10));
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, 10, 10);
}

function randomFood() {
    return {
        x: Math.floor(Math.random() * 30) * 10,
        y: Math.floor(Math.random() * 30) * 10
    };
}

document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -10; }
    if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 10; }
    if (e.key === "ArrowLeft" && dx === 0) { dx = -10; dy = 0; }
    if (e.key === "ArrowRight" && dx === 0) { dx = 10; dy = 0; }
});

async function loadBestScore() {
    const res = await fetch(`/api/best-score/${user.id}`);
    const data = await res.json();
    document.getElementById("bestScore").innerText = data.best_score;
}

async function saveBestScore(score) {
    await fetch("/api/best-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            telegram_id: user.id,
            score: score
        })
    });
    loadBestScore();
    loadLeaderboard();
}

async function loadLeaderboard() {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    document.getElementById("leaderboard").innerHTML =
        data.map(u => `<p>@${u.username || "no_name"} — ${u.best_score}</p>`).join("");
}
