
let mode = "";
let playing = false;
let score = 0;
let correct = 0;
let wrong = 0;
let misses = 0;
let time = 60;

let timer = null;
let animation = null;
let bubbles = [];
let lastFrame = 0;

let targetKey = "";
let targetStart = 0;
let totalResponse = 0;

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const homeKeys = "ASDFJKL".split("");

const settings = {
  easy: { time: 60, speed: 45, count: 5, goal: 15 },
  medium: { time: 45, speed: 75, count: 6, goal: 20 },
  hard: { time: 30, speed: 110, count: 8, goal: 25 }
};

// Get HTML element
function get(id) {
  return document.getElementById(id);
}

// Show only one screen
function showScreen(screen) {
  ["home", "game", "result"].forEach(id => {
    get(id).classList.add("hidden");
  });
  get(screen).classList.remove("hidden");
}

// Select game mode
function chooseGame(selectedMode) {
  stopGame();

  mode = selectedMode;
  get("gameTitle").textContent =
    mode === "bubble" ? "Bubble Rush" : "KeyMagnet";

  showScreen("game");
  prepareGame();
}

// Read difficulty
function level() {
  return settings[get("difficulty").value];
}

// Prepare a new session
function prepareGame() {
  score = 0;
  correct = 0;
  wrong = 0;
  misses = 0;
  totalResponse = 0;
  time = level().time;
  targetKey = "";

  bubbles = [];
  get("playArea").querySelectorAll(".bubble").forEach(b => b.remove());

  get("target").classList.add("hidden");
  get("keyboard").classList.add("hidden");

  get("feedback").textContent = "Press Start to play!";
  get("feedback").className = "";

  updateStats();
}

// Update scoreboard
function updateStats() {
  get("score").textContent = score;
  get("time").textContent = time;
  get("correct").textContent = correct;
  get("wrong").textContent = wrong;
  get("misses").textContent = misses;
}

// Start game
function startGame() {
  if (playing || !mode) return;

  prepareGame();
  playing = true;

  if (mode === "bubble") {
    for (let i = 0; i < level().count; i++) {
      createBubble(i);
    }
    lastFrame = performance.now();
    animation = requestAnimationFrame(moveBubbles);
  } else {
    showKeyboard();
    newTarget();
  }

  timer = setInterval(() => {
    time--;
    updateStats();

    if (time <= 0) {
      endGame("Time is up!");
    }
  }, 1000);
}

// Feedback message
function feedback(message, success) {
  get("feedback").textContent = message;
  get("feedback").className = success ? "good" : "bad";
}

// Create bubble
function createBubble(index = 0) {
  if (!playing) return;

  const area = get("playArea");
  const bubble = document.createElement("div");

  const letter = letters[Math.floor(Math.random() * letters.length)];

  bubble.className = "bubble";
  bubble.textContent = letter;

  const size = window.innerWidth <= 600 ? 42 : 50;
  const maxX = Math.max(0, area.clientWidth - size);

  // Spread starting bubbles across the screen
  const x = Math.random() * maxX;
  const y = area.clientHeight + index * 65;

  bubble.style.left = x + "px";
  bubble.style.top = y + "px";

  area.appendChild(bubble);

  bubbles.push({
    element: bubble,
    letter: letter,
    y: y
  });
}

// Move bubbles upward
function moveBubbles(now) {
  if (!playing) return;

  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i];

    bubble.y -= level().speed * delta;
    bubble.element.style.top = bubble.y + "px";

    // Bubble reaches top
    if (bubble.y < -50) {
      bubble.element.remove();
      bubbles.splice(i, 1);

      misses++;
      feedback("Missed a bubble!", false);
      updateStats();

      if (misses >= 6) {
        endGame("Game Over! Six bubbles missed.");
        return;
      }

      createBubble();
    }
  }

  // Increase difficulty after every 5 correct keys
  const extra = Math.min(Math.floor(correct / 5), 4);
  const needed = level().count + extra;

  while (bubbles.length < needed && playing) {
    createBubble();
  }

  animation = requestAnimationFrame(moveBubbles);
}

