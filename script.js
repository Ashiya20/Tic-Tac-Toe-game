const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const resetButton = document.getElementById("reset");
const clearScoreButton = document.getElementById("clear-score");
const turnChip = document.getElementById("turn-chip");
const boardElement = document.getElementById("game-board");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreDraw = document.getElementById("score-draw");
const scoreXLabel = document.getElementById("score-x-label");
const scoreOLabel = document.getElementById("score-o-label");
const modeButtons = document.querySelectorAll(".mode-button");
const difficultyPanel = document.getElementById("difficulty-panel");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const roundNote = document.getElementById("round-note");
const streakText = document.getElementById("streak");
const celebration = document.getElementById("celebration");

const humanPlayer = "X";
const botPlayer = "O";

let gameMode = "bot";
let difficulty = "easy";
let currentPlayer = "X";
let board = Array(9).fill("");
let gameActive = true;
let botThinking = false;
let botTimer;
let winStreak = 0;
let scores = {
  X: 0,
  O: 0,
  draw: 0,
};

const difficultyNotes = {
  easy: "Easy bot makes playful mistakes.",
  medium: "Medium bot can block and pounce.",
  hard: "Hard bot plays a perfect game.",
};

const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

cells.forEach((cell) => {
  cell.addEventListener("click", () => handleCellClick(cell));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => changeMode(button.dataset.mode));
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => changeDifficulty(button.dataset.difficulty));
});

resetButton.addEventListener("click", resetGame);
clearScoreButton.addEventListener("click", clearScores);

updateModeLabels();
updateDifficultyLabels();
updateStatus();
updateRoundNote();

function handleCellClick(cell) {
  if (isBotTurn()) {
    return;
  }

  playMove(Number(cell.dataset.index));
}

function playMove(index) {
  if (board[index] || !gameActive || botThinking) {
    return;
  }

  placeMark(index, currentPlayer);

  if (resolveRound()) {
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
  queueBotMove();
}

function placeMark(index, player) {
  const cell = cells[index];

  board[index] = player;
  cell.textContent = player;
  cell.classList.add("taken", `${player.toLowerCase()}-mark`, "pop");
  cell.setAttribute("aria-label", `Cell ${index + 1}, player ${player}`);
  cell.disabled = true;

  window.setTimeout(() => cell.classList.remove("pop"), 350);
}

function queueBotMove() {
  if (!isBotTurn()) {
    return;
  }

  botThinking = true;
  boardElement.classList.add("bot-thinking");
  statusText.textContent = "Bot is thinking...";
  roundNote.textContent = getBotThinkingNote();

  botTimer = window.setTimeout(() => {
    const move = getBotMove();
    botThinking = false;
    boardElement.classList.remove("bot-thinking");

    if (move === null || !gameActive) {
      return;
    }

    placeMark(move, botPlayer);

    if (resolveRound()) {
      return;
    }

    currentPlayer = humanPlayer;
    updateStatus();
    updateRoundNote();
  }, 520);
}

function resolveRound() {
  const winningLine = getWinningLine(board);

  if (winningLine) {
    finishGame(getWinMessage(currentPlayer), currentPlayer, winningLine);
    return true;
  }

  if (!board.includes("")) {
    finishGame("It is a super cute draw!", "draw");
    return true;
  }

  return false;
}

function getWinningLine(testBoard) {
  return winningCombinations.find(([a, b, c]) => {
    return testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c];
  });
}

function finishGame(message, winner, winningLine = []) {
  gameActive = false;
  botThinking = false;
  window.clearTimeout(botTimer);
  statusText.textContent = message;
  boardElement.classList.add("board-paused");
  boardElement.classList.remove("bot-thinking");

  if (winner === "draw") {
    scores.draw += 1;
    winStreak = 0;
  } else {
    scores[winner] += 1;
    if (gameMode === "bot" && winner === humanPlayer) {
      winStreak += 1;
      burstCelebration();
    } else if (gameMode === "bot") {
      winStreak = 0;
    }
  }

  winningLine.forEach((index) => {
    cells[index].classList.add("win");
  });

  cells.forEach((cell) => {
    cell.disabled = true;
  });

  updateScores();
  updateStreak();
  updateRoundNote(winner);
}

function getBotMove() {
  if (difficulty === "easy") {
    return getRandomMove();
  }

  if (difficulty === "medium") {
    return getMediumBotMove();
  }

  return getBestBotMove();
}

function getRandomMove() {
  const availableMoves = getAvailableMoves(board);
  return availableMoves.length ? pickRandom(availableMoves) : null;
}

function getMediumBotMove() {
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    return null;
  }

  const winningMove = findImmediateMove(botPlayer);

  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findImmediateMove(humanPlayer);

  if (blockingMove !== null && Math.random() < 0.78) {
    return blockingMove;
  }

  if (board[4] === "" && Math.random() < 0.58) {
    return 4;
  }

  const corners = [0, 2, 6, 8].filter((index) => board[index] === "");

  if (corners.length && Math.random() < 0.6) {
    return pickRandom(corners);
  }

  return pickRandom(availableMoves);
}

function findImmediateMove(player) {
  return getAvailableMoves(board).find((move) => {
    const nextBoard = [...board];
    nextBoard[move] = player;
    return getWinner(nextBoard) === player;
  }) ?? null;
}

