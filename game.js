// 遊戲常數
// 初始格子大小，將在關卡初始化時動態調整
let CELL_SIZE = 40; // 每個格子的大小
let PLAYER_SIZE = 20; // 玩家角色大小
let OBSTACLE_SIZE = 15; // 障礙物大小
let GOAL_SIZE = 25; // 終點大小

// 畫布的最大尺寸
const MAX_CANVAS_WIDTH = 600;
const MAX_CANVAS_HEIGHT = 600;

// 遊戲變數
let canvas, ctx;
let gameInterval;
let animationFrame;
let level = 1;
let timeLeft = 30;
let isGameRunning = false;
let maze = [];
let player = { x: 0, y: 0, speed: 5 };
let goal = { x: 0, y: 0 };
let obstacles = [];
let movingObstacles = [];
let keys = { up: false, down: false, left: false, right: false };

// 音效
let bgMusic;
let collisionSound;
let victorySound;

// DOM 元素
let levelElement;
let timerElement;
let startBtn;
let restartBtn;
let gameOverScreen;
let gameOverTitle;
let gameOverMessage;
let playAgainBtn;

// 初始化遊戲
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 獲取 DOM 元素
    levelElement = document.getElementById('level');
    timerElement = document.getElementById('timer');
    startBtn = document.getElementById('startBtn');
    restartBtn = document.getElementById('restartBtn');
    gameOverScreen = document.getElementById('gameOverScreen');
    gameOverTitle = document.getElementById('gameOverTitle');
    gameOverMessage = document.getElementById('gameOverMessage');
    playAgainBtn = document.getElementById('playAgainBtn');
    
    // 初始化音效
    initSounds();
    
    // 事件監聽
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);
    
    // 鍵盤控制
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // 繪製初始畫面
    drawStartScreen();
};

// 初始化音效
function initSounds() {
    // 使用SoundManager初始化音效
    window.SoundManager.initSounds();
    
    // 設置音效引用
    bgMusic = window.SoundManager.sounds.bgMusic;
    collisionSound = window.SoundManager.sounds.collisionSound;
    victorySound = window.SoundManager.sounds.victorySound;
}

// 開始畫面
function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4CAF50';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('反應迷宮', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '16px Arial';
    ctx.fillText('點擊「開始遊戲」按鈕開始挑戰', canvas.width / 2, canvas.height / 2 + 20);
}

// 開始遊戲
function startGame() {
    level = 1;
    startBtn.disabled = true;
    restartBtn.disabled = false;
    gameOverScreen.style.display = 'none';
    initLevel();
    window.SoundManager.playBgMusic();
}

// 重新開始遊戲
function restartGame() {
    level = 1;
    gameOverScreen.style.display = 'none';
    initLevel();
    window.SoundManager.playBgMusic();
}

