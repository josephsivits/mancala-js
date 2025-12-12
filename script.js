(() => {
  const RED_PITS = [0, 1, 2, 3, 4, 5];
  const RED_STORE = 6;
  const BLUE_PITS = [7, 8, 9, 10, 11, 12];
  const BLUE_STORE = 13;
  const INITIAL_SEEDS_PER_PIT = 4;

  const turnIndicator = document.getElementById("turnIndicator");
  const messageEl = document.getElementById("message");
  const confirmBtn = document.getElementById("confirmMove");
  const restartBtn = document.getElementById("restartGame");
  const topRow = document.getElementById("topRow");
  const bottomRow = document.getElementById("bottomRow");
  const blueStoreEl = document.getElementById("blueStore");
  const redStoreEl = document.getElementById("redStore");

  const state = {
    pits: [],
    currentPlayer: "red",
    selectedPit: null,
    gameOver: false,
    animating: false,
  };

  // Audio context for sound effects
  let audioContext = null;
  let currentNoteIndex = 0; // Tracks which note to play during a move (resets each move)
  
  // Musical scale frequencies: C3, D3, E3, F3, G3, A3, B3, C4, D4, E4...
  const NOTE_FREQUENCIES = [
    130.81, // C3
    146.83, // D3
    164.81, // E3
    174.61, // F3
    196.00, // G3
    220.00, // A3
    246.94, // B3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
  ];
  
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playNote() {
    if (!audioContext) initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Get frequency for current note index (wraps around if needed)
    const frequency = NOTE_FREQUENCIES[currentNoteIndex % NOTE_FREQUENCIES.length];
    oscillator.frequency.value = frequency;
    oscillator.type = "sine"; // Piano-like tone
    
    // Envelope for natural piano sound (quick attack, short decay)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Decay
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15); // Short duration
    
    // Move to next note for next stone
    currentNoteIndex++;
  }

  async function playPowerChord() {
    if (!audioContext) initAudio();
    
    // Power chord: C3 (130.81), G3 (196.00), C4 (261.63)
    const frequencies = [130.81, 196.00, 261.63];
    const eighthNoteDuration = 0.25; // Eighth note at ~120 BPM
    const now = audioContext.currentTime;
    
    // Play twice back-to-back (two eighth notes total)
    for (let i = 0; i < 2; i++) {
      const startTime = now + (i * eighthNoteDuration);
      
      frequencies.forEach((freq) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.frequency.value = freq;
        oscillator.type = "sine";
        
        // Envelope for power chord (quick attack, sustain, quick release)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.setValueAtTime(0.3, startTime + eighthNoteDuration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + eighthNoteDuration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + eighthNoteDuration);
      });
    }
  }

  function initGame() {
    state.animating = false;
    state.pits = new Array(14).fill(0);
    BLUE_PITS.concat(RED_PITS).forEach((idx) => {
      state.pits[idx] = INITIAL_SEEDS_PER_PIT;
    });
    state.currentPlayer = "red";
    state.selectedPit = null;
    state.gameOver = false;
    clearRunner();
    buildPits();
    render();
    setMessage(`<span class="text-red">Red</span> starts. Pick a pit and confirm.`);
  }

  function buildPits() {
    topRow.innerHTML = "";
    bottomRow.innerHTML = "";

    // Top row shows blue pits:
    // We want visually Left->Right to be indices 12, 11, 10, 9, 8, 7.
    // This way, moving "counter-clockwise" (increasing index) goes 7->8...->12->13(BlueStore).
    // So we render 12..7 in the DOM for LTR display.
    [...BLUE_PITS].reverse().forEach((idx) => {
      const pit = createPitElement(idx, "blue");
      topRow.appendChild(pit);
    });

    RED_PITS.forEach((idx) => {
      const pit = createPitElement(idx, "red");
      bottomRow.appendChild(pit);
    });
  }

  function createPitElement(index, owner) {
    const btn = document.createElement("button");
    btn.className = `pit ${owner}`;
    btn.dataset.index = index;
    btn.addEventListener("click", () => handlePitClick(index));
    return btn;
  }

  function handlePitClick(index) {
    if (state.gameOver) return;
    if (state.animating) return;
    if (!isPlayersPit(index, state.currentPlayer)) {
      setMessage("Select one of your pits.");
      return;
    }
    if (state.pits[index] === 0) {
      setMessage("That pit is empty.");
      return;
    }
    // Initialize audio on first user interaction (required by browsers)
    initAudio();
    state.selectedPit = index;
    renderSelection();
    setMessage("Confirm to sow stones.");
  }

  function confirmMove() {
    if (state.gameOver) return;
    if (state.animating) return;
    if (state.selectedPit === null) {
      setMessage("Pick a pit first.");
      return;
    }
    const startIndex = state.selectedPit;
    state.selectedPit = null;
    renderSelection();
    animateMove(startIndex);
  }

  async function animateMove(startIndex) {
    state.animating = true;
    clearRunner();
    render(); // disables inputs while we animate

    // Reset note index to C3 at the start of each move
    currentNoteIndex = 0;

    const movingPlayer = state.currentPlayer;
    const opponentStore = getOpponentStore(movingPlayer);
    const ownStore = getStore(movingPlayer);

    let stones = state.pits[startIndex];
    state.pits[startIndex] = 0;
    updatePitText(startIndex);

    // Show runner briefly where stones were picked up
    showRunnerAtIndex(startIndex);
    await sleep(140);

    let index = startIndex;
    while (stones > 0) {
      index = (index + 1) % 14;
      if (index === opponentStore) continue;

      state.pits[index] += 1;
      stones -= 1;

      showRunnerAtIndex(index);
      updateIndexText(index);
      playNote(); // Play ascending note (C3, D3, E3...) for each stone drop

      // Pulse store whenever a point is rendered there
      if (index === ownStore) {
        highlightElements([ownStore], movingPlayer);
      }

      await sleep(180);
    }

    await resolveAfterLastDrop({ movingPlayer, lastIndex: index, ownStore });

    clearRunner();
    state.animating = false;
    render();
  }

  async function resolveAfterLastDrop({ movingPlayer, lastIndex, ownStore }) {
    if (lastIndex === ownStore) {
      highlightElements([ownStore], movingPlayer);
      setMessage("Free turn! Go again.");
      // currentPlayer stays the same
      checkGameEnd();
      return;
    }

    // Capture rule: last stone lands in an empty pit on your side (now has exactly 1).
    if (isPlayersPit(lastIndex, movingPlayer) && state.pits[lastIndex] === 1) {
      const opposite = 12 - lastIndex;
      const captured = state.pits[opposite];

      state.pits[ownStore] += captured + 1;
      state.pits[lastIndex] = 0;
      state.pits[opposite] = 0;

      updateIndexText(ownStore);
      updatePitText(lastIndex);
      updatePitText(opposite);

      highlightElements([lastIndex, opposite, ownStore], movingPlayer);
      playPowerChord(); // Play power chord (C3, G3, C4) twice in eighth notes

      const totalCaptured = captured + 1;
      const stoneLabel = totalCaptured === 1 ? "Stone" : "Stones";
      const storeName = movingPlayer === "red" ? "Red Store" : "Blue Store";
      const colorClass = movingPlayer === "red" ? "text-red" : "text-blue";
      setMessage(
        `Capture! Moved <b>${totalCaptured} ${stoneLabel}</b> to <span class="${colorClass}">${storeName}</span>!`,
      );

      switchTurn();
      checkGameEnd();
      return;
    }

    setMessage("Turn complete.");
    switchTurn();
    checkGameEnd();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getPitEl(idx) {
    return document.querySelector(`.pit[data-index="${idx}"]`);
  }

  function updatePitText(idx) {
    const el = getPitEl(idx);
    if (el) el.textContent = state.pits[idx];
  }

  function updateIndexText(idx) {
    if (idx === BLUE_STORE || idx === RED_STORE) {
      renderStores();
      return;
    }
    updatePitText(idx);
  }

  function showRunnerAtIndex(idx) {
    clearRunner();
    let el;
    if (idx === RED_STORE) el = document.querySelector(".store-red");
    else if (idx === BLUE_STORE) el = document.querySelector(".store-blue");
    else el = getPitEl(idx);
    if (el) el.classList.add("runner");
  }

  function clearRunner() {
    document.querySelectorAll(".runner").forEach((el) => el.classList.remove("runner"));
  }

  function highlightElements(indices, player) {
    const className = player === "red" ? "glow-red" : "glow-blue";
    indices.forEach((idx) => {
      let el;
      if (idx === RED_STORE) {
        el = document.querySelector(".store-red");
      } else if (idx === BLUE_STORE) {
        el = document.querySelector(".store-blue");
      } else {
        el = document.querySelector(`.pit[data-index="${idx}"]`);
      }

      if (el) {
        // Remove class first to restart animation if already running
        el.classList.remove(className);
        // Force reflow
        void el.offsetWidth; 
        el.classList.add(className);
        setTimeout(() => el.classList.remove(className), 1500);
      }
    });
  }

  function switchTurn() {
    state.currentPlayer = state.currentPlayer === "red" ? "blue" : "red";
  }

  function isPlayersPit(index, player) {
    return player === "red" ? RED_PITS.includes(index) : BLUE_PITS.includes(index);
  }

  function getStore(player) {
    return player === "red" ? RED_STORE : BLUE_STORE;
  }

  function getOpponentStore(player) {
    return player === "red" ? BLUE_STORE : RED_STORE;
  }

  function render() {
    renderStores();
    renderPits();
    renderSelection();
    updateTurnIndicator();
    confirmBtn.disabled = state.animating || state.selectedPit === null || state.gameOver;
  }

  function renderStores() {
    blueStoreEl.textContent = state.pits[BLUE_STORE];
    redStoreEl.textContent = state.pits[RED_STORE];
  }

  function renderPits() {
    const allPits = document.querySelectorAll(".pit");
    allPits.forEach((pit) => {
      const idx = Number(pit.dataset.index);
      pit.textContent = state.pits[idx];

      const isDisabled =
        state.animating || state.gameOver || !isPlayersPit(idx, state.currentPlayer) || state.pits[idx] === 0;
      pit.classList.toggle("disabled", isDisabled);
    });
  }

  function renderSelection() {
    const allPits = document.querySelectorAll(".pit");
    allPits.forEach((pit) => {
      const idx = Number(pit.dataset.index);
      const isSelected = state.selectedPit === idx;
      pit.classList.toggle("selected", isSelected);
    });
    confirmBtn.disabled = state.animating || state.selectedPit === null || state.gameOver;
  }

  function updateTurnIndicator() {
    const playerLabel = state.currentPlayer === "red" ? "Red" : "Blue";
    turnIndicator.textContent = `${playerLabel} turn`;
    turnIndicator.style.borderColor = state.currentPlayer === "red" ? "#ef5350" : "#1e90ff";
  }

  function checkGameEnd() {
    const redEmpty = RED_PITS.every((idx) => state.pits[idx] === 0);
    const blueEmpty = BLUE_PITS.every((idx) => state.pits[idx] === 0);

    if (!redEmpty && !blueEmpty) return;

    if (redEmpty) {
      const blueRemaining = BLUE_PITS.reduce((sum, idx) => sum + state.pits[idx], 0);
      state.pits[BLUE_STORE] += blueRemaining;
      BLUE_PITS.forEach((idx) => (state.pits[idx] = 0));
    } else if (blueEmpty) {
      const redRemaining = RED_PITS.reduce((sum, idx) => sum + state.pits[idx], 0);
      state.pits[RED_STORE] += redRemaining;
      RED_PITS.forEach((idx) => (state.pits[idx] = 0));
    }

    state.gameOver = true;
    renderStores();
    renderPits();
    declareWinner();
  }

  function declareWinner() {
    const redScore = state.pits[RED_STORE];
    const blueScore = state.pits[BLUE_STORE];
    if (redScore === blueScore) {
      setMessage(`Game over. It's a tie (${redScore}-${blueScore}).`);
    } else if (redScore > blueScore) {
      setMessage(`Game over. <span class="text-red">Red</span> wins ${redScore}-${blueScore}.`);
    } else {
      setMessage(`Game over. <span class="text-blue">Blue</span> wins ${blueScore}-${redScore}.`);
    }
  }

  function setMessage(html) {
    messageEl.innerHTML = html;
  }

  confirmBtn.addEventListener("click", confirmMove);
  restartBtn.addEventListener("click", initGame);
  document.addEventListener("keydown", (evt) => {
    if (evt.key.toLowerCase() === "enter" && !confirmBtn.disabled) {
      confirmMove();
    }
  });

  initGame();
})();

