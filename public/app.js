const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const user = tg.initDataUnsafe?.user;

// Отправляем пользователя на сервер
if(user){
    fetch("/api/user", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            telegram_id:user.id,
            first_name:user.first_name,
            last_name:user.last_name,
            username:user.username,
            photo_url:user.photo_url
        })
    });
}

// Создаём HTML
document.getElementById("content").innerHTML = `
<h2>🐍 Snake Mobile</h2>
<p>Рекорд: <span id="bestScore">0</span></p>
<canvas id="gameCanvas"></canvas>
<p id="gameOver" style="color:red;"></p>
<button onclick="startGame()">Начать</button>

<!-- Кнопки управления -->
<div id="controls">
    <button onclick="changeDirection('up')">⬆️</button>
    <div>
        <button onclick="changeDirection('left')">⬅️</button>
        <button onclick="changeDirection('down')">⬇️</button>
        <button onclick="changeDirection('right')">➡️</button>
    </div>
</div>

<h3>🏆 Топ 10</h3>
<div id="leaderboard"></div>
`;

let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let tiles = 20;
let snake, food, dx, dy, score, interval;
let speed = 250; // начальная скорость

// Подгоняем canvas под экран
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetWidth;
}
window.addEventListener("resize", () => { resizeCanvas(); draw(); });
resizeCanvas();

// Начало игры
function startGame() {
    snake = [{x:10, y:10}];
    dx = 1;
    dy = 0;
    score = 0;
    food = randomFood();
    document.getElementById("gameOver").innerText = "";
    clearInterval(interval);
    speed = 250;
    draw(); // сразу рисуем стартовую змейку
    interval = setInterval(update, speed);
}

// Логика игры
function update() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};

    // Столкновение
    if (head.x < 0 || head.y < 0 || head.x >= tiles || head.y >= tiles ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
        clearInterval(interval);
        document.getElementById("gameOver").innerText = "Твоя змейка умерла, учись играть! Очки: " + score;
        saveBestScore(score);
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        food = randomFood();

        // Увеличиваем скорость каждые 10 очков
        if (score % 10 === 0) {
            speed = Math.max(30, speed * 0.9);
            clearInterval(interval);
            interval = setInterval(update, speed);
        }
    } else {
        snake.pop();
    }

    draw();
}

// Отрисовка
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tileSize = canvas.width / tiles;

    // фон игрового поля
    ctx.fillStyle = "#50C878";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // тело змейки
    ctx.fillStyle = "lime";
    for (let i = 1; i < snake.length; i++) {
        const s = snake[i];
        ctx.fillRect(s.x*tileSize, s.y*tileSize, tileSize-2, tileSize-2);
    }

    // голова
    if (snake.length >= 1) {
        const head = snake[0];
        ctx.fillStyle = "yellow";
        ctx.fillRect(head.x*tileSize, head.y*tileSize, tileSize-2, tileSize-2);
    }

    // еда
    ctx.fillStyle = "red";
    ctx.fillRect(food.x*tileSize, food.y*tileSize, tileSize-2, tileSize-2);
}

// Случайная позиция еды
function randomFood() {
    return { x: Math.floor(Math.random() * tiles), y: Math.floor(Math.random() * tiles) };
}

// Управление свайпами
let touchStartX=0, touchStartY=0;
canvas.addEventListener("touchstart", e => { 
    touchStartX = e.touches[0].clientX; 
    touchStartY = e.touches[0].clientY; 
});
canvas.addEventListener("touchend", e => {
    let dxTouch = e.changedTouches[0].clientX - touchStartX;
    let dyTouch = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dxTouch) > Math.abs(dyTouch)){
        if(dxTouch > 0 && dx !== -1){ dx = 1; dy = 0; }
        else if(dxTouch < 0 && dx !== 1){ dx = -1; dy = 0; }
    } else {
        if(dyTouch > 0 && dy !== -1){ dx = 0; dy = 1; }
        else if(dyTouch < 0 && dy !== 1){ dx = 0; dy = -1; }
    }
});

// Управление кнопками
function changeDirection(direction) {
    switch(direction){
        case 'up': if(dy !== 1){ dx = 0; dy = -1; } break;
        case 'down': if(dy !== -1){ dx = 0; dy = 1; } break;
        case 'left': if(dx !== 1){ dx = -1; dy = 0; } break;
        case 'right': if(dx !== -1){ dx = 1; dy = 0; } break;
    }
}

// Работа с рекордом
async function loadBestScore() {
    const res = await fetch(`/api/best-score/${user.id}`);
    const data = await res.json();
    document.getElementById("bestScore").innerText = data.best_score;
}
async function saveBestScore(score) {
    await fetch("/api/best-score", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ telegram_id: user.id, score })
    });
    loadBestScore();
    loadLeaderboard();
}

// Лидерборд
async function loadLeaderboard() {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    document.getElementById("leaderboard").innerHTML = data
        .map(u => `<div>@${u.username || "no_name"} — ${u.best_score}</div>`)
        .join("");
}

// Загружаем рекорд и лидерборд при старте
loadBestScore();
loadLeaderboard();