// 初始化關卡
function initLevel() {
    // 更新 UI
    levelElement.textContent = level;
    
    // 重置障礙物
    obstacles = [];
    movingObstacles = [];
    
    // 設定關卡參數
    const mazeSize = 5 + Math.min(4, Math.floor(level / 2) * 2); // 5x5, 7x7, 9x9...
    const obstacleCount = 3 + level * 2;
    const movingObstacleCount = Math.min(level - 1, 5); // 從第二關開始有移動障礙物
    timeLeft = Math.max(10, 30 - level * 2); // 時間隨關卡減少，最少10秒
    player.speed = 5 + Math.min(3, Math.floor(level / 3)); // 玩家速度隨關卡增加
    
    // 動態調整格子大小，確保迷宮適合畫布
    // 計算合適的格子大小，使迷宮能夠完全顯示在畫布中
    // 設定最小和最大格子大小限制，避免格子過大或過小
    const minCellSize = 30; // 最小格子大小
    const maxCellSize = 60; // 最大格子大小
    
    CELL_SIZE = Math.min(
        Math.floor(MAX_CANVAS_WIDTH / mazeSize),
        Math.floor(MAX_CANVAS_HEIGHT / mazeSize)
    );
    
    // 確保CELL_SIZE在合理範圍內
    CELL_SIZE = Math.max(minCellSize, Math.min(CELL_SIZE, maxCellSize));
    
    // 根據CELL_SIZE調整其他元素大小
    PLAYER_SIZE = Math.max(10, Math.floor(CELL_SIZE * 0.5)); // 玩家大小為格子的一半，但最小為10
    OBSTACLE_SIZE = Math.max(8, Math.floor(CELL_SIZE * 0.4)); // 障礙物大小為格子的40%，但最小為8
    GOAL_SIZE = Math.max(12, Math.floor(CELL_SIZE * 0.6)); // 終點大小為格子的60%，但最小為12
    
    // 更新畫布大小
    canvas.width = mazeSize * CELL_SIZE;
    canvas.height = mazeSize * CELL_SIZE;
    
    // 生成迷宮
    generateMaze(mazeSize);
    
    // 隨機設置玩家位置，確保不會與障礙物或牆壁重疊
    setRandomPlayerPosition(mazeSize);
    
    // 隨機設置終點位置，確保不會與玩家、障礙物或牆壁重疊
    setRandomGoalPosition(mazeSize);
    
    // 生成障礙物
    generateObstacles(obstacleCount, movingObstacleCount, mazeSize);
    
    // 更新計時器
    timerElement.textContent = timeLeft;
    
    // 確保背景音樂正在播放
    if (bgMusic.paused) {
        window.SoundManager.playBgMusic();
    }
    
    // 開始遊戲循環
    isGameRunning = true;
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateTimer, 1000);
    
    // 開始動畫循環
    if (animationFrame) cancelAnimationFrame(animationFrame);
    gameLoop();
}

// 生成迷宮
function generateMaze(size) {
    maze = [];
    
    // 創建空迷宮
    for (let y = 0; y < size; y++) {
        let row = [];
        for (let x = 0; x < size; x++) {
            // 0 表示通道，1 表示牆
            row.push(0);
        }
        maze.push(row);
    }
    
    // 添加一些隨機牆壁，但確保有路徑可以從起點到終點
    // 這裡使用簡單的隨機生成，而不是完整的迷宮算法
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // 跳過起點和終點附近的格子
            if ((x < 2 && y < 2) || (x > size - 3 && y > size - 3)) {
                continue;
            }
            
            // 跳過關鍵路徑上的格子，確保至少有一條路徑
            // 保留第一行和最後一列作為安全路徑
            if (y === 0 || x === size - 1) {
                continue;
            }
            
            // 隨機生成牆壁，但保持較低的密度以確保可通行
            if (Math.random() < 0.2) {
                // 創建臨時迷宮副本進行路徑檢查
                let tempMaze = [];
                for (let ty = 0; ty < size; ty++) {
                    tempMaze[ty] = [...maze[ty]];
                }
                tempMaze[y][x] = 1; // 臨時設置為牆
                
                // 只有當設置為牆後仍有路徑時，才真正設置為牆
                if (hasPath(tempMaze, 0, 0, size-1, size-1, size)) {
                    maze[y][x] = 1;
                }
            }
        }
    }
    
    // 確保從起點到終點有路徑
    // 清除邊緣，確保至少有一條路徑
    for (let i = 0; i < size; i++) {
        // 清除上邊緣和右邊緣，形成一條路徑
        maze[0][i] = 0;
        maze[i][size - 1] = 0;
    }
}

