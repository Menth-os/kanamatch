// Basic state
let vocab = [];
let currentMode = null; // "single-choice" | "drag-drop"
let questions = [];
let currentIndex = 0;
let currentQuestion = null;
let selectedOptionId = null; // for single-choice
let dragAssignments = {}; // for drag-drop: { imageId: vocabId }
let hasChecked = false;

const QUESTION_COUNT = 10;

// Elements
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const modeButtons = document.querySelectorAll(".mode-btn");
const backBtn = document.getElementById("back-btn");
const gameArea = document.getElementById("game-area");
const checkBtn = document.getElementById("check-btn");
const nextBtn = document.getElementById("next-btn");
const feedbackEl = document.getElementById("feedback");
const questionNumberEl = document.getElementById("question-number");
const questionTotalEl = document.getElementById("question-total");

// Load vocab
fetch("data/vocab.json")
  .then((res) => res.json())
  .then((data) => {
    vocab = data;
  })
  .catch((err) => {
    console.error("Failed to load vocab.json", err);
  });

// Mode selection
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentMode = btn.dataset.mode;
    startBtn.disabled = false;
  });
});

// Start game
startBtn.addEventListener("click", () => {
  if (!currentMode || vocab.length === 0) return;
  questions = buildQuestions(currentMode, QUESTION_COUNT);
  currentIndex = 0;
  questionTotalEl.textContent = questions.length.toString();
  switchScreen("game");
  loadQuestion();
});

// Back to start
backBtn.addEventListener("click", () => {
  switchScreen("start");
});

// Check answer
checkBtn.addEventListener("click", () => {
  if (!currentQuestion || hasChecked) return;
  hasChecked = true;

  if (currentMode === "single-choice") {
    evaluateSingleChoice();
  } else {
    evaluateDragDrop();
  }

  checkBtn.disabled = true;
  nextBtn.disabled = false;
});

// Next question
nextBtn.addEventListener("click", () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    loadQuestion();
  } else {
    showEndScreen();
  }
});

// Helpers

function switchScreen(screen) {
  if (screen === "start") {
    startScreen.classList.add("active");
    gameScreen.classList.remove("active");
  } else {
    startScreen.classList.remove("active");
    gameScreen.classList.add("active");
  }
}

function buildQuestions(mode, count) {
  const shuffled = [...vocab].sort(() => Math.random() - 0.5);
  const questions = [];

  if (mode === "single-choice") {
    for (let i = 0; i < count; i++) {
      const correct = shuffled[i % shuffled.length];
      const distractors = pickRandomExcept(vocab, correct.id, 3);
      const options = shuffleArray([correct, ...distractors]);
      questions.push({
        type: "single-choice",
        correctId: correct.id,
        image: correct.image,
        options: options.map((o) => o.id),
      });
    }
  } else {
    // drag-drop: 4 images per question
    for (let i = 0; i < count; i++) {
      const group = pickRandom(vocab, 4);
      const imageIds = group.map((g) => g.id);
      const optionIds = shuffleArray([...imageIds]);
      questions.push({
        type: "drag-drop",
        imageIds,
        optionIds,
      });
    }
  }

  return questions;
}

function pickRandom(arr, n) {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  return copy.slice(0, Math.min(n, copy.length));
}

function pickRandomExcept(arr, excludeId, n) {
  const filtered = arr.filter((item) => item.id !== excludeId);
  return pickRandom(filtered, n);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadQuestion() {
  currentQuestion = questions[currentIndex];
  selectedOptionId = null;
  dragAssignments = {};
  hasChecked = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  checkBtn.disabled = true;
  nextBtn.disabled = true;

  questionNumberEl.textContent = (currentIndex + 1).toString();

  if (currentQuestion.type === "single-choice") {
    renderSingleChoice(currentQuestion);
  } else {
    renderDragDrop(currentQuestion);
  }
}

// Single-choice rendering & evaluation

function renderSingleChoice(q) {
  const correct = vocab.find((v) => v.id === q.correctId);
  const options = q.options.map((id) => vocab.find((v) => v.id === id));

  gameArea.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "single-choice-layout";

  const imageBox = document.createElement("div");
  imageBox.className = "single-choice-image";
  const img = document.createElement("img");
  img.src = correct.image;
  img.alt = correct.english;
  imageBox.appendChild(img);

  const optionsBox = document.createElement("div");
  optionsBox.className = "single-choice-options";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.id = opt.id;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = `${opt.kana}${opt.kanji ? " (" + opt.kanji + ")" : ""}`;

    const readingSpan = document.createElement("span");
    readingSpan.className = "reading";
    readingSpan.textContent = opt.english;

    btn.appendChild(labelSpan);
    btn.appendChild(readingSpan);

    btn.addEventListener("click", () => {
      if (hasChecked) return;
      document
        .querySelectorAll(".option-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOptionId = opt.id;
      checkBtn.disabled = false;
    });

    optionsBox.appendChild(btn);
  });

  layout.appendChild(imageBox);
  layout.appendChild(optionsBox);
  gameArea.appendChild(layout);
}

function evaluateSingleChoice() {
  const correctId = currentQuestion.correctId;
  const buttons = document.querySelectorAll(".option-btn");
  let isCorrect = false;

  buttons.forEach((btn) => {
    const id = btn.dataset.id;
    if (id === correctId) {
      btn.classList.add("correct");
    }
    if (id === selectedOptionId && id !== correctId) {
      btn.classList.add("incorrect");
    }
  });

  if (selectedOptionId === correctId) {
    isCorrect = true;
  }

  showFeedback(isCorrect);
}

