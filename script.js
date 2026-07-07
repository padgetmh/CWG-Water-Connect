/* ==========================================================
   COMBINED RUNTIME MODULES
   Folded into script.js so the page can load a single script.
========================================================== */

/* ==========================================================
   audio.js
========================================================== */

(() => {
  console.log("audio.js loaded");

  let musicEnabled = true;
  let sfxEnabled = true;

  const rotateSound = document.getElementById("rotateSound");
  const winSound = document.getElementById("winSound");
  const loseSound = document.getElementById("loseSound");
  const waterSound = document.getElementById("waterSound");
  const buttonSound = document.getElementById("buttonSound");
  const music = document.getElementById("backgroundMusic");

  const sounds = {
    click: buttonSound,
    rotate: rotateSound,
    win: winSound,
    fail: loseSound,
    flow: waterSound,
  };

  if (music) {
    music.loop = true;
    music.volume = 0.4;
  }

  function play(sound) {
    if (!sfxEnabled || !sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {
      // Ignore blocked autoplay errors.
    });
  }

  function playSound(name) {
    const sound = sounds[name];

    if (!sound) {
      console.warn("Sound not found:", name);
      return;
    }

    play(sound);
  }

  function playMusic() {
    if (!musicEnabled || !music) return;

    music.play().catch(() => {
      // Ignore blocked autoplay errors until user interaction.
    });
  }

  function stopMusic(reset = false) {
    if (!music) return;

    music.pause();
    if (reset) {
      music.currentTime = 0;
    }
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;

    if (musicEnabled) {
      playMusic();
    } else {
      stopMusic();
    }

    console.log("Music enabled:", musicEnabled);
  }

  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    console.log("SFX enabled:", sfxEnabled);
  }

  document.addEventListener("pipeRotated", () => {
    playSound("rotate");
  });

  document.addEventListener("pipesSolved", () => {
    playSound("win");
    playSound("flow");
    stopMusic(true);
  });

  document.addEventListener("timerExpired", () => {
    playSound("fail");
    stopMusic(true);
  });

  document.addEventListener("gameStart", () => {
    playMusic();
  });

  document.addEventListener("resetGame", () => {
    stopMusic(true);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const musicBtn = document.getElementById("musicBtn");
    const soundBtn = document.getElementById("soundBtn");
    const mapMusicBtn = document.getElementById("mapMusicBtn");
    const mapSoundBtn = document.getElementById("mapSoundBtn");

    function syncAudioButtonState() {
      [musicBtn, mapMusicBtn].forEach((btn) => {
        btn?.setAttribute("aria-pressed", String(musicEnabled));
        btn?.classList.toggle("audio-muted", !musicEnabled);
      });

      [soundBtn, mapSoundBtn].forEach((btn) => {
        btn?.setAttribute("aria-pressed", String(sfxEnabled));
        btn?.classList.toggle("audio-muted", !sfxEnabled);
      });
    }

    function onMusicToggle() {
      playSound("click");
      toggleMusic();
      syncAudioButtonState();
    }

    function onSoundToggle() {
      if (sfxEnabled) {
        playSound("click");
      }

      toggleSfx();

      if (sfxEnabled) {
        playSound("click");
      }

      syncAudioButtonState();
    }

    [musicBtn, mapMusicBtn, soundBtn, mapSoundBtn].forEach((btn) => {
      btn?.setAttribute("type", "button");
    });

    syncAudioButtonState();

    musicBtn?.addEventListener("click", onMusicToggle);
    mapMusicBtn?.addEventListener("click", onMusicToggle);

    soundBtn?.addEventListener("click", onSoundToggle);
    mapSoundBtn?.addEventListener("click", onSoundToggle);
  });

  window.audioSystem = {
    play,
    playSound,
    playMusic,
    stopMusic,
    toggleMusic,
    toggleSfx,
  };

  console.log("Audio system ready.");
})();

/* ==========================================================
   flow.js
========================================================== */

(() => {
  console.log("flow.js loaded");

  let flowActive = false;
  let timeoutHandles = [];

  function getPipe(index) {
    return document.querySelector(`.pipe[data-index="${index}"]`);
  }

  function clearTimeouts() {
    timeoutHandles.forEach((handle) => clearTimeout(handle));
    timeoutHandles = [];
  }

  function triggerSuccess(path) {
    flowActive = false;
    document.dispatchEvent(new CustomEvent("flowSuccess", { detail: { path } }));
  }

  function triggerFail(reason = "Flow failed") {
    flowActive = false;
    document.dispatchEvent(new CustomEvent("flowFail", { detail: { reason } }));
  }

  function startFlow(path) {
    if (flowActive) {
      return false;
    }

    const resolvedPath = Array.isArray(path) && path.length > 0
      ? path
      : window.gameController?.resolveFlowPath?.();

    if (!Array.isArray(resolvedPath) || resolvedPath.length === 0) {
      triggerFail("No valid flow path to animate.");
      return false;
    }

    flowActive = true;

    resolvedPath.forEach((index, order) => {
      const activateHandle = setTimeout(() => {
        const pipe = getPipe(index);
        if (!pipe) {
          triggerFail("A pipe in the flow path is missing.");
          return;
        }

        pipe.classList.remove("path-preview");
        pipe.classList.add("flow-active", "watered");
      }, order * 160);

      timeoutHandles.push(activateHandle);
    });

    const doneHandle = setTimeout(() => {
      clearTimeouts();
      triggerSuccess(resolvedPath);
    }, resolvedPath.length * 160 + 100);

    timeoutHandles.push(doneHandle);
    return true;
  }

  function resetFlow() {
    clearTimeouts();
    flowActive = false;
    document.querySelectorAll(".pipe").forEach((pipe) => {
      pipe.classList.remove("flow-active", "watered");
    });
  }

  window.flowSystem = {
    start: startFlow,
    reset: resetFlow,
    isActive: () => flowActive,
  };

  document.addEventListener("forceCheck", () => {
    startFlow();
  });

  document.addEventListener("flowSuccess", () => {
    document.dispatchEvent(new CustomEvent("pipesSolved"));
  });

  document.addEventListener("levelLoaded", () => {
    resetFlow();
  });

  console.log("Flow system ready.");
})();

/* ==========================================================
   timer.js
========================================================== */