// 生成障礙物
function generateObstacles(count, movingCount, mazeSize) {
    obstacles = [];
    movingObstacles = [];
    
    // 創建一個臨時迷宮副本，用於路徑檢查
    let tempMaze = [];
    for (let y = 0; y < mazeSize; y++) {
        tempMaze[y] = [...maze[y]];
    }
    
    // 生成靜態障礙物
    for (let i = 0; i < count - movingCount; i++) {
        let obstacle;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 50; // 最大嘗試次數，防止無限循環
        
        // 嘗試找到有效位置
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            const cellX = Math.floor(Math.random() * mazeSize);
            const cellY = Math.floor(Math.random() * mazeSize);
            
            // 檢查該格子是否是牆
            if (maze[cellY][cellX] === 1) {
                continue; // 如果是牆，重新選擇
            }
            
            // 檢查是否在關鍵路徑上
            // 避免在從(0,0)到(mazeSize-1,mazeSize-1)的路徑上放置障礙物
            if ((cellX === 0 && cellY === 0) || 
                (cellX === mazeSize-1 && cellY === mazeSize-1) ||
                (cellX < mazeSize-1 && cellY === 0) ||
                (cellX === mazeSize-2 && cellY < mazeSize-1)) {
                continue;
            }
            
            const x = cellX * CELL_SIZE + CELL_SIZE / 2;
            const y = cellY * CELL_SIZE + CELL_SIZE / 2;
            
            // 檢查是否與玩家或終點重疊
            const distToPlayer = Math.hypot(x - player.x, y - player.y);
            const distToGoal = Math.hypot(x - goal.x, y - goal.y);
            
            if (distToPlayer > CELL_SIZE * 1.5 && distToGoal > CELL_SIZE * 1.5) {
                // 臨時標記該位置為牆，檢查是否仍有路徑
                tempMaze[cellY][cellX] = 1;
                
                // 檢查是否仍有從起點到終點的路徑
                if (hasPath(tempMaze, 0, 0, mazeSize-1, mazeSize-1, mazeSize)) {
                    obstacle = { x, y };
                    validPosition = true;
                } else {
                    // 如果沒有路徑，恢復該位置
                    tempMaze[cellY][cellX] = 0;
                }
            }
        }
        
        // 如果找到有效位置，添加障礙物
        if (validPosition) {
            obstacles.push(obstacle);
        }
    }
    
    // 生成移動障礙物
    for (let i = 0; i < movingCount; i++) {
        let obstacle;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 50; // 最大嘗試次數
        
        // 嘗試找到有效位置
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            const cellX = Math.floor(Math.random() * mazeSize);
            const cellY = Math.floor(Math.random() * mazeSize);
            
            // 檢查該格子是否是牆
            if (maze[cellY][cellX] === 1) {
                continue; // 如果是牆，重新選擇
            }
            
            // 檢查是否在關鍵路徑上
            if ((cellX === 0 && cellY === 0) || 
                (cellX === mazeSize-1 && cellY === mazeSize-1) ||
                (cellX < mazeSize-1 && cellY === 0) ||
                (cellX === mazeSize-2 && cellY < mazeSize-1)) {
                continue;
            }
            
            const x = cellX * CELL_SIZE + CELL_SIZE / 2;
            const y = cellY * CELL_SIZE + CELL_SIZE / 2;
            
            // 檢查是否與玩家或終點重疊
            const distToPlayer = Math.hypot(x - player.x, y - player.y);
            const distToGoal = Math.hypot(x - goal.x, y - goal.y);
            
            if (distToPlayer > CELL_SIZE * 2 && distToGoal > CELL_SIZE * 2) {
                // 隨機移動方向和速度
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * level * 0.5; // 速度隨關卡增加
                
                obstacle = {
                    x,
                    y,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed
                };
                validPosition = true;
            }
        }
        
        // 如果找到有效位置，添加障礙物
        if (validPosition) {
            movingObstacles.push(obstacle);
        }
    }
}

// 檢查是否有從起點到終點的路徑（使用廣度優先搜索）
function hasPath(maze, startX, startY, endX, endY, size) {
    // 創建訪問標記數組
    let visited = [];
    for (let y = 0; y < size; y++) {
        visited[y] = [];
        for (let x = 0; x < size; x++) {
            visited[y][x] = false;
        }
    }
    
    // 創建隊列，存儲待訪問的格子
    let queue = [{x: startX, y: startY}];
    visited[startY][startX] = true;
    
    // 定義四個方向的移動
    const directions = [
        {dx: 0, dy: -1}, // 上
        {dx: 0, dy: 1},  // 下
        {dx: -1, dy: 0}, // 左
        {dx: 1, dy: 0}   // 右
    ];
    
    // 廣度優先搜索
    while (queue.length > 0) {
        const current = queue.shift();
        
        // 如果到達終點，返回true
        if (current.x === endX && current.y === endY) {
            return true;
        }
        
        // 嘗試四個方向
        for (const dir of directions) {
            const nextX = current.x + dir.dx;
            const nextY = current.y + dir.dy;
            
            // 檢查是否在迷宮範圍內
            if (nextX >= 0 && nextX < size && nextY >= 0 && nextY < size) {
                // 檢查是否是通道且未訪問過
                if (maze[nextY][nextX] === 0 && !visited[nextY][nextX]) {
                    queue.push({x: nextX, y: nextY});
                    visited[nextY][nextX] = true;
                }
            }
        }
    }
    
    // 如果隊列為空且未到達終點，返回false
    return false;
}