// Drag & drop rendering & evaluation

function renderDragDrop(q) {
  gameArea.innerHTML = "";

  const layout = document.createElement("div");
  layout.className = "drag-drop-layout";

  const imagesBox = document.createElement("div");
  imagesBox.className = "drag-drop-images";

  q.imageIds.forEach((id) => {
    const vocabItem = vocab.find((v) => v.id === id);
    const zone = document.createElement("div");
    zone.className = "drop-zone";
    zone.dataset.imageId = id;

    const img = document.createElement("img");
    img.src = vocabItem.image;
    img.alt = vocabItem.english;

    const label = document.createElement("div");
    label.className = "drop-zone-label";
    label.textContent = vocabItem.english;

    const target = document.createElement("div");
    target.className = "drop-target";
    target.textContent = "Drop word here";
    target.dataset.imageId = id;

    zone.appendChild(img);
    zone.appendChild(label);
    zone.appendChild(target);
    imagesBox.appendChild(zone);
  });

  const answersBox = document.createElement("div");
  answersBox.className = "drag-drop-answers";

  q.optionIds.forEach((id) => {
    const vocabItem = vocab.find((v) => v.id === id);
    const card = document.createElement("div");
    card.className = "draggable-card";
    card.draggable = true;
    card.dataset.id = id;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = `${vocabItem.kana}${
      vocabItem.kanji ? " (" + vocabItem.kanji + ")" : ""
    }`;

    const readingSpan = document.createElement("span");
    readingSpan.className = "reading";
    readingSpan.textContent = vocabItem.english;

    card.appendChild(labelSpan);
    card.appendChild(readingSpan);

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);

    answersBox.appendChild(card);
  });

  layout.appendChild(imagesBox);
  layout.appendChild(answersBox);
  gameArea.appendChild(layout);

  // Drop targets
  const targets = gameArea.querySelectorAll(".drop-target");
  targets.forEach((target) => {
    target.addEventListener("dragover", handleDragOver);
    target.addEventListener("drop", handleDrop);
  });
}

function handleDragStart(e) {
  if (hasChecked) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData("text/plain", e.target.dataset.id);
  e.target.classList.add("dragging");
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  if (hasChecked) return;

  const vocabId = e.dataTransfer.getData("text/plain");
  const imageId = e.currentTarget.dataset.imageId;

  // Remove previous assignment of this vocabId
  for (const key in dragAssignments) {
    if (dragAssignments[key] === vocabId) {
      dragAssignments[key] = null;
    }
  }

  dragAssignments[imageId] = vocabId;

  // Update UI
  const allTargets = gameArea.querySelectorAll(".drop-target");
  allTargets.forEach((t) => {
    if (t.dataset.imageId === imageId) {
      const vocabItem = vocab.find((v) => v.id === vocabId);
      t.textContent = `${vocabItem.kana}${
        vocabItem.kanji ? " (" + vocabItem.kanji + ")" : ""
      }`;
      t.classList.add("filled");
    } else if (!dragAssignments[t.dataset.imageId]) {
      t.textContent = "Drop word here";
      t.classList.remove("filled");
    }
  });

  const cards = gameArea.querySelectorAll(".draggable-card");
  cards.forEach((card) => {
    const id = card.dataset.id;
    const assigned = Object.values(dragAssignments).includes(id);
    card.classList.toggle("assigned", assigned);
  });

  // Enable check if all images have assignments
  const imageIds = currentQuestion.imageIds;
  const allAssigned = imageIds.every((id) => dragAssignments[id]);
  checkBtn.disabled = !allAssigned;
}

function evaluateDragDrop() {
  const imageIds = currentQuestion.imageIds;
  let allCorrect = true;

  const targets = gameArea.querySelectorAll(".drop-target");
  targets.forEach((target) => {
    const imageId = target.dataset.imageId;
    const assignedId = dragAssignments[imageId];
    if (!assignedId) return;

    if (assignedId === imageId) {
      target.classList.add("correct");
    } else {
      target.classList.add("incorrect");
      allCorrect = false;
    }
  });

  showFeedback(allCorrect);
}

function showFeedback(isCorrect) {
  feedbackEl.className = "feedback " + (isCorrect ? "correct" : "incorrect");
  feedbackEl.textContent = isCorrect ? "Nice! That’s correct." : "Not quite—check the highlighted answers.";
}

function showEndScreen() {
  gameArea.innerHTML = "";
  feedbackEl.className = "feedback";
  feedbackEl.textContent = "";

  const endCard = document.createElement("div");
  endCard.className = "single-choice-layout";
  endCard.style.gridTemplateColumns = "minmax(0, 1fr)";

  const content = document.createElement("div");
  content.innerHTML = `
    <h2>Game finished!</h2>
    <p>You’ve completed ${questions.length} questions.</p>
    <p style="color: var(--muted); font-size: 0.9rem;">
      Reload the page or go back to start to play again with a new random set.
    </p>
  `;

  endCard.appendChild(content);
  gameArea.appendChild(endCard);

  checkBtn.disabled = true;
  nextBtn.disabled = true;
}