(() => {
  console.log("timer.js loaded");

  let timeLeft = 0;
  let timerInterval = null;
  let isRunning = false;
  let elapsedMode = true;

  const timerDisplay = document.getElementById("timer");

  function updateDisplay() {
    if (!timerDisplay) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerDisplay.innerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function triggerTimeout() {
    console.log("TIME OUT!");

    document.dispatchEvent(new CustomEvent("timerExpired"));
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
  }

  function getActiveTimerPreset() {
    const diff = window.currentDifficulty || "easy";
    return getTimerPreset(diff);
  }

  function startTimer(duration, countUp) {
    stopTimer();

    const preset = getActiveTimerPreset();
    const resolvedDuration = typeof duration === "number" ? duration : preset.duration;
    const resolvedCountUp = typeof countUp === "boolean" ? countUp : preset.countUp;

    timeLeft = Math.max(0, resolvedDuration);
    elapsedMode = resolvedCountUp;
    isRunning = true;

    updateDisplay();

    timerInterval = setInterval(() => {
      if (!isRunning) return;

      if (elapsedMode) {
        timeLeft += 1;
        updateDisplay();
        return;
      }

      timeLeft -= 1;

      updateDisplay();

      console.log("Time left:", timeLeft);

      if (timeLeft <= 0) {
        stopTimer();
        triggerTimeout();
      }
    }, 1000);
  }

  function getTimerPreset(diff) {
    if (diff === "easy") {
      return { duration: 0, countUp: true };
    }

    if (diff === "hard") {
      return { duration: 300, countUp: false };
    }

    return { duration: 480, countUp: false };
  }

  function pauseTimer() {
    isRunning = false;
  }

  function resumeTimer() {
    if (timeLeft <= 0) return;

    isRunning = true;
  }

  function resetTimer(duration, countUp) {
    stopTimer();
    startTimer(duration, countUp);
  }

  function addTime(seconds) {
    timeLeft += seconds;

    updateDisplay();

    console.log(`+${seconds} seconds added`);
  }

  function getTime() {
    return timeLeft;
  }

  document.addEventListener("pipesSolved", () => {
    console.log("Stopping timer - level solved");

    stopTimer();
  });

  document.addEventListener("timerExpired", () => {
    console.log("Game Over - Timer Expired");

    const message = document.getElementById("message");

    if (message) {
      message.innerText = "⏱ Time's up! Water system failed!";
      message.classList.add("show");
    }
  });

  document.addEventListener("levelLoaded", (event) => {
    const diff = window.currentDifficulty || "easy";
    const preset = getTimerPreset(diff);

    startTimer(preset.duration, preset.countUp);
  });

  document.addEventListener("difficultyChanged", (event) => {
    const diff = event?.detail?.mode || window.currentDifficulty || "easy";
    const preset = getTimerPreset(diff);

    if (window.gameStarted) {
      startTimer(preset.duration, preset.countUp);
      return;
    }

    stopTimer();
    timeLeft = preset.duration;
    elapsedMode = preset.countUp;
    updateDisplay();
  });

  window.timerSystem = {
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer,
    add: addTime,
    get: getTime,
    stop: stopTimer,
  };

  console.log("Timer system ready.");
})();

/* ==========================================================
   storage.js
========================================================== */

(() => {
  console.log("storage.js loaded");

  const KEYS = {
    HIGH_SCORE: "water_game_high_score",
    BEST_TIME: "water_game_best_time",
    LEVEL: "water_game_level",
  };

  function getHighScore() {
    return Number(localStorage.getItem(KEYS.HIGH_SCORE)) || 0;
  }

  function getBestTime() {
    return Number(localStorage.getItem(KEYS.BEST_TIME)) || null;
  }

  function getLevel() {
    return Number(localStorage.getItem(KEYS.LEVEL)) || 0;
  }

  function saveHighScore(score) {
    const current = getHighScore();

    if (score > current) {
      localStorage.setItem(KEYS.HIGH_SCORE, String(score));
      console.log("New high score:", score);
    }
  }

  function saveBestTime(time) {
    const current = getBestTime();

    if (!current || time < current) {
      localStorage.setItem(KEYS.BEST_TIME, String(time));
      console.log("New best time:", time);
    }
  }

  function saveLevel(level) {
    localStorage.setItem(KEYS.LEVEL, String(level));
  }

  function resetProgress() {
    localStorage.removeItem(KEYS.HIGH_SCORE);
    localStorage.removeItem(KEYS.BEST_TIME);
    localStorage.removeItem(KEYS.LEVEL);

    console.log("Progress reset");
  }

  document.addEventListener("pipesSolved", () => {
    saveHighScore(parseInt(document.getElementById("score")?.innerText || "0", 10) || 0);
  });

  document.addEventListener("levelLoaded", (event) => {
    saveLevel(event.detail?.level || 0);
  });

  document.addEventListener("timerExpired", () => {
    console.log("Timer ended - no best time update");
  });

  window.storageSystem = {
    saveHighScore,
    saveBestTime,
    saveLevel,
    getHighScore,
    getBestTime,
    getLevel,
    resetProgress,
  };

  console.log("Storage system ready.");
})();

/* ==========================================================
   game.js
========================================================== */

(() => {
  console.log("game.js loaded");

  let currentDifficulty = document.querySelector(".difficulty.selected")?.dataset.mode || "easy";
  let gameStarted = false;
  const mapControlDock = document.getElementById("mapControlDock");
  const mapStatsBanner = document.getElementById("topBar");
  const difficultyButtons = Array.from(document.querySelectorAll(".difficulty"));
  const difficultyModeBtn = document.getElementById("difficultyModeBtn");
  const difficultyMenu = document.getElementById("difficultyMenu");

  function updateDifficultyLabel(mode) {
    const difficultyLabel = document.getElementById("difficultyLabel");
    if (!difficultyLabel) {
      return;
    }

    difficultyLabel.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function startGame() {
    gameStarted = true;
    window.gameStarted = true;

    mapStatsBanner?.classList.remove("hidden");
    mapControlDock?.classList.remove("hidden");

    console.log("Game started");

    document.dispatchEvent(new CustomEvent("gameStart"));
  }

  function updateDifficultyModeButton(mode) {
    if (!difficultyModeBtn) {
      return;
    }

    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    difficultyModeBtn.textContent = `Difficulty Mode: ${label}`;
  }

  function applyDifficulty(mode) {
    const nextMode = mode || "easy";

    difficultyButtons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.mode === nextMode);
    });

    currentDifficulty = nextMode;
    window.currentDifficulty = currentDifficulty;
    updateDifficultyLabel(currentDifficulty);
    updateDifficultyModeButton(currentDifficulty);

    console.log("Difficulty set:", currentDifficulty);

    document.dispatchEvent(
      new CustomEvent("difficultyChanged", {
        detail: { mode: currentDifficulty },
      })
    );
  }

  window.currentDifficulty = currentDifficulty;
  window.gameStarted = gameStarted;
  updateDifficultyLabel(currentDifficulty);

  difficultyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyDifficulty(btn.dataset.mode || "easy");
      if (difficultyMenu) {
        difficultyMenu.classList.add("hidden");
      }
      if (difficultyModeBtn) {
        difficultyModeBtn.setAttribute("aria-expanded", "false");
      }
    });
  });

  difficultyModeBtn?.addEventListener("click", () => {
    if (!difficultyMenu) {
      return;
    }

    difficultyMenu.classList.toggle("hidden");
    difficultyModeBtn.setAttribute("aria-expanded", String(!difficultyMenu.classList.contains("hidden")));
  });

  applyDifficulty(currentDifficulty);

  document.getElementById("overlayStartBtn")?.addEventListener("click", () => {
    startGame();
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    gameStarted = false;
    window.gameStarted = false;

    mapStatsBanner?.classList.add("hidden");
    mapControlDock?.classList.add("hidden");

    document.dispatchEvent(new CustomEvent("resetGame"));
  });

  document.getElementById("doneBtn")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("forceCheck"));
  });

  document.addEventListener("pipesSolved", () => {
    gameStarted = false;
    window.gameStarted = false;
  });
})();

