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
  };

  function initGame() {
    state.pits = new Array(14).fill(0);
    BLUE_PITS.concat(RED_PITS).forEach((idx) => {
      state.pits[idx] = INITIAL_SEEDS_PER_PIT;
    });
    state.currentPlayer = "red";
    state.selectedPit = null;
    state.gameOver = false;
    buildPits();
    render();
    setMessage("Red starts. Pick a pit and confirm.");
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
    if (!isPlayersPit(index, state.currentPlayer)) {
      setMessage("Select one of your pits.");
      return;
    }
    if (state.pits[index] === 0) {
      setMessage("That pit is empty.");
      return;
    }
    state.selectedPit = index;
    renderSelection();
    setMessage("Confirm to sow stones.");
  }

  function confirmMove() {
    if (state.gameOver) return;
    if (state.selectedPit === null) {
      setMessage("Pick a pit first.");
      return;
    }
    performMove(state.selectedPit);
    state.selectedPit = null;
    render();
  }

  function performMove(startIndex) {
    let stones = state.pits[startIndex];
    state.pits[startIndex] = 0;
    let index = startIndex;
    const opponentStore = getOpponentStore(state.currentPlayer);
    const ownStore = getStore(state.currentPlayer);

    while (stones > 0) {
      index = (index + 1) % 14;
      if (index === opponentStore) continue;
      state.pits[index] += 1;
      stones -= 1;
      
      if (index === ownStore) {
         highlightElements([ownStore], state.currentPlayer);
      }
    }

    // const ownStore = getStore(state.currentPlayer); // Removed duplicate declaration
    if (index === ownStore) {
      highlightElements([ownStore], state.currentPlayer);
      setMessage("Free turn! Go again.");
    } else if (isPlayersPit(index, state.currentPlayer) && state.pits[index] === 1) {
      // Opposite index for 0-5 (Red) vs 7-12 (Blue) mapping: sum is 12 (0+12, 5+7).
      const opposite = 12 - index;
      const captured = state.pits[opposite];
      
      // Capture Rule: If last stone lands in empty pit on your side,
      // take that stone + any opponent stones (even if 0) to your store.
      state.pits[ownStore] += captured + 1;
      state.pits[index] = 0;
      state.pits[opposite] = 0;
      
      highlightElements([index, opposite, ownStore], state.currentPlayer);

      if (captured > 0) {
        setMessage("Capture! Stones moved to your store.");
      } else {
        setMessage("Capture! You took your own stone.");
      }
      
      switchTurn();
    } else {
      setMessage("Turn complete.");
      switchTurn();
    }

    checkGameEnd();
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
        setTimeout(() => el.classList.remove(className), 750);
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
    confirmBtn.disabled = state.selectedPit === null || state.gameOver;
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

      const isDisabled = state.gameOver || !isPlayersPit(idx, state.currentPlayer) || state.pits[idx] === 0;
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
    confirmBtn.disabled = state.selectedPit === null || state.gameOver;
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
      setMessage(`Game over. Red wins ${redScore}-${blueScore}.`);
    } else {
      setMessage(`Game over. Blue wins ${blueScore}-${redScore}.`);
    }
  }

  function setMessage(text) {
    messageEl.textContent = text;
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

