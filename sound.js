// 音效管理模塊

// 音效對象
let sounds = {
    bgMusic: null,
    collisionSound: null,
    victorySound: null,
    moveSound: null
};

// 初始化所有音效
function initSounds() {
    // 背景音樂
    sounds.bgMusic = new Audio();
    sounds.bgMusic.src = 'https://assets.mixkit.co/sfx/preview/mixkit-game-level-music-689.mp3';
    sounds.bgMusic.loop = true;
    sounds.bgMusic.volume = 0.5;
    
    // 碰撞音效
    sounds.collisionSound = new Audio();
    sounds.collisionSound.src = 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-game-over-213.mp3';
    
    // 勝利音效
    sounds.victorySound = new Audio();
    sounds.victorySound.src = 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3';
    
    // 移動音效
    sounds.moveSound = new Audio();
    sounds.moveSound.src = 'https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.mp3';
    sounds.moveSound.volume = 0.3;
}

// 播放背景音樂
function playBgMusic() {
    if (sounds.bgMusic.paused) {
        sounds.bgMusic.currentTime = 0;
        playSound(sounds.bgMusic, '背景音樂');
    }
}

// 暫停背景音樂
function pauseBgMusic() {
    sounds.bgMusic.pause();
}

// 播放碰撞音效
function playCollisionSound() {
    sounds.collisionSound.currentTime = 0;
    playSound(sounds.collisionSound, '碰撞音效');
}

// 播放勝利音效
function playVictorySound() {
    sounds.victorySound.currentTime = 0;
    playSound(sounds.victorySound, '勝利音效');
}

// 播放移動音效
function playMoveSound() {
    sounds.moveSound.currentTime = 0;
    playSound(sounds.moveSound, '移動音效');
}

// 通用播放音效函數，包含錯誤處理和重試機制
function playSound(sound, soundName) {
    sound.play().catch(e => {
        console.log(`無法播放${soundName}:`, e);
        // 嘗試再次播放
        setTimeout(() => {
            sound.play().catch(err => console.log(`再次嘗試播放${soundName}失敗:`, err));
        }, 100);
    });
}

// 導出音效函數
window.SoundManager = {
    initSounds,
    playBgMusic,
    pauseBgMusic,
    playCollisionSound,
    playVictorySound,
    playMoveSound,
    sounds
};