const pipesLayer = document.getElementById("pipesLayer");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");
const levelDisplay = document.getElementById("level");
const movesDisplay = document.getElementById("moves");
const message = document.getElementById("message");
const statusPanel = document.querySelector(".status-panel") || document.getElementById("statusBar");
const introOverlay = document.getElementById("introOverlay");
const mapControlDockPanel = document.getElementById("mapControlDock");
const mapStatsTopBar = document.getElementById("topBar");
const winScreen = document.getElementById("winScreen");
const loseScreen = document.getElementById("loseScreen");
const infoPopup = document.getElementById("infoPopup");
const factPopup = document.getElementById("factPopup");
const factPopupText = document.getElementById("factPopupText");
const infoTitle = document.getElementById("infoTitle");
const infoText = document.getElementById("infoText");
const infoMissionText = document.getElementById("infoMissionText");
const factText = document.getElementById("factText");
const finalScore = document.getElementById("finalScore");
const finalMoves = document.getElementById("finalMoves");
const sourceNode = document.querySelector(".source") || document.getElementById("source");
const villageNode = document.querySelector(".village") || document.getElementById("village");

const pauseBtn = document.getElementById("pauseBtn");
const playBtn = document.getElementById("playBtn");
const nextLevelBtn = document.getElementById("nextLevel");
const retryBtn = document.getElementById("retryBtn");
const closeInfoBtn = document.getElementById("closeInfoBtn");
const mapInfoBtn = document.getElementById("mapInfoBtn");
const mapInfoPanel = document.getElementById("mapInfoPanel");
const closeMapInfoBtn = document.getElementById("closeMapInfoBtn");
const mapMoreBtn = document.getElementById("mapMoreBtn");
const logoToggle = document.getElementById("logoToggle") || document.querySelector(".logoArea");
const collapseHeaderBtn = document.getElementById("collapseHeaderBtn");
const expandHeaderBtn = document.getElementById("expandHeaderBtn");

const rotateSound = document.getElementById("rotateSound");
const winSound = document.getElementById("winSound");
const levelSound = document.getElementById("levelSound");

const MAX_LEVEL = 5;
const GRID_SIZE = 5;
const START_PIPE = 0;
const END_PIPE = 24;
const NORMAL_MOVE_LIMIT = 13;
const HARD_MOVE_GRACE = 25;
const HARD_OVERMOVE_POINT_PENALTY = 3;
const BANNER_HIDE_MS = 5000;
const ALLOW_COMPLEX_PIPES = false;

const TOTAL_PIPES = GRID_SIZE * GRID_SIZE;
const BLUEPRINTS_BY_DIFFICULTY = {
  easy: [
    {
      path: [0, 1, 2, 3, 4, 9, 14, 19, 24],
      contaminated: []
    },
    {
      path: [0, 5, 10, 15, 20, 21, 22, 23, 24],
      contaminated: [7]
    },
    {
      path: [0, 1, 6, 11, 16, 21, 22, 23, 24],
      contaminated: [8]
    },
    {
      path: [0, 5, 6, 7, 8, 13, 18, 23, 24],
      contaminated: [11]
    },
    {
      path: [0, 1, 2, 7, 12, 17, 22, 23, 24],
      contaminated: [6]
    }
  ],
  normal: [
    {
      path: [0, 1, 2, 3, 4, 9, 14, 19, 24],
      contaminated: [6, 13]
    },
    {
      path: [0, 5, 10, 15, 20, 21, 22, 23, 24],
      contaminated: [7, 13]
    },
    {
      path: [0, 1, 6, 11, 12, 17, 22, 23, 24],
      contaminated: [8, 13]
    },
    {
      path: [0, 5, 6, 7, 12, 17, 18, 19, 24],
      contaminated: [11, 16]
    },
    {
      path: [0, 1, 2, 7, 12, 13, 18, 23, 24],
      contaminated: [6, 16]
    }
  ],
  hard: [
    {
      path: [0, 5, 6, 11, 12, 13, 14, 19, 24],
      contaminated: [1, 7, 18]
    },
    {
      path: [0, 1, 6, 7, 12, 17, 18, 19, 24],
      contaminated: [5, 11, 16]
    },
    {
      path: [0, 5, 10, 11, 12, 13, 18, 23, 24],
      contaminated: [1, 6, 17]
    },
    {
      path: [0, 1, 2, 7, 8, 13, 14, 19, 24],
      contaminated: [6, 12, 18]
    },
    {
      path: [0, 5, 10, 15, 16, 17, 18, 23, 24],
      contaminated: [6, 11, 22]
    }
  ]
};

const oppositeDirection = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
};

const pipeShapes = {
  straight: [
    ["top", "bottom"],
    ["left", "right"],
    ["top", "bottom"],
    ["left", "right"]
  ],
  corner: [
    ["top", "right"],
    ["right", "bottom"],
    ["bottom", "left"],
    ["left", "top"]
  ],
  tee: [
    ["left", "top", "right"],
    ["top", "right", "bottom"],
    ["right", "bottom", "left"],
    ["bottom", "left", "top"]
  ],
  cross: [
    ["top", "right", "bottom", "left"],
    ["top", "right", "bottom", "left"],
    ["top", "right", "bottom", "left"],
    ["top", "right", "bottom", "left"]
  ]
};

const DEFAULT_ROTATIONS = [0, 90, 180, 270];
const pipes = [];
const rotations = new Array(TOTAL_PIPES).fill(0);
const CONTAMINATION_ALERTS = [
  {
    title: "Unsafe Water Detected",
    body: "This pipe carries unsafe water. Contact with it costs 10 points and 2 moves.",
    mission: "charity: water focuses on bringing reliable clean water systems to communities that still need safe access."
  },
  {
    title: "Protect the Water Route",
    body: "Contaminated lines break clean flow and can set your mission back.",
    mission: "Access to clean water helps protect health, supports school attendance, and gives families time back each day."
  },
  {
    title: "Mission Reminder",
    body: "Avoid red contaminated pipes and keep the route clean from source to village.",
    mission: "Every solved level represents the impact of sustainable clean water projects in real communities."
  }
];
const DID_YOU_KNOW_FACTS = [
  "charity: water has funded clean water projects that help communities build reliable local water access.",
  "Access to clean water can reduce waterborne disease risk and improve community health.",
  "When clean water is nearby, families often spend less time collecting water and more time in school or work.",
  "Sustainable water systems are designed so communities can maintain them for long-term impact."
];

let pipeLayout = [];
let targetRotations = new Array(TOTAL_PIPES).fill(0);
let solutionPath = [];
let contaminatedPipes = [];
let lastBlueprintIndexByDifficulty = {
  easy: -1,
  normal: -1,
  hard: -1,
};

let score = 0;
let level = 1;
let moves = 0;
let gameStarted = false;
let gamePaused = false;
let bannerHideTimeout = null;
let pendingFlowPath = [];
let navCollapsed = false;
let contaminationAlertIndex = 0;
let didYouKnowIndex = 0;
let factPopupTimeout = null;

function syncViewportHeightVar() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-vh", `${viewportHeight * 0.01}px`);
}

function setNavigationCollapsed(collapsed) {
  navCollapsed = collapsed;
  document.body.classList.toggle("nav-collapsed", collapsed);

  if (logoToggle) {
    logoToggle.setAttribute("aria-expanded", String(!collapsed));
  }

  if (collapseHeaderBtn) {
    collapseHeaderBtn.textContent = collapsed ? "Expand Header" : "Collapse Header";
    collapseHeaderBtn.setAttribute("aria-label", collapsed ? "Expand header panels" : "Collapse header panels");
    collapseHeaderBtn.setAttribute("title", collapsed ? "Expand header panels" : "Collapse header panels");
  }
}