// 更新計時器
function updateTimer() {
    if (!isGameRunning) return;
    
    timeLeft--;
    timerElement.textContent = timeLeft;
    
    if (timeLeft <= 0) {
        gameOver(false, '時間用盡！');
    }
}

// 遊戲循環
function gameLoop() {
    if (!isGameRunning) return;
    
    update();
    draw();
    
    animationFrame = requestAnimationFrame(gameLoop);
}

// 更新遊戲狀態
function update() {
    // 更新玩家位置
    updatePlayerPosition();
    
    // 更新移動障礙物位置
    updateObstacles();
    
    // 檢查碰撞
    checkCollisions();
    
    // 檢查是否到達終點
    checkGoal();
}

// 更新玩家位置
function updatePlayerPosition() {
    // 獲取當前玩家所在的格子
    const currentCellX = Math.floor(player.x / CELL_SIZE);
    const currentCellY = Math.floor(player.y / CELL_SIZE);
    
    // 計算當前格子的中心位置
    const currentCellCenterX = currentCellX * CELL_SIZE + CELL_SIZE / 2;
    const currentCellCenterY = currentCellY * CELL_SIZE + CELL_SIZE / 2;
    
    // 增大中心判定閾值，避免卡在邊緣
    const centerThreshold = CELL_SIZE * 0.25; // 增加到格子大小的25%
    const distanceToCenter = Math.hypot(player.x - currentCellCenterX, player.y - currentCellCenterY);
    const isAtCellCenter = distanceToCenter < centerThreshold;
    
    // 確定移動方向
    let targetCellX = currentCellX;
    let targetCellY = currentCellY;
    let wantsToMove = false;
    
    // 只允許一個方向的移動，優先級：上 > 下 > 左 > 右
    if (keys.up) {
        targetCellY--;
        wantsToMove = true;
    } else if (keys.down) {
        targetCellY++;
        wantsToMove = true;
    } else if (keys.left) {
        targetCellX--;
        wantsToMove = true;
    } else if (keys.right) {
        targetCellX++;
        wantsToMove = true;
    }
    
    // 邊界檢查
    if (targetCellX < 0) targetCellX = 0;
    if (targetCellX >= maze[0].length) targetCellX = maze[0].length - 1;
    if (targetCellY < 0) targetCellY = 0;
    if (targetCellY >= maze.length) targetCellY = maze.length - 1;
    
    // 牆壁碰撞檢查
    let canMove = true;
    if (targetCellX !== currentCellX || targetCellY !== currentCellY) {
        // 檢查目標格子是否是牆
        if (maze[targetCellY][targetCellX] === 1) {
            canMove = false;
        }
    }
    
    // 改進的移動邏輯
    if (wantsToMove && canMove) {
        // 想移動且可以移動到新格子
        const targetX = targetCellX * CELL_SIZE + CELL_SIZE / 2;
        const targetY = targetCellY * CELL_SIZE + CELL_SIZE / 2;
        moveToPosition(targetX, targetY);
    } else if (!isAtCellCenter) {
        // 如果不在中心且不能移動到新格子，則移動到當前格子中心
        moveToPosition(currentCellCenterX, currentCellCenterY);
    }
    
    // 最後確保玩家不會超出迷宮邊界
    const mazeWidth = maze[0].length * CELL_SIZE;
    const mazeHeight = maze.length * CELL_SIZE;
    
    if (player.x < CELL_SIZE / 2) player.x = CELL_SIZE / 2;
    if (player.x > mazeWidth - CELL_SIZE / 2) player.x = mazeWidth - CELL_SIZE / 2;
    if (player.y < CELL_SIZE / 2) player.y = CELL_SIZE / 2;
    if (player.y > mazeHeight - CELL_SIZE / 2) player.y = mazeHeight - CELL_SIZE / 2;
}