// Bubble keyboard input
function bubbleInput(key) {
  const index = bubbles.findIndex(b => b.letter === key);

  if (index !== -1) {
    bubbles[index].element.remove();
    bubbles.splice(index, 1);

    correct++;
    score += 10;
    feedback("Correct! +10 points", true);

    createBubble();
  } else {
    wrong++;
    score = Math.max(0, score - 5);
    feedback("Wrong key! -5 points", false);
  }

  updateStats();
}

// Display keyboard
function showKeyboard() {
  get("target").classList.remove("hidden");
  get("keyboard").classList.remove("hidden");

  const keyboard = get("keyboard");
  keyboard.innerHTML = "";

  const keys = get("difficulty").value === "easy"
    ? homeKeys
    : letters;

  keys.forEach(letter => {
    const div = document.createElement("div");
    div.className = "key";
    div.textContent = letter;
    div.id = "key-" + letter;
    keyboard.appendChild(div);
  });
}

// Generate new target
function newTarget() {
  const keys = get("difficulty").value === "easy"
    ? homeKeys
    : letters;

  targetKey = keys[Math.floor(Math.random() * keys.length)];
  get("target").textContent = targetKey;

  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("active");
  });

  // Easy mode highlights target
  if (get("difficulty").value === "easy") {
    get("key-" + targetKey).classList.add("active");
  }

  targetStart = performance.now();
}

// KeyMagnet keyboard input
function keyInput(key) {
  if (key === targetKey) {
    const response = (performance.now() - targetStart) / 1000;

    totalResponse += response;
    correct++;
    score += 10;

    feedback("Correct! +10 points", true);
    updateStats();

    if (correct >= level().goal) {
      endGame("Congratulations! Level completed.");
      return;
    }

    newTarget();
  } else {
    wrong++;
    score = Math.max(0, score - 5);

    feedback("Wrong key! Try again.", false);
    updateStats();
  }
}

// Listen for keyboard presses
document.addEventListener("keydown", event => {
  if (!playing || event.repeat) return;

  // Ignore shortcut keys
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  const key = event.key.toUpperCase();

  if (!/^[A-Z]$/.test(key)) return;

  if (mode === "bubble") {
    bubbleInput(key);
  } else {
    keyInput(key);
  }
});

// Stop all timers and animations
function stopGame() {
  playing = false;

  clearInterval(timer);
  cancelAnimationFrame(animation);

  timer = null;
  animation = null;
}

// End game and show results
function endGame(message) {
  if (!playing) return;

  stopGame();

  const attempts = correct + wrong;
  const accuracy = attempts > 0
    ? ((correct / attempts) * 100).toFixed(1)
    : 0;

  const average = correct > 0
    ? (totalResponse / correct).toFixed(2)
    : 0;

  get("resultTitle").textContent = message;

  let result = `
    Mode: ${mode === "bubble" ? "Bubble Rush" : "KeyMagnet"}<br>
    Difficulty: ${get("difficulty").value}<br>
    Final Score: ${score}<br>
    Correct Keys: ${correct}<br>
    Wrong Keys: ${wrong}<br>
    Accuracy: ${accuracy}%<br>
  `;

  if (mode === "bubble") {
    result += `Missed Bubbles: ${misses}<br>`;
  } else {
    result += `Average Response Time: ${average} seconds<br>`;
  }

  get("resultText").innerHTML = result;
  showScreen("result");
}

// Restart same game
function restartGame() {
  stopGame();
  showScreen("game");
  startGame();
}

// Reset and return home
function resetGame() {
  stopGame();
  prepareGame();
  mode = "";
  showScreen("home");
}

// Difficulty change
function changeDifficulty() {
  stopGame();
  prepareGame();
}

// Initial screen
showScreen("home");