function toggleNavigationPanels() {
  setNavigationCollapsed(!navCollapsed);
}

function setupLogoNavigationToggle() {
  if (!logoToggle || logoToggle.dataset.navBound === "true") {
    return;
  }

  logoToggle.dataset.navBound = "true";

  logoToggle.addEventListener("click", toggleNavigationPanels);
  logoToggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleNavigationPanels();
    }
  });

  collapseHeaderBtn?.addEventListener("click", toggleNavigationPanels);
  expandHeaderBtn?.addEventListener("click", toggleNavigationPanels);

  setNavigationCollapsed(navCollapsed);
}

function getCurrentLevelIndex() {
  return Math.max(0, level - 1);
}

function emitLevelLoaded() {
  document.dispatchEvent(new CustomEvent("levelLoaded", {
    detail: {
      level: getCurrentLevelIndex(),
      difficulty: window.currentDifficulty || "easy"
    }
  }));
}

function getCompletionPercent() {
  if (!targetRotations.length) {
    return 0;
  }

  let correct = 0;

  targetRotations.forEach((targetRotation, index) => {
    if (rotations[index] === targetRotation) {
      correct += 1;
    }
  });

  return Math.floor((correct / targetRotations.length) * 100);
}

function emitPipeProgress() {
  document.dispatchEvent(new CustomEvent("pipeProgress", {
    detail: {
      percent: getCompletionPercent()
    }
  }));
}

function syncPauseButtons() {
  document.body.classList.toggle("game-in-progress", gameStarted);

  if (pauseBtn) {
    pauseBtn.classList.toggle("hidden", !gameStarted || gamePaused);
  }

  if (playBtn) {
    playBtn.classList.toggle("hidden", !gamePaused);
  }
}

function setGamePaused(paused) {
  const shouldPause = Boolean(paused);

  if (shouldPause && !gameStarted) {
    return;
  }

  gamePaused = shouldPause;
  document.body.classList.toggle("game-paused", shouldPause);
  document.body.classList.toggle("game-in-progress", gameStarted);

  if (shouldPause) {
    window.timerSystem?.pause?.();
    showBottomBanner("Game paused. Press Play to continue.");
  } else {
    if (gameStarted) {
      window.timerSystem?.resume?.();
      showBottomBanner("Game resumed.");
    }
  }

  syncPauseButtons();
}

function clearPauseState() {
  gamePaused = false;
  document.body.classList.remove("game-paused");
  document.body.classList.toggle("game-in-progress", gameStarted);
  syncPauseButtons();
}

function showBottomBanner(text) {
  if (!message || !statusPanel) return;

  message.textContent = text;
  statusPanel.classList.remove("hidden");

  if (bannerHideTimeout) {
    clearTimeout(bannerHideTimeout);
  }

  bannerHideTimeout = setTimeout(() => {
    statusPanel.classList.add("hidden");
  }, BANNER_HIDE_MS);
}

function updateScore(points) {
  score = Math.max(0, score + points);

  const storage = window.storageSystem;
  const currentHighScore = storage?.getHighScore?.() || 0;

  if (score > currentHighScore) {
    storage?.saveHighScore?.(score);
  }

  if (scoreDisplay) {
    scoreDisplay.textContent = String(score);
  }

  if (highScoreDisplay) {
    const liveHighScore = storage?.getHighScore?.() || 0;
    highScoreDisplay.textContent = String(liveHighScore);
  }
}

function updateLevel() {
  if (levelDisplay) {
    levelDisplay.textContent = String(level);
  }
}

function getCurrentDifficulty() {
  return (window.currentDifficulty || "easy").toLowerCase();
}

function getMoveThreshold() {
  return getCurrentDifficulty() === "hard" ? HARD_MOVE_GRACE : NORMAL_MOVE_LIMIT;
}

function isMoveTrackingDisabled() {
  return getCurrentDifficulty() === "easy";
}

function getMovesRemaining() {
  return Math.max(0, getMoveThreshold() - moves);
}

function updateMoves() {
  if (movesDisplay) {
    if (isMoveTrackingDisabled()) {
      movesDisplay.textContent = "N/A";
      return;
    }

    movesDisplay.textContent = String(getMovesRemaining());
  }
}

function playAudio(audioEl) {
  if (!audioEl) return;

  if (window.audioSystem?.play) {
    window.audioSystem.play(audioEl);
    return;
  }

  audioEl.currentTime = 0;
  audioEl.play().catch(() => {});
}

function hidePopups() {
  winScreen?.classList.add("hidden");
  loseScreen?.classList.add("hidden");
  infoPopup?.classList.add("hidden");
  factPopup?.classList.add("hidden");
}

function syncMapInfoState() {
  if (!mapInfoBtn || !mapInfoPanel) {
    return;
  }

  mapInfoBtn.setAttribute("aria-expanded", String(!mapInfoPanel.classList.contains("hidden")));
}

function toggleMapInfoPanel() {
  if (!mapInfoPanel) {
    return;
  }

  mapInfoPanel.classList.toggle("hidden");
  syncMapInfoState();
}

function closeMapInfoPanel() {
  if (!mapInfoPanel) {
    return;
  }

  mapInfoPanel.classList.add("hidden");
  syncMapInfoState();
}

function syncAudioDockState() {
  if (!mapControlDockPanel || !mapMoreBtn) {
    return;
  }

  const isOpen = mapControlDockPanel.classList.contains("audio-open");
  mapMoreBtn.setAttribute("aria-expanded", String(isOpen));
}

function toggleAudioDockPanel() {
  if (!mapControlDockPanel) {
    return;
  }

  mapControlDockPanel.classList.toggle("audio-open");
  syncAudioDockState();
}

function showDidYouKnowPopup() {
  if (!factPopup || !factPopupText || DID_YOU_KNOW_FACTS.length === 0) {
    return;
  }

  const fact = DID_YOU_KNOW_FACTS[didYouKnowIndex % DID_YOU_KNOW_FACTS.length];
  didYouKnowIndex += 1;

  factPopupText.textContent = fact;
  factPopup.classList.remove("hidden");

  if (factText) {
    factText.textContent = fact;
  }

  if (factPopupTimeout) {
    clearTimeout(factPopupTimeout);
  }

  factPopupTimeout = setTimeout(() => {
    factPopup.classList.add("hidden");
  }, 4600);
}

function getLevelBlueprint() {
  const difficulty = (window.currentDifficulty || "easy").toLowerCase();
  const blueprints = BLUEPRINTS_BY_DIFFICULTY[difficulty] || BLUEPRINTS_BY_DIFFICULTY.easy;

  if (!Array.isArray(blueprints) || blueprints.length === 0) {
    return BLUEPRINTS_BY_DIFFICULTY.easy[0];
  }

  if (blueprints.length === 1) {
    lastBlueprintIndexByDifficulty[difficulty] = 0;
    return blueprints[0];
  }

  let index = Math.floor(Math.random() * blueprints.length);
  const lastIndex = lastBlueprintIndexByDifficulty[difficulty] ?? -1;

  if (index === lastIndex) {
    index = (index + 1 + Math.floor(Math.random() * (blueprints.length - 1))) % blueprints.length;
  }

  lastBlueprintIndexByDifficulty[difficulty] = index;
  return blueprints[index];
}

