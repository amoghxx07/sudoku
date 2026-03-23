document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let board = [];
    let initialBoard = [];
    let solution = [];
    let notes = Array.from({length: 81}, () => new Set());
    let selectedIdx = null;
    let isNoteMode = false;
    let timerInterval = null;
    let seconds = 0;

    // --- DOM Elements ---
    const boardElement = document.getElementById('sudoku-board');
    const timerElement = document.getElementById('timer');
    const diffDisplay = document.getElementById('difficulty-display');
    const diffSelect = document.getElementById('difficulty-select');
    const noteModeBtn = document.getElementById('note-mode-btn');
    const hintBtn = document.getElementById('hint-btn');
    const hintText = document.querySelector('.hint-text');
    const statsWon = document.getElementById('stats-won');

    // --- Initialization ---
    function init() {
        createBoardGrid();
        loadStats();
        startNewGame();
        
        // Event Listeners
        document.getElementById('new-game-btn').addEventListener('click', startNewGame);
        noteModeBtn.addEventListener('click', toggleNoteMode);
        hintBtn.addEventListener('click', provideHint);
        document.getElementById('erase-btn').addEventListener('click', () => handleInput(0));
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => handleInput(parseInt(btn.dataset.val)));
        });

        window.addEventListener('keydown', handleKeyDown);
    }

    function createBoardGrid() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => selectCell(i));
            boardElement.appendChild(cell);
        }
    }

    // --- Game Lifecycle ---
    function startNewGame() {
        const difficulty = diffSelect.value;
        const generated = SudokuLogic.generate(difficulty);
        
        board = [...generated.puzzle];
        initialBoard = [...generated.puzzle];
        solution = [...generated.fullBoard];
        notes = Array.from({length: 81}, () => new Set());
        
        diffDisplay.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        resetTimer();
        render();
        hintText.textContent = "New game started. Good luck!";
    }

    function render() {
        const cells = boardElement.querySelectorAll('.cell');
        const selectedVal = selectedIdx !== null ? board[selectedIdx] : null;

        cells.forEach((cell, i) => {
            cell.classList.remove('selected', 'fixed', 'error', 'highlight');
            cell.innerHTML = '';

            const currentVal = board[i];

            if (initialBoard[i] !== 0) {
                cell.classList.add('fixed');
                cell.textContent = initialBoard[i];
            } else if (currentVal !== 0) {
                cell.textContent = currentVal;
                if (currentVal !== solution[i]) cell.classList.add('error');
            } else {
                // Render Notes
                const noteGrid = document.createElement('div');
                noteGrid.classList.add('note-grid');
                for (let n = 1; n <= 9; n++) {
                    const noteItem = document.createElement('div');
                    noteItem.classList.add('note-item');
                    if (notes[i].has(n)) noteItem.textContent = n;
                    noteGrid.appendChild(noteItem);
                }
                cell.appendChild(noteGrid);
            }

            if (selectedIdx === i) {
                cell.classList.add('selected');
            } else if (selectedVal !== null && selectedVal !== 0 && currentVal === selectedVal) {
                cell.classList.add('highlight');
            }
        });

        checkWin();
    }

    // --- Interactions ---
    function selectCell(idx) {
        selectedIdx = idx;
        render();
    }

    function handleInput(val) {
        if (selectedIdx === null || initialBoard[selectedIdx] !== 0) return;

        if (isNoteMode && val !== 0) {
            if (notes[selectedIdx].has(val)) notes[selectedIdx].delete(val);
            else notes[selectedIdx].add(val);
        } else {
            board[selectedIdx] = val;
            if (val !== 0) notes[selectedIdx].clear();
        }
        render();
    }

    function toggleNoteMode() {
        isNoteMode = !isNoteMode;
        noteModeBtn.classList.toggle('active', isNoteMode);
        document.getElementById('note-status').textContent = isNoteMode ? "ON" : "OFF";
    }

    function provideHint() {
        const result = SudokuLogic.solveLogically(board);
        if (result.steps.length > 0) {
            const step = result.steps[0];
            selectCell(step.index);
            hintText.innerHTML = `<strong>Strategy: ${step.type}</strong><br>${step.reason}`;
        } else if (board.includes(0)) {
            hintText.textContent = "This puzzle might require more advanced techniques than currently implemented, but it is solvable through logic!";
        } else {
            hintText.textContent = "Board is complete!";
        }
    }

    function handleKeyDown(e) {
        if (e.key >= '1' && e.key <= '9') handleInput(parseInt(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete') handleInput(0);
        else if (e.key === 'n' || e.key === 'N') toggleNoteMode();
        else if (e.key.startsWith('Arrow')) {
            if (selectedIdx === null) { selectedIdx = 0; render(); return; }
            let r = Math.floor(selectedIdx / 9);
            let c = selectedIdx % 9;
            if (e.key === 'ArrowUp') r = (r + 8) % 9;
            if (e.key === 'ArrowDown') r = (r + 1) % 9;
            if (e.key === 'ArrowLeft') c = (c + 8) % 9;
            if (e.key === 'ArrowRight') c = (c + 1) % 9;
            selectCell(r * 9 + c);
        }
    }

    // --- Utilities ---
    function resetTimer() {
        clearInterval(timerInterval);
        seconds = 0;
        timerElement.textContent = "00:00";
        timerInterval = setInterval(() => {
            seconds++;
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            timerElement.textContent = `${m}:${s}`;
        }, 1000);
    }

    function checkWin() {
        if (!board.includes(0) && board.every((val, i) => val === solution[i])) {
            clearInterval(timerInterval);
            hintText.textContent = "Congratulations! You solved it!";
            saveStats();
        }
    }

    function saveStats() {
        let won = parseInt(localStorage.getItem('sudoku_won') || 0);
        localStorage.setItem('sudoku_won', won + 1);
        loadStats();
    }

    function loadStats() {
        statsWon.textContent = localStorage.getItem('sudoku_won') || 0;
    }

    init();
});
