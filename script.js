document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let state = {
        board: [],
        initialBoard: [],
        solution: [],
        notes: Array.from({length: 81}, () => new Set()),
        history: [], // For Undo
        redoStack: [], // For Redo
        selectedIdx: null,
        mode: 'focus', // 'focus', 'pressure', 'challenge'
        isNoteMode: false,
        isHeatmapVisible: false,
        mastery: {
            mp: parseInt(localStorage.getItem('sudoku_mp') || 0),
            level: 1,
            unlocked: ['Naked Single', 'Hidden Single']
        },
        stats: {
            timeSpent: Array(81).fill(0),
            mistakes: Array(81).fill(0),
            totalErrors: 0,
            totalMoves: 0
        },
        pressure: {
            lives: 3,
            streak: parseInt(localStorage.getItem('sudoku_streak') || 0),
            lastPlayed: localStorage.getItem('sudoku_last_played') || null
        },
        timerInterval: null,
        seconds: 0,
        ghostMode: {
            active: false,
            replayData: JSON.parse(localStorage.getItem('sudoku_last_solve') || '[]'),
            startTime: 0
        }
    };

    // --- DOM Elements ---
    const elements = {
        board: document.getElementById('sudoku-board'),
        timer: document.getElementById('timer'),
        masteryLevel: document.getElementById('mastery-level'),
        masteryRank: document.getElementById('mastery-rank'),
        livesCount: document.getElementById('lives-count'),
        streakCount: document.getElementById('streak-count'),
        hintText: document.querySelector('.hint-text'),
        heatmapOverlay: document.getElementById('heatmap-overlay'),
        ghostLayer: document.getElementById('ghost-layer'),
        notesToggle: document.getElementById('notes-toggle-btn'),
        metricErrorRate: document.getElementById('metric-error-rate'),
        metricAvgTime: document.getElementById('metric-avg-time')
    };

    // --- Initialization ---
    function init() {
        setupEventListeners();
        updateMasteryUI();
        startNewGame();
    }

    function setupEventListeners() {
        document.getElementById('btn-focus').addEventListener('click', () => switchMode('focus'));
        document.getElementById('btn-pressure').addEventListener('click', () => switchMode('pressure'));
        document.getElementById('btn-challenge').addEventListener('click', () => switchMode('challenge'));
        document.getElementById('new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('hint-btn').addEventListener('click', provideAdvancedHint);
        document.getElementById('undo-btn').addEventListener('click', undo);
        document.getElementById('redo-btn').addEventListener('click', redo);
        document.getElementById('notes-toggle-btn').addEventListener('click', toggleNoteMode);
        document.getElementById('heatmap-toggle-btn').addEventListener('click', toggleHeatmap);
        document.getElementById('ghost-replay-btn').addEventListener('click', toggleGhostMode);
        document.getElementById('erase-btn').addEventListener('click', () => handleInput(0));
        
        document.querySelectorAll('.num-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', () => handleInput(parseInt(btn.dataset.val)));
        });

        window.addEventListener('keydown', handleKeyDown);
    }

    // --- Core Systems ---
    function startNewGame() {
        const generated = SudokuLogic.generate(state.mastery.level);
        state.board = [...generated.puzzle];
        state.initialBoard = [...generated.puzzle];
        state.solution = [...generated.fullBoard];
        state.notes = Array.from({length: 81}, () => new Set());
        state.history = [];
        state.redoStack = [];
        state.stats.timeSpent = Array(81).fill(0);
        state.stats.mistakes = Array(81).fill(0);
        state.stats.totalErrors = 0;
        state.stats.totalMoves = 0;
        state.seconds = 0;
        state.ghostMode.active = false;
        
        render();
        resetTimer();
        updateStreak();
    }

    function handleInput(val) {
        if (state.selectedIdx === null || state.initialBoard[state.selectedIdx] !== 0) return;

        saveHistory();
        state.stats.totalMoves++;
        
        if (state.isNoteMode && val !== 0) {
            if (state.notes[state.selectedIdx].has(val)) state.notes[state.selectedIdx].delete(val);
            else state.notes[state.selectedIdx].add(val);
        } else {
            const correctVal = state.solution[state.selectedIdx];
            if (val !== 0 && val !== correctVal) {
                state.stats.mistakes[state.selectedIdx]++;
                state.stats.totalErrors++;
                if (state.mode === 'pressure') {
                    state.pressure.lives--;
                    elements.livesCount.textContent = state.pressure.lives;
                    if (state.pressure.lives <= 0) return gameOver();
                }
            }
            state.board[state.selectedIdx] = val;
            if (val !== 0) state.notes[state.selectedIdx].clear();
        }
        
        render();
        checkWin();
        updateMetrics();
    }

    function undo() {
        if (state.history.length === 0) return;
        state.redoStack.push({ board: [...state.board], notes: state.notes.map(s => new Set(s)) });
        const last = state.history.pop();
        state.board = last.board;
        state.notes = last.notes;
        render();
    }

    function redo() {
        if (state.redoStack.length === 0) return;
        state.history.push({ board: [...state.board], notes: state.notes.map(s => new Set(s)) });
        const next = state.redoStack.pop();
        state.board = next.board;
        state.notes = next.notes;
        render();
    }

    function saveHistory() {
        state.history.push({ 
            board: [...state.board], 
            notes: state.notes.map(s => new Set(s)) 
        });
        if (state.history.length > 50) state.history.shift();
        state.redoStack = [];
    }

    // --- UI Helpers ---
    function render() {
        elements.board.innerHTML = '';
        const conflicts = SudokuLogic.findConflicts(state.board);
        const selectedVal = state.selectedIdx !== null ? state.board[state.selectedIdx] : null;

        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const val = state.board[i];
            
            if (state.initialBoard[i] !== 0) {
                cell.classList.add('fixed');
                cell.textContent = val;
            } else if (val !== 0) {
                const span = document.createElement('span');
                span.className = 'placed-number';
                span.textContent = val;
                cell.appendChild(span);
                if (val !== state.solution[i]) cell.classList.add('error');
            } else {
                const noteGrid = document.createElement('div');
                noteGrid.className = 'note-grid';
                for (let n = 1; n <= 9; n++) {
                    const nItem = document.createElement('div');
                    nItem.className = 'note-item';
                    if (state.notes[i].has(n)) nItem.textContent = n;
                    noteGrid.appendChild(nItem);
                }
                cell.appendChild(noteGrid);
            }

            // Highlighting
            if (state.selectedIdx === i) cell.classList.add('selected');
            if (conflicts.includes(i)) cell.classList.add('conflict');
            if (selectedVal && selectedVal !== 0 && val === selectedVal) cell.classList.add('highlight-val');

            cell.addEventListener('click', () => { 
                state.selectedIdx = i; 
                render(); 
            });
            elements.board.appendChild(cell);
        }
        updateHeatmap();
    }

    function updateHeatmap() {
        elements.heatmapOverlay.innerHTML = '';
        if (!state.isHeatmapVisible) {
            elements.heatmapOverlay.classList.add('hidden');
            return;
        }
        elements.heatmapOverlay.classList.remove('hidden');

        const maxTime = Math.max(...state.stats.timeSpent, 1);
        state.stats.timeSpent.forEach((time, i) => {
            const heat = document.createElement('div');
            heat.className = 'heatmap-cell';
            const intensity = time / maxTime;
            // Cold to Hot (Blue -> Purple -> Red)
            const color = intensity > 0.7 ? 'rgba(248, 81, 73, 0.3)' : (intensity > 0.3 ? 'rgba(188, 140, 255, 0.2)' : 'rgba(88, 166, 255, 0.1)');
            heat.style.backgroundColor = color;
            
            // Position based on grid
            const r = Math.floor(i / 9), c = i % 9;
            heat.style.top = `${(r / 9) * 100}%`;
            heat.style.left = `${(c / 9) * 100}%`;
            heat.style.width = '11.11%';
            heat.style.height = '11.11%';
            elements.heatmapOverlay.appendChild(heat);
        });
    }

    // --- Ghost Mode (Race Past Replay) ---
    function toggleGhostMode() {
        if (!state.ghostMode.replayData || state.ghostMode.replayData.length === 0) {
            elements.hintText.textContent = "No previous solve recorded for ghost mode.";
            return;
        }
        state.ghostMode.active = !state.ghostMode.active;
        elements.ghostLayer.classList.toggle('hidden', !state.ghostMode.active);
        if (state.ghostMode.active) {
            state.ghostMode.startTime = Date.now();
            runGhostFrame();
        }
    }

    function runGhostFrame() {
        if (!state.ghostMode.active) return;
        const elapsed = Math.floor((Date.now() - state.ghostMode.startTime) / 1000);
        const move = state.ghostMode.replayData.find(m => m.time === elapsed);
        if (move) {
            // Visualize ghost move
            const ghostCell = document.createElement('div');
            ghostCell.className = 'ghost-cell';
            ghostCell.textContent = move.val;
            // Position and animate
            // ... simplified for now
        }
        requestAnimationFrame(runGhostFrame);
    }

    // --- Advanced Mechanics ---
    function provideAdvancedHint() {
        const step = SudokuLogic.findLogicalStep(state.board, state.mastery.unlocked);
        if (step) {
            elements.hintText.innerHTML = `<strong>${step.type}</strong><br>${step.reason}`;
            state.selectedIdx = step.index !== undefined ? step.index : step.highlights[0];
            render();
            addMP(5);
        }
    }

    function switchMode(m) {
        state.mode = m;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-${m}`).classList.add('active');
        elements.livesCount.parentElement.classList.toggle('hidden', m !== 'pressure');
        startNewGame();
    }

    function toggleNoteMode() {
        state.isNoteMode = !state.isNoteMode;
        elements.notesToggle.classList.toggle('active', state.isNoteMode);
    }

    function toggleHeatmap() {
        state.isHeatmapVisible = !state.isHeatmapVisible;
        document.getElementById('heatmap-toggle-btn').classList.toggle('active', state.isHeatmapVisible);
        updateHeatmap();
    }

    function resetTimer() {
        clearInterval(state.timerInterval);
        state.seconds = 0;
        state.timerInterval = setInterval(() => {
            state.seconds++;
            if (state.selectedIdx !== null) state.stats.timeSpent[state.selectedIdx]++;
            const min = Math.floor(state.seconds / 60).toString().padStart(2, '0');
            const sec = (state.seconds % 60).toString().padStart(2, '0');
            elements.timer.textContent = `${min}:${sec}`;
        }, 1000);
    }

    function addMP(amount) {
        state.mastery.mp = Math.max(0, state.mastery.mp + amount);
        localStorage.setItem('sudoku_mp', state.mastery.mp);
        updateMasteryUI();
    }

    function updateMasteryUI() {
        state.mastery.level = Math.floor(state.mastery.mp / 1000) + 1;
        elements.masteryLevel.textContent = state.mastery.level;
        const ranks = ["Novice", "Apprentice", "Analytical Adept", "Logic Lord", "Grandmaster", "Zen Master"];
        elements.masteryRank.textContent = ranks[Math.min(state.mastery.level - 1, ranks.length - 1)];
    }

    function updateMetrics() {
        const errorRate = Math.floor((state.stats.totalErrors / (state.stats.totalMoves || 1)) * 100);
        elements.metricErrorRate.textContent = `${errorRate}%`;
    }

    function checkWin() {
        if (!state.board.includes(0) && state.board.every((v, i) => v === state.solution[i])) {
            clearInterval(state.timerInterval);
            addMP(200);
            elements.hintText.textContent = "Victory! New Mastery record established.";
            // Save for Ghost Mode
            // localStorage.setItem('sudoku_last_solve', JSON.stringify(...history with timestamps));
        }
    }

    function updateStreak() {
        const today = new Date().toDateString();
        if (state.pressure.lastPlayed !== today) {
            if (new Date(state.pressure.lastPlayed).getTime() > Date.now() - 86400000 * 2) {
                state.pressure.streak++;
            } else {
                state.pressure.streak = 1;
            }
            state.pressure.lastPlayed = today;
            localStorage.setItem('sudoku_streak', state.pressure.streak);
            localStorage.setItem('sudoku_last_played', today);
        }
        elements.streakCount.textContent = state.pressure.streak;
    }

    function handleKeyDown(e) {
        if (e.ctrlKey && e.key === 'z') undo();
        if (e.ctrlKey && e.key === 'y') redo();
        if (e.key === 'n' || e.key === 'N') toggleNoteMode();
        if (e.key >= '1' && e.key <= '9') handleInput(parseInt(e.key));
        if (e.key === 'Backspace' || e.key === 'Delete') handleInput(0);
        if (e.key.startsWith('Arrow')) {
            if (state.selectedIdx === null) state.selectedIdx = 0;
            else {
                let r = Math.floor(state.selectedIdx / 9), c = state.selectedIdx % 9;
                if (e.key === 'ArrowUp') r = (r + 8) % 9;
                if (e.key === 'ArrowDown') r = (r + 1) % 9;
                if (e.key === 'ArrowLeft') c = (c + 8) % 9;
                if (e.key === 'ArrowRight') c = (c + 1) % 9;
                state.selectedIdx = r * 9 + c;
            }
            render();
        }
    }

    init();
});