function getTileDirectionSet(index, path) {
  const position = path.indexOf(index);
  if (position === -1) {
    return [];
  }

  const directions = [];
  if (position === 0) {
    directions.push("left");
  } else {
    directions.push(getDirectionBetween(index, path[position - 1]));
  }

  if (position === path.length - 1) {
    directions.push("right");
  } else {
    directions.push(getDirectionBetween(index, path[position + 1]));
  }

  return directions;
}

function getAvailableCleanDirections(index, contaminatedSet) {
  return getNeighbors(index)
    .filter((neighbor) => !contaminatedSet.has(neighbor))
    .map((neighbor) => getDirectionBetween(index, neighbor))
    .filter(Boolean);
}

function canSupportRequiredDirection(index, requiredDirection, contaminatedSet, pathSet) {
  const availableDirections = getAvailableCleanDirections(index, contaminatedSet);
  if (!availableDirections.includes(requiredDirection)) {
    return false;
  }

  const hasAlternateNonPathNeighbor = getNeighbors(index).some((neighbor) => {
    if (contaminatedSet.has(neighbor) || pathSet.has(neighbor)) {
      return false;
    }

    const direction = getDirectionBetween(index, neighbor);
    return direction && direction !== requiredDirection;
  });

  return hasAlternateNonPathNeighbor;
}

function canMergeRequiredDirections(index, newDirection, requiredDirectionMap, contaminatedSet) {
  const availableDirections = getAvailableCleanDirections(index, contaminatedSet);
  const existing = requiredDirectionMap.get(index) || [];
  const merged = existing.includes(newDirection) ? existing : [...existing, newDirection];
  const uniqueMerged = [...new Set(merged)];

  if (uniqueMerged.some((direction) => !availableDirections.includes(direction))) {
    return false;
  }

  if (availableDirections.length < Math.max(2, uniqueMerged.length)) {
    return false;
  }

  return true;
}

function addRequiredDirection(requiredDirectionMap, index, direction) {
  if (typeof index !== "number" || !direction) {
    return;
  }

  const existing = requiredDirectionMap.get(index) || [];
  if (!existing.includes(direction)) {
    requiredDirectionMap.set(index, [...existing, direction]);
  }
}

function buildPathDirectionOverrides(path, pathSet, contaminatedSet) {
  const pathOverrides = new Map();
  const fillerRequiredDirections = new Map();

  // Keep the puzzle on straight/corner pipes only when complex tiles are disabled.
  if (!ALLOW_COMPLEX_PIPES) {
    return { pathOverrides, fillerRequiredDirections };
  }

  const interiorPath = path.slice(1, -1);
  const maxSpecialTiles = Math.min(interiorPath.length, 2 + Math.floor((level - 1) / 2));

  if (maxSpecialTiles <= 0) {
    return { pathOverrides, fillerRequiredDirections };
  }

  const teeCandidates = [];
  const crossCandidates = [];

  interiorPath.forEach((index) => {
    const baseDirections = getTileDirectionSet(index, path);
    const freeDirections = getNeighbors(index)
      .filter((neighbor) => !pathSet.has(neighbor) && !contaminatedSet.has(neighbor))
      .map((neighbor) => {
        const direction = getDirectionBetween(index, neighbor);
        if (!direction || baseDirections.includes(direction)) {
          return null;
        }

        const requiredForNeighbor = oppositeDirection[direction];
        if (!canSupportRequiredDirection(neighbor, requiredForNeighbor, contaminatedSet, pathSet)) {
          return null;
        }

        return direction;
      })
      .filter(Boolean);

    if (freeDirections.length >= 1) {
      teeCandidates.push({ index, baseDirections, freeDirections });
    }

    if (freeDirections.length >= 2) {
      crossCandidates.push({ index, baseDirections, freeDirections });
    }
  });

  let specialCount = 0;

  if (crossCandidates.length > 0 && specialCount < maxSpecialTiles) {
    const crossChoice = crossCandidates[Math.floor(Math.random() * crossCandidates.length)];
    const crossDirections = [...crossChoice.baseDirections, ...crossChoice.freeDirections]
      .slice(0, 4)
      .sort();
    pathOverrides.set(crossChoice.index, crossDirections);

    crossChoice.freeDirections.slice(0, 2).forEach((direction) => {
      const neighbor = getNeighborForDirection(crossChoice.index, direction);
      if (typeof neighbor !== "number" || neighbor < 0 || neighbor >= TOTAL_PIPES) {
        return;
      }

      if (pathSet.has(neighbor) || contaminatedSet.has(neighbor)) {
        return;
      }

      if (!canMergeRequiredDirections(neighbor, oppositeDirection[direction], fillerRequiredDirections, contaminatedSet)) {
        return;
      }

      addRequiredDirection(fillerRequiredDirections, neighbor, oppositeDirection[direction]);
    });

    specialCount += 1;
  }

  const shuffledTeeCandidates = shuffleArray(teeCandidates);
  for (const candidate of shuffledTeeCandidates) {
    if (specialCount >= maxSpecialTiles) {
      break;
    }

    if (pathOverrides.has(candidate.index)) {
      continue;
    }

    const branchDirection = candidate.freeDirections[0];
    const teeDirections = [...candidate.baseDirections, branchDirection].sort();
    pathOverrides.set(candidate.index, teeDirections);

    const neighbor = getNeighborForDirection(candidate.index, branchDirection);
    if (typeof neighbor === "number" && neighbor >= 0 && neighbor < TOTAL_PIPES && !pathSet.has(neighbor) && !contaminatedSet.has(neighbor)) {
      if (!canMergeRequiredDirections(neighbor, oppositeDirection[branchDirection], fillerRequiredDirections, contaminatedSet)) {
        continue;
      }

      addRequiredDirection(fillerRequiredDirections, neighbor, oppositeDirection[branchDirection]);
    }

    specialCount += 1;
  }

  return { pathOverrides, fillerRequiredDirections };
}