// 抽取移動邏輯到單獨函數，簡化代碼
function moveToPosition(targetX, targetY) {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    
    // 計算移動距離
    const distance = Math.hypot(dx, dy);
    
    if (distance > 0) {
        // 調整速度因子，使移動更加平滑
        const speedFactor = 1.5; // 降低速度因子，避免過快導致的問題
        const moveSpeed = Math.min(player.speed * speedFactor, distance);
        
        // 計算移動量
        const moveX = dx / distance * moveSpeed;
        const moveY = dy / distance * moveSpeed;
        
        // 更新位置
        player.x += moveX;
        player.y += moveY;
        
        // 增大閾值，確保能夠準確到達目標位置
        const snapThreshold = 5; // 增大閾值，更容易吸附到目標位置
        if (Math.abs(player.x - targetX) < snapThreshold && 
            Math.abs(player.y - targetY) < snapThreshold) {
            // 直接設置到目標位置，避免卡住
            player.x = targetX;
            player.y = targetY;
        }
        
        // 播放移動音效
        if (Math.random() < 0.05) { // 降低音效播放頻率
            window.SoundManager.playMoveSound();
        }
    }
}

// 更新障礙物位置
function updateObstacles() {
    for (let obstacle of movingObstacles) {
        // 更新位置
        obstacle.x += obstacle.dx;
        obstacle.y += obstacle.dy;
        
        // 邊界反彈
        if (obstacle.x < OBSTACLE_SIZE || obstacle.x > canvas.width - OBSTACLE_SIZE) {
            obstacle.dx = -obstacle.dx;
            obstacle.x += obstacle.dx;
        }
        
        if (obstacle.y < OBSTACLE_SIZE || obstacle.y > canvas.height - OBSTACLE_SIZE) {
            obstacle.dy = -obstacle.dy;
            obstacle.y += obstacle.dy;
        }
    }
}

// 隨機設置玩家位置
function setRandomPlayerPosition(mazeSize) {
    let validPosition = false;
    
    while (!validPosition) {
        // 隨機選擇一個格子
        const cellX = Math.floor(Math.random() * mazeSize);
        const cellY = Math.floor(Math.random() * mazeSize);
        
        // 檢查該格子是否是牆
        if (maze[cellY][cellX] === 1) {
            continue; // 如果是牆，重新選擇
        }
        
        // 計算格子中心的坐標
        const x = cellX * CELL_SIZE + CELL_SIZE / 2;
        const y = cellY * CELL_SIZE + CELL_SIZE / 2;
        
        // 檢查是否與障礙物重疊
        let overlapsObstacle = false;
        
        for (let obstacle of obstacles) {
            const dist = Math.hypot(x - obstacle.x, y - obstacle.y);
            if (dist < (PLAYER_SIZE + OBSTACLE_SIZE) / 2) {
                overlapsObstacle = true;
                break;
            }
        }
        
        for (let obstacle of movingObstacles) {
            const dist = Math.hypot(x - obstacle.x, y - obstacle.y);
            if (dist < (PLAYER_SIZE + OBSTACLE_SIZE) / 2) {
                overlapsObstacle = true;
                break;
            }
        }
        
        if (!overlapsObstacle) {
            player.x = x;
            player.y = y;
            validPosition = true;
        }
    }
}

// 隨機設置終點位置
function setRandomGoalPosition(mazeSize) {
    let validPosition = false;
    
    while (!validPosition) {
        // 隨機選擇一個格子
        const cellX = Math.floor(Math.random() * mazeSize);
        const cellY = Math.floor(Math.random() * mazeSize);
        
        // 檢查該格子是否是牆
        if (maze[cellY][cellX] === 1) {
            continue; // 如果是牆，重新選擇
        }
        
        // 計算格子中心的坐標
        const x = cellX * CELL_SIZE + CELL_SIZE / 2;
        const y = cellY * CELL_SIZE + CELL_SIZE / 2;
        
        // 檢查是否與玩家重疊
        const distToPlayer = Math.hypot(x - player.x, y - player.y);
        if (distToPlayer < (PLAYER_SIZE + GOAL_SIZE) / 2) {
            continue; // 如果與玩家重疊，重新選擇
        }
        
        // 檢查是否與障礙物重疊
        let overlapsObstacle = false;
        
        for (let obstacle of obstacles) {
            const dist = Math.hypot(x - obstacle.x, y - obstacle.y);
            if (dist < (GOAL_SIZE + OBSTACLE_SIZE) / 2) {
                overlapsObstacle = true;
                break;
            }
        }
        
        for (let obstacle of movingObstacles) {
            const dist = Math.hypot(x - obstacle.x, y - obstacle.y);
            if (dist < (GOAL_SIZE + OBSTACLE_SIZE) / 2) {
                overlapsObstacle = true;
                break;
            }
        }
        
        // 確保終點與玩家之間有一定距離，避免遊戲太簡單
        if (!overlapsObstacle && distToPlayer > CELL_SIZE * 3) {
            goal.x = x;
            goal.y = y;
            validPosition = true;
        }
    }
}

