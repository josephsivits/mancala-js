(() => {
  const BLUE_STORE = 0;
  const RED_STORE = 13;
  const BLUE_PITS = [1, 2, 3, 4, 5, 6];
  const RED_PITS = [7, 8, 9, 10, 11, 12];
  const INITIAL_SEEDS_PER_PIT = 3;

  const turnIndicator = document.getElementById("turnIndicator");
  const messageEl = document.getElementById("message");
  const confirmBtn = document.getElementById("confirmMove");
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

    // Top row shows blue pits right-to-left visually; we create in reverse so CSS rtl keeps numbers aligned.
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

    while (stones > 0) {
      index = (index + 1) % 14;
      if (index === opponentStore) continue;
      state.pits[index] += 1;
      stones -= 1;
    }

    const ownStore = getStore(state.currentPlayer);
    if (index === ownStore) {
      setMessage("Free turn! Go again.");
    } else if (isPlayersPit(index, state.currentPlayer) && state.pits[index] === 1) {
      const opposite = 13 - index;
      const captured = state.pits[opposite];
      if (captured > 0) {
        state.pits[ownStore] += captured + 1;
        state.pits[index] = 0;
        state.pits[opposite] = 0;
        setMessage("Capture! Stones moved to your store.");
      } else {
        setMessage("Turn complete.");
      }
      switchTurn();
    } else {
      setMessage("Turn complete.");
      switchTurn();
    }

    checkGameEnd();
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
  document.addEventListener("keydown", (evt) => {
    if (evt.key.toLowerCase() === "enter" && !confirmBtn.disabled) {
      confirmMove();
    }
  });

  initGame();
})();