function getConnectedFillerTile(index, contaminatedSet, requiredDirections = []) {
  const availableDirections = getNeighbors(index)
    .filter((neighbor) => !contaminatedSet.has(neighbor))
    .map((neighbor) => getDirectionBetween(index, neighbor))
    .filter(Boolean);

  const selected = [...requiredDirections].filter((direction) => availableDirections.includes(direction));

  while (selected.length < 2 && selected.length < availableDirections.length) {
    const candidates = availableDirections.filter((direction) => !selected.includes(direction));
    if (candidates.length === 0) {
      break;
    }
    selected.push(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  const normalized = selected.length > 0 ? selected : ["top", "bottom"];
  return getPipeDefinitionFromDirections(normalized);
}

function getPipeDefinitionFromDirections(directions) {
  const key = [...directions].sort().join("-");

  switch (key) {
    case "bottom-top":
      return { type: "straight", rotation: 0, imageVariant: "open-a" };
    case "left-right":
      return { type: "straight", rotation: 90, imageVariant: "open-a" };
    case "right-top":
      return { type: "corner", rotation: 0, imageVariant: "open-b" };
    case "bottom-right":
      return { type: "corner", rotation: 90, imageVariant: "open-b" };
    case "bottom-left":
      return { type: "corner", rotation: 180, imageVariant: "open-b" };
    case "left-top":
      return { type: "corner", rotation: 270, imageVariant: "open-b" };
    case "left-right-top":
      return { type: "tee", rotation: 0, imageVariant: "tee" };
    case "bottom-right-top":
      return { type: "tee", rotation: 90, imageVariant: "tee" };
    case "bottom-left-right":
      return { type: "tee", rotation: 180, imageVariant: "tee" };
    case "bottom-left-top":
      return { type: "tee", rotation: 270, imageVariant: "tee" };
    case "bottom-left-right-top":
      return { type: "cross", rotation: 0, imageVariant: "cross" };
    default:
      return { type: "straight", rotation: 0, imageVariant: "open-a" };
  }
}

function getFillerTile(type) {
  if (type === "cross") {
    return { type: "cross", imageVariant: "cross" };
  }

  if (type === "tee") {
    return { type: "tee", imageVariant: "tee" };
  }

  if (type === "corner") {
    return { type: "corner", imageVariant: "open-b" };
  }

  return { type: "straight", imageVariant: "open-a" };
}

function shuffleArray(items) {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function buildFillerTypePool(count) {
  if (count <= 0) {
    return [];
  }

  const allTypes = ["straight", "corner"];
  const pool = [];

  while (pool.length < count) {
    const round = shuffleArray(allTypes);
    for (const type of round) {
      if (pool.length >= count) {
        break;
      }
      pool.push(type);
    }
  }

  return shuffleArray(pool);
}

function getScrambledRotation(targetRotation, enforceMismatch) {
  if (!enforceMismatch) {
    return DEFAULT_ROTATIONS[Math.floor(Math.random() * DEFAULT_ROTATIONS.length)];
  }

  const options = DEFAULT_ROTATIONS.filter((rotation) => rotation !== targetRotation);
  return options[Math.floor(Math.random() * options.length)];
}

function buildLevelBoard() {
  const blueprint = getLevelBlueprint();
  const pathSet = new Set(blueprint.path);
  const contaminatedSet = new Set(blueprint.contaminated);
  const { pathOverrides, fillerRequiredDirections } = buildPathDirectionOverrides(blueprint.path, pathSet, contaminatedSet);
  const fillerIndexes = Array.from({ length: TOTAL_PIPES }, (_, index) => index)
    .filter((index) => !pathSet.has(index) && !contaminatedSet.has(index));
  const fillerTypes = buildFillerTypePool(fillerIndexes.length);
  const fillerTileByIndex = new Map(
    fillerIndexes.map((index, order) => {
      const required = fillerRequiredDirections.get(index) || [];

      if (required.length > 0) {
        return [index, getConnectedFillerTile(index, contaminatedSet, required)];
      }

      return [index, getFillerTile(fillerTypes[order])];
    })
  );

  solutionPath = blueprint.path;
  contaminatedPipes = blueprint.contaminated;

  pipeLayout = Array.from({ length: TOTAL_PIPES }, (_, index) => {
    if (contaminatedSet.has(index)) {
      return {
        type: index % 2 === 0 ? "straight" : "corner",
        contaminated: true,
        imageVariant: "non-potable"
      };
    }

    if (!pathSet.has(index)) {
      return fillerTileByIndex.get(index) || getFillerTile("straight");
    }

    const directions = pathOverrides.get(index) || getTileDirectionSet(index, blueprint.path);
    const definition = getPipeDefinitionFromDirections(directions);
    return {
      ...definition,
      contaminated: false
    };
  });

  targetRotations = pipeLayout.map((tile) => tile.rotation ?? 0);
}

function getPipeImage(type, contaminated, imageVariant) {
  if (imageVariant === "non-potable") {
    return "images/non-potable-water-svgrepo-com.svg.svg";
  }

  if (type === "cross" || imageVariant === "cross") {
    return "images/cross.png.svg";
  }

  if (type === "tee" || imageVariant === "tee") {
    return "images/tee.png.svg";
  }

  if (imageVariant === "open-b") {
    return "images/pipes-pipe-svgrepo-com-1.svg.svg";
  }

  return "images/pipes-pipe-svgrepo-com-2.svg.svg";
}

function canBootGameUI() {
  const requiredElements = [pipesLayer, scoreDisplay, levelDisplay, movesDisplay];
  const hasMissingElement = requiredElements.some((element) => !element);

  if (hasMissingElement) {
    console.error("Required game UI element missing. Check ids: pipesLayer, score, level, moves.");
    return false;
  }

  return true;
}

function createBoard() {
  if (!pipesLayer) {
    console.error("pipesLayer not found in HTML.");
    return;
  }

  pipesLayer.innerHTML = "";
  pipes.length = 0;

  Array.from({ length: TOTAL_PIPES }, (_, index) => index).forEach((index) => {
    const pipe = document.createElement("button");
    pipe.type = "button";
    pipe.className = "pipe";

    pipe.dataset.index = String(index);
    pipe.setAttribute("aria-label", `Rotate pipe ${index + 1}`);
    pipe.addEventListener("click", rotatePipe);

    pipesLayer.appendChild(pipe);
    pipes.push(pipe);
  });
}

function renderBoardArt() {
  pipes.forEach((pipe, index) => {
    const pipeData = pipeLayout[index];
    pipe.classList.toggle("start-tile", index === START_PIPE);
    pipe.classList.toggle("end-tile", index === END_PIPE);
    pipe.classList.remove("completed-goal");
    pipe.classList.toggle("contaminated", Boolean(pipeData.contaminated));
    pipe.style.backgroundImage = `url("${getPipeImage(pipeData.type, Boolean(pipeData.contaminated), pipeData.imageVariant)}")`;
    pipe.setAttribute("aria-label", index === START_PIPE ? "Start pipe" : index === END_PIPE ? "End pipe" : `Rotate pipe ${index + 1}`);
  });
}

function celebrateGoalTile() {
  const goalTile = pipes[END_PIPE];
  if (!goalTile) return;

  goalTile.classList.add("completed-goal");
  goalTile.style.backgroundImage = 'url("images/village-svgrepo-com-1.svg.svg")';
  goalTile.setAttribute("aria-label", "Village reached");
}

function resetMapHighlights() {
  if (sourceNode) {
    sourceNode.classList.remove("source-active");
  }
  if (villageNode) {
    villageNode.classList.remove("village-watered");
  }
}

function resetPipeClasses() {
  pipes.forEach((pipe, index) => {
    pipe.classList.remove("active", "watered", "path-preview", "busted");
    pipe.classList.toggle("start-tile", index === START_PIPE);
    pipe.classList.toggle("end-tile", index === END_PIPE);
    pipe.classList.toggle("contaminated", contaminatedPipes.includes(index));
  });
}

function initializeBoard() {
  buildLevelBoard();
  renderBoardArt();
  resetPipeClasses();
  resetMapHighlights();

  pipes.forEach((pipe, index) => {
    const rotation = getScrambledRotation(targetRotations[index], solutionPath.includes(index));
    rotations[index] = rotation;
    pipe.style.transform = `rotate(${rotation}deg)`;
  });
}

function getDirectionBetween(a, b) {
  if (b === a - GRID_SIZE) return "top";
  if (b === a + GRID_SIZE) return "bottom";
  if (b === a - 1) return "left";
  if (b === a + 1) return "right";
  return null;
}

function getOpenings(index) {
  const type = pipeLayout[index].type;
  const quarterTurns = (rotations[index] / 90) % 4;
  const shape = pipeShapes[type] || pipeShapes.straight;
  return shape[quarterTurns] || shape[0];
}

function markContamination(index) {
  const pipe = pipes[index];
  pipe.classList.add("busted");
}

function getNeighbors(index) {
  const neighbors = [];
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;

  if (row > 0) neighbors.push(index - GRID_SIZE);
  if (row < GRID_SIZE - 1) neighbors.push(index + GRID_SIZE);
  if (col > 0) neighbors.push(index - 1);
  if (col < GRID_SIZE - 1) neighbors.push(index + 1);

  return neighbors;
}

function isAlignedConnection(a, b) {
  const directionAB = getDirectionBetween(a, b);
  if (!directionAB) {
    return false;
  }

  const directionBA = oppositeDirection[directionAB];
  const openingsA = getOpenings(a);
  const openingsB = getOpenings(b);

  return openingsA.includes(directionAB) && openingsB.includes(directionBA);
}

function getNeighborForDirection(index, direction) {
  if (direction === "top") return index - GRID_SIZE;
  if (direction === "bottom") return index + GRID_SIZE;
  if (direction === "left") return index - 1;
  if (direction === "right") return index + 1;
  return null;
}

function findConnectedPathToGoal() {
  if (contaminatedPipes.includes(START_PIPE) || contaminatedPipes.includes(END_PIPE)) {
    return null;
  }

  const startOpenings = getOpenings(START_PIPE);
  const endOpenings = getOpenings(END_PIPE);

  if (!startOpenings.includes("left") || !endOpenings.includes("right")) {
    return null;
  }

  const visited = new Set([START_PIPE]);
  const queue = [START_PIPE];
  const parentMap = new Map();

  while (queue.length > 0) {
    const index = queue.shift();

    if (index === END_PIPE) {
      break;
    }

    const neighbors = getNeighbors(index);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor) || contaminatedPipes.includes(neighbor)) {
        continue;
      }

      if (!isAlignedConnection(index, neighbor)) {
        continue;
      }

      visited.add(neighbor);
      parentMap.set(neighbor, index);
      queue.push(neighbor);
    }
  }

  if (!visited.has(END_PIPE)) {
    return null;
  }

  const path = [];
  let current = END_PIPE;

  while (typeof current === "number") {
    path.push(current);
    current = parentMap.get(current);
  }

  path.reverse();
  return path.length > 0 ? path : null;
}