// 檢查碰撞
function checkCollisions() {
    // 檢查與靜態障礙物的碰撞
    for (let obstacle of obstacles) {
        const dist = Math.hypot(player.x - obstacle.x, player.y - obstacle.y);
        if (dist < (PLAYER_SIZE + OBSTACLE_SIZE) / 2) {
            window.SoundManager.playCollisionSound();
            gameOver(false, '撞到障礙物！');
            return;
        }
    }
    
    // 檢查與移動障礙物的碰撞
    for (let obstacle of movingObstacles) {
        const dist = Math.hypot(player.x - obstacle.x, player.y - obstacle.y);
        if (dist < (PLAYER_SIZE + OBSTACLE_SIZE) / 2) {
            window.SoundManager.playCollisionSound();
            gameOver(false, '撞到移動障礙物！');
            return;
        }
    }
}

// 檢查是否到達終點
function checkGoal() {
    const dist = Math.hypot(player.x - goal.x, player.y - goal.y);
    if (dist < (PLAYER_SIZE + GOAL_SIZE) / 2) {
        levelComplete();
    }
}

// 關卡完成
function levelComplete() {
    // 確保勝利音效播放
    window.SoundManager.playVictorySound();
    
    level++;
    initLevel();
}

// 遊戲結束
function gameOver(success, message) {
    isGameRunning = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrame);
    
    if (!success) {
        window.SoundManager.playCollisionSound();
        window.SoundManager.pauseBgMusic();
    }
    
    // 顯示遊戲結束畫面
    gameOverTitle.textContent = success ? '恭喜過關！' : '遊戲結束';
    gameOverMessage.textContent = `${message} 你達到了第 ${level} 關，用時 ${30 - timeLeft} 秒。`;
    gameOverScreen.style.display = 'flex';
    
    // 重置按鈕狀態
    startBtn.disabled = false;
    restartBtn.disabled = false;
}

// 繪製遊戲
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製迷宮
    drawMaze();
    
    // 繪製終點
    drawGoal();
    
    // 繪製障礙物
    drawObstacles();
    
    // 繪製玩家
    drawPlayer();
}

// 繪製迷宮
function drawMaze() {
    const size = maze.length;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#333';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else {
                // 繪製格子線
                ctx.strokeStyle = '#ddd';
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

// 繪製玩家
function drawPlayer() {
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加眼睛，讓角色更有趣
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(player.x + 5, player.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(player.x + 5, player.y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加笑臉
    ctx.beginPath();
    ctx.arc(player.x, player.y + 3, 5, 0, Math.PI);
    ctx.stroke();
}

// 繪製終點
function drawGoal() {
    // 閃爍效果
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, GOAL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 星形效果
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const x = goal.x + Math.cos(angle) * (GOAL_SIZE / 2);
        const y = goal.y + Math.sin(angle) * (GOAL_SIZE / 2);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.stroke();
}

// 繪製障礙物
function drawObstacles() {
    // 繪製靜態障礙物
    ctx.fillStyle = '#FF5722';
    for (let obstacle of obstacles) {
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, OBSTACLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 繪製移動障礙物
    ctx.fillStyle = '#9C27B0';
    for (let obstacle of movingObstacles) {
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, OBSTACLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加動態效果
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, OBSTACLE_SIZE / 2 * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 鍵盤控制
function handleKeyDown(e) {
    if (!isGameRunning) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = true;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
    }
    
    // 防止方向鍵滾動頁面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = false;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
    }
}