function getBestBotMove() {
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    return null;
  }

  let bestScore = -Infinity;
  let bestMoves = [];

  availableMoves.forEach((move) => {
    const nextBoard = [...board];
    nextBoard[move] = botPlayer;
    const score = minimax(nextBoard, false, 0);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  });

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function minimax(testBoard, isMaximizing, depth) {
  const winner = getWinner(testBoard);

  if (winner === botPlayer) {
    return 10 - depth;
  }

  if (winner === humanPlayer) {
    return depth - 10;
  }

  if (!testBoard.includes("")) {
    return 0;
  }

  const player = isMaximizing ? botPlayer : humanPlayer;
  const scoresForMoves = getAvailableMoves(testBoard).map((move) => {
    const nextBoard = [...testBoard];
    nextBoard[move] = player;
    return minimax(nextBoard, !isMaximizing, depth + 1);
  });

  return isMaximizing ? Math.max(...scoresForMoves) : Math.min(...scoresForMoves);
}

function getWinner(testBoard) {
  const line = getWinningLine(testBoard);
  return line ? testBoard[line[0]] : null;
}

function getAvailableMoves(testBoard) {
  return testBoard
    .map((value, index) => (value === "" ? index : null))
    .filter((index) => index !== null);
}

function isBotTurn() {
  return gameMode === "bot" && currentPlayer === botPlayer && gameActive;
}

function updateStatus() {
  statusText.textContent = getTurnMessage(currentPlayer);
  turnChip.textContent = currentPlayer;
  turnChip.classList.toggle("o-turn", currentPlayer === "O");
}

function updateScores() {
  scoreX.textContent = scores.X;
  scoreO.textContent = scores.O;
  scoreDraw.textContent = scores.draw;
}

function updateModeLabels() {
  scoreXLabel.textContent = gameMode === "bot" ? "You X" : "Player X";
  scoreOLabel.textContent = gameMode === "bot" ? "Bot O" : "Player O";
  difficultyPanel.classList.toggle("hidden", gameMode !== "bot");
  streakText.classList.toggle("hidden", gameMode !== "bot");

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === gameMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateDifficultyLabels() {
  difficultyButtons.forEach((button) => {
    const isActive = button.dataset.difficulty === difficulty;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getTurnMessage(player) {
  if (gameMode === "bot") {
    return player === humanPlayer ? "Your turn" : "Bot's turn";
  }

  return `Player ${player}'s turn`;
}

function getWinMessage(player) {
  if (gameMode === "bot") {
    return player === humanPlayer ? "You win the round!" : "Bot wins the round!";
  }

  return `Player ${player} wins the round!`;
}

function changeMode(mode) {
  if (mode === gameMode) {
    return;
  }

  gameMode = mode;
  winStreak = 0;
  clearScores();
  updateModeLabels();
  updateRoundNote();
  updateStreak();
}

function changeDifficulty(nextDifficulty) {
  if (nextDifficulty === difficulty) {
    return;
  }

  difficulty = nextDifficulty;
  winStreak = 0;
  updateDifficultyLabels();
  clearScores();
  updateRoundNote();
  updateStreak();
}

function resetGame() {
  window.clearTimeout(botTimer);
  board = Array(9).fill("");
  currentPlayer = "X";
  gameActive = true;
  botThinking = false;
  boardElement.classList.remove("board-paused", "bot-thinking");

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.className = "cell";
    cell.setAttribute("aria-label", `Cell ${index + 1}`);
  });

  updateStatus();
  updateRoundNote();
}

function clearScores() {
  scores = {
    X: 0,
    O: 0,
    draw: 0,
  };
  winStreak = 0;

  updateScores();
  updateStreak();
  resetGame();
}

function updateRoundNote(winner) {
  if (gameMode !== "bot") {
    roundNote.textContent = "Pass the keyboard and keep the party going.";
    return;
  }

  if (winner === humanPlayer) {
    roundNote.textContent = "Clean win. The bot felt that one.";
    return;
  }

  if (winner === botPlayer) {
    roundNote.textContent = difficulty === "hard" ? "Hard mode is icy. Try Easy or Medium." : "So close. New round, new mischief.";
    return;
  }

  if (winner === "draw") {
    roundNote.textContent = "Draws count as survival. Very respectable.";
    return;
  }

  roundNote.textContent = difficultyNotes[difficulty];
}

function getBotThinkingNote() {
  if (difficulty === "easy") {
    return "Easy bot is probably picking a shiny square.";
  }

  if (difficulty === "medium") {
    return "Medium bot is checking for sneaky lines.";
  }

  return "Hard bot is calculating quietly.";
}

function updateStreak() {
  streakText.textContent = `Win streak: ${winStreak}`;
}

function burstCelebration() {
  celebration.innerHTML = "";

  for (let i = 0; i < 20; i += 1) {
    const sparkle = document.createElement("span");
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 90 + Math.random() * 110;
    const colors = ["#ff6b9a", "#ffd166", "#51d6b4", "#70a7ff", "#ff8f70"];

    sparkle.className = "sparkle";
    sparkle.style.left = "50%";
    sparkle.style.top = "46%";
    sparkle.style.setProperty("--sparkle-x", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--sparkle-y", `${Math.sin(angle) * distance}px`);
    sparkle.style.setProperty("--sparkle-color", pickRandom(colors));
    celebration.appendChild(sparkle);
  }

  window.setTimeout(() => {
    celebration.innerHTML = "";
  }, 950);
}