function evaluatePath() {
  resetPipeClasses();
  resetMapHighlights();

  const connectedPath = findConnectedPathToGoal();
  const previewPath = connectedPath || [...solutionPath];

  previewPath.forEach((index) => {
    if (!contaminatedPipes.includes(index)) {
      pipes[index].classList.add("path-preview");
    }
  });

  if (connectedPath) {
    return { success: true, previewPath };
  }

  if (previewPath.some((index) => contaminatedPipes.includes(index))) {
    previewPath.forEach((index) => {
      if (contaminatedPipes.includes(index)) {
        markContamination(index);
      }
    });
  }

  return {
    success: false,
    previewPath,
    reason: "Path is not complete. Make sure pipes connect from source to village."
  };
}

function animateWater(path) {
  if (sourceNode) {
    sourceNode.classList.add("source-active");
  }

  path.forEach((index, order) => {
    setTimeout(() => {
      pipes[index].classList.remove("path-preview");
      pipes[index].classList.add("watered");
      if (order === path.length - 1 && villageNode) {
        villageNode.classList.add("village-watered");
      }
    }, order * 160);
  });
}

function launchConfetti() {
  const colors = ["#ffc907", "#77a8bb", "#003356", "#bf6c46", "#ffffff"];

  for (let i = 0; i < 120; i += 1) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.left = `${Math.random() * window.innerWidth}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
    confetti.style.width = `${Math.random() * 8 + 6}px`;
    confetti.style.height = `${Math.random() * 8 + 6}px`;

    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 5000);
  }
}

function showWinScreen() {
  if (finalScore) {
    finalScore.textContent = String(score);
  }
  if (finalMoves) {
    finalMoves.textContent = String(moves);
  }
  loseScreen?.classList.add("hidden");
  winScreen?.classList.remove("hidden");
}

function showInfoPopup() {
  const alert = CONTAMINATION_ALERTS[contaminationAlertIndex % CONTAMINATION_ALERTS.length];
  contaminationAlertIndex += 1;

  if (infoTitle) {
    infoTitle.textContent = `⚠ ${alert.title}`;
  }

  if (infoText) {
    infoText.textContent = alert.body;
  }

  if (infoMissionText) {
    infoMissionText.textContent = alert.mission;
  }

  if (factText) {
    factText.textContent = alert.mission;
  }

  infoPopup?.classList.remove("hidden");
}

function showLoseScreen() {
  if (finalScore) {
    finalScore.textContent = String(score);
  }
  if (finalMoves) {
    finalMoves.textContent = String(moves);
  }
  loseScreen?.classList.remove("hidden");
}

function loseRound() {
  if (!gameStarted) return;

  gameStarted = false;
  updateScore(-3);
  showBottomBanner(`You used more than ${getMoveThreshold()} moves. The village is still waiting for clean water.`);
  showLoseScreen();
}

function playerWins(resolvedPath = null) {
  if (!gameStarted) return;

  const didReachGoal = Array.isArray(resolvedPath) && resolvedPath.length > 0
    ? true
    : Boolean(findConnectedPathToGoal());

  if (!didReachGoal) {
    console.log("There is no complete source-to-village path yet.");
    return;
  }

  gameStarted = false;
  updateScore(100);
  showBottomBanner("Clean water reached the village!");
  celebrateGoalTile();
  launchConfetti();
  playAudio(winSound);
  showWinScreen();
}

function rotatePipe(event) {
  if (!gameStarted) {
    showBottomBanner("Press Start Game first, then rotate pipes, then press Done.");
    return;
  }

  if (gamePaused) {
    showBottomBanner("Game is paused. Press Play to continue.");
    return;
  }

  if (window.flowSystem?.isActive?.()) {
    return;
  }

  const pipe = event.currentTarget;
  const index = Number(pipe.dataset.index);
  const isContaminatedTile = contaminatedPipes.includes(index);

  if (isContaminatedTile) {
    showInfoPopup();
    showDidYouKnowPopup();
    pipe.classList.add("penalty-hit");
    setTimeout(() => pipe.classList.remove("penalty-hit"), 420);
  }

  rotations[index] = (rotations[index] + 90) % 360;
  pipe.style.transform = `rotate(${rotations[index]}deg)`;
  pipe.classList.add("active");
  setTimeout(() => pipe.classList.remove("active"), 220);

  document.dispatchEvent(new CustomEvent("pipeRotated"));
  emitPipeProgress();

  const difficulty = getCurrentDifficulty();
  const tracksMoves = !isMoveTrackingDisabled();
  const moveCost = isContaminatedTile ? 2 : 1;
  const previousMoves = moves;

  if (tracksMoves) {
    moves += moveCost;
    updateMoves();
  }

  let hardOverMovePenalty = 0;
  if (difficulty === "hard" && tracksMoves) {
    const previousOver = Math.max(0, previousMoves - HARD_MOVE_GRACE);
    const currentOver = Math.max(0, moves - HARD_MOVE_GRACE);
    const extraMoves = currentOver - previousOver;

    if (extraMoves > 0) {
      hardOverMovePenalty = extraMoves * HARD_OVERMOVE_POINT_PENALTY;
      updateScore(-hardOverMovePenalty);
    }
  }

  updateScore(isContaminatedTile ? -10 : 5);
  playAudio(rotateSound);

  if (difficulty === "easy") {
    showBottomBanner(isContaminatedTile
      ? "Contaminated pipe touched. You lost 10 points."
      : "Keep the pipeline aligned toward the village.");
    return;
  }

  if (difficulty === "hard") {
    if (hardOverMovePenalty > 0) {
      showBottomBanner(`Move limit exceeded. Extra moves are now costing points (-${hardOverMovePenalty}).`);
      return;
    }

    showBottomBanner(isContaminatedTile
      ? "Contaminated pipe touched. You lost 10 points and 2 moves."
      : `Keep the pipeline aligned toward the village. ${Math.max(0, HARD_MOVE_GRACE - moves)} grace moves left.`);
    return;
  }

  showBottomBanner(isContaminatedTile
    ? "Contaminated pipe touched. You lost 10 points and 2 moves."
    : "Keep the pipeline aligned toward the village.");

  if (moves > NORMAL_MOVE_LIMIT) {
    loseRound();
  }
}

function submitFlow() {
  const path = resolveFlowPath();
  if (!path) {
    return;
  }

  if (window.flowSystem?.start) {
    window.flowSystem.start(path);
    return;
  }

  animateWater(path);
  playerWins(path);
}

function resolveFlowPath() {
  if (!gameStarted) {
    showBottomBanner("Press Start Game first.");
    return null;
  }

  if (gamePaused) {
    showBottomBanner("Game is paused. Press Play to continue.");
    return null;
  }

  if (window.flowSystem?.isActive?.()) {
    showBottomBanner("Water is already flowing. Please wait.");
    return null;
  }

  const result = evaluatePath();
  if (!result.success) {
    const leakWarning = "Incomplete: there is a leak and the village is losing water quickly.";
    const hasLeak = typeof result.reason === "string" && /leak/i.test(result.reason);

    showBottomBanner(hasLeak ? leakWarning : (result.reason || "Path is not complete. Rotate pipes and press Done again."));
    return null;
  }

  pendingFlowPath = [...result.previewPath];
  showBottomBanner("Flow released. Water is moving through the pipeline.");

  const waterSound = document.getElementById("waterSound");
  playAudio(waterSound);

  return pendingFlowPath;
}

function hideIntro() {
  introOverlay?.classList.add("hidden");
}

function resetForRound() {
  moves = 0;
  pendingFlowPath = [];
  updateMoves();
  hidePopups();
  window.flowSystem?.reset?.();
  initializeBoard();
  emitPipeProgress();
}

function startGame() {
  clearPauseState();
  score = 0;
  updateScore(0);
  resetForRound();
  hideIntro();
  gameStarted = true;
  syncPauseButtons();
  emitLevelLoaded();
  showBottomBanner(`Level ${level} started. Rotate pipes to carry water uphill.`);
}

function fullReset() {
  clearPauseState();
  score = 0;
  level = 1;
  moves = 0;
  gameStarted = false;
  pendingFlowPath = [];

  updateScore(0);
  updateLevel();
  updateMoves();
  hidePopups();
  window.flowSystem?.reset?.();
  initializeBoard();
  introOverlay?.classList.remove("hidden");
  mapControlDockPanel?.classList.add("hidden");
  mapControlDockPanel?.classList.remove("audio-open");
  mapStatsTopBar?.classList.add("hidden");
  emitPipeProgress();
  syncPauseButtons();
  emitLevelLoaded();
  showBottomBanner("Press Start to open the water line to the village.");
}

function gameComplete() {
  clearPauseState();
  gameStarted = false;
  syncPauseButtons();
  pendingFlowPath = [];
  showBottomBanner("Every village on the route now has clean water.");
  loseScreen?.classList.add("hidden");
  winScreen?.classList.remove("hidden");
  if (finalScore) {
    finalScore.textContent = String(score);
  }
  if (finalMoves) {
    finalMoves.textContent = String(moves);
  }
  if (nextLevelBtn) {
    nextLevelBtn.textContent = "Play Again";
  }
}

function bonusPoints() {
  updateScore(50);
  showBottomBanner("Bonus! Efficient pipe building earned extra support.");
}

function advanceLevel() {
  if (level === MAX_LEVEL) {
    gameComplete();
    return;
  }

  level += 1;
  clearPauseState();
  updateLevel();
  resetForRound();
  gameStarted = true;
  syncPauseButtons();
  updateScore(25);
  emitLevelLoaded();
  playAudio(levelSound);
  showBottomBanner(`Level ${level} started. This route is trickier.`);
}

function bootGameUI() {
  if (!canBootGameUI()) {
    return;
  }

  mapInfoBtn?.addEventListener("click", toggleMapInfoPanel);
  mapMoreBtn?.addEventListener("click", toggleAudioDockPanel);
  closeMapInfoBtn?.addEventListener("click", closeMapInfoPanel);
  syncMapInfoState();
  syncAudioDockState();

  setupLogoNavigationToggle();

  buildLevelBoard();
  createBoard();
  renderBoardArt();

  updateLevel();
  updateScore(0);
  if (highScoreDisplay) {
    highScoreDisplay.textContent = String(window.storageSystem?.getHighScore?.() || 0);
  }
  updateMoves();
  initializeBoard();
  syncPauseButtons();
  showBottomBanner("Press Start to open the water line to the village.");
}

nextLevelBtn?.addEventListener("click", () => {
  if (nextLevelBtn.textContent === "Play Again") {
    nextLevelBtn.textContent = "Next Level";
    fullReset();
    return;
  }

  advanceLevel();
});

pauseBtn?.addEventListener("click", () => {
  setGamePaused(true);
});

playBtn?.addEventListener("click", () => {
  setGamePaused(false);
});

retryBtn?.addEventListener("click", () => {
  clearPauseState();
  hidePopups();
  resetForRound();
  gameStarted = true;
  syncPauseButtons();
  emitLevelLoaded();
  const difficulty = getCurrentDifficulty();
  const restartMessage = difficulty === "easy"
    ? `Level ${level} restarted. Moves are not counted in Easy mode.`
    : `Level ${level} restarted. You have ${getMoveThreshold()} moves before penalties.`;

  showBottomBanner(restartMessage);
});
closeInfoBtn?.addEventListener("click", () => {
  infoPopup?.classList.add("hidden");
});

document.addEventListener("flowSuccess", (event) => {
  const path = event.detail?.path ?? pendingFlowPath;
  if (Array.isArray(path) && path.length > 0) {
    animateWater(path);
  }
  playerWins(path);
});

document.addEventListener("flowFail", () => {
  showBottomBanner("Flow failed. Adjust pipes and press Done again.");
});

document.addEventListener("gameStart", startGame);

document.addEventListener("resetGame", fullReset);

window.gameController = {
  getLevelIndex: getCurrentLevelIndex,
  resolveFlowPath,
  submitFlow,
};

setInterval(() => {
  if (!gameStarted) return;
  if (Math.random() < 0.1) bonusPoints();
}, 10000);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootGameUI, { once: true });
} else {
  bootGameUI();
}

syncViewportHeightVar();
window.addEventListener("resize", syncViewportHeightVar);
window.visualViewport?.addEventListener("resize", syncViewportHeightVar);
