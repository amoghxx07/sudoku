document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let state = {
        board: [],
        initialBoard: [],
        solution: [],
        notes: Array.from({length: 81}, () => new Set()),
        selectedIdx: null,
        mode: 'focus', // 'focus' or 'pressure'
        mastery: {
            mp: parseInt(localStorage.getItem('sudoku_mp') || 0),
            level: 1,
            unlocked: ['Naked Single', 'Hidden Single']
        },
        pressure: {
            lives: 3,
            streak: 0,
            timer: 0
        },
        analysis: {
            guesses: 0,
            logicMisses: 0,
            totalMoves: 0,
            notesUsed: 0
        },
        timerInterval: null
    };

    // --- DOM Elements ---
    const elements = {
        board: document.getElementById('sudoku-board'),
        timer: document.getElementById('timer'),
        masteryLevel: document.getElementById('mastery-level'),
        masteryRank: document.getElementById('mastery-rank'),
        mpBar: document.getElementById('mp-bar'),
        currentMp: document.getElementById('current-mp'),
        nextLevelMp: document.getElementById('next-level-mp'),
        livesCount: document.getElementById('lives-count'),
        streakCount: document.getElementById('streak-count'),
        statGuesses: document.getElementById('stat-guesses'),
        statLogicMisses: document.getElementById('stat-logic-misses'),
        statNoteOveruse: document.getElementById('stat-note-overuse'),
        hintText: document.querySelector('.hint-text'),
        unlockedTechs: document.getElementById('unlocked-techs'),
        pressureInfo: document.getElementById('pressure-info')
    };

    // --- Initialization ---
    function init() {
        updateMasteryUI();
        setupEventListeners();
        startNewGame();
    }

    function setupEventListeners() {
        document.getElementById('btn-focus').addEventListener('click', () => switchMode('focus'));
        document.getElementById('btn-pressure').addEventListener('click', () => switchMode('pressure'));
        document.getElementById('new-game-btn').addEventListener('click', startNewGame);
        document.getElementById('hint-btn').addEventListener('click', provideAdvancedHint);
        document.getElementById('erase-btn').addEventListener('click', () => handleInput(0));
        
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => handleInput(parseInt(btn.dataset.val)));
        });

        window.addEventListener('keydown', handleKeyDown);
    }

    // --- Game Logic ---
    function startNewGame() {
        const generated = SudokuLogic.generate(state.mastery.level);
        state.board = [...generated.puzzle];
        state.initialBoard = [...generated.puzzle];
        state.solution = [...generated.fullBoard];
        state.notes = Array.from({length: 81}, () => new Set());
        state.pressure.lives = 3;
        state.pressure.timer = 0;
        
        render();
        resetTimer();
        elements.hintText.textContent = "New game started. Focus your mind.";
        
        if (state.mode === 'pressure') {
            elements.livesCount.textContent = state.pressure.lives;
        }
    }

    function handleInput(val) {
        if (state.selectedIdx === null || state.initialBoard[state.selectedIdx] !== 0) return;

        state.analysis.totalMoves++;
        const correctVal = state.solution[state.selectedIdx];

        if (val === 0) {
            state.board[state.selectedIdx] = 0;
        } else if (val === correctVal) {
            // Check if it was a guess or logic
            const logicStep = SudokuLogic.findLogicalStep(state.board, state.mastery.unlocked);
            if (!logicStep || logicStep.index !== state.selectedIdx) {
                state.analysis.guesses++;
            }
            
            state.board[state.selectedIdx] = val;
            state.notes[state.selectedIdx].clear();
            addMP(10);
        } else {
            // Wrong Move
            if (state.mode === 'pressure') {
                state.pressure.lives--;
                elements.livesCount.textContent = state.pressure.lives;
                state.pressure.streak = 0;
                elements.streakCount.textContent = "0";
                if (state.pressure.lives <= 0) gameOver();
            }
            state.analysis.logicMisses++;
            addMP(-5);
        }

        updateAnalysisUI();
        render();
        checkWin();
    }

    function provideAdvancedHint() {
        const step = SudokuLogic.findLogicalStep(state.board, state.mastery.unlocked);
        if (step) {
            state.selectedIdx = step.index !== undefined ? step.index : step.highlights[0];
            elements.hintText.innerHTML = `<strong>${step.type}</strong><br>${step.reason}`;
            render(step.highlights, step.eliminations);
            addMP(2); // Small reward for learning
        } else {
            elements.hintText.textContent = "No simple logical steps found. You may need to use notes or advanced deductions.";
        }
    }

    // --- UI Rendering ---
    function render(specialHighlights = [], eliminations = []) {
        elements.board.innerHTML = '';
        const selectedVal = state.selectedIdx !== null ? state.board[state.selectedIdx] : null;
        
        let sRow = -1, sCol = -1, sBox = -1;
        if (state.selectedIdx !== null) {
            sRow = Math.floor(state.selectedIdx / 9);
            sCol = state.selectedIdx % 9;
            sBox = Math.floor(sRow / 3) * 3 + Math.floor(sCol / 3);
        }

        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const val = state.board[i];
            const row = Math.floor(i / 9);
            const col = i % 9;
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

            if (state.initialBoard[i] !== 0) {
                cell.classList.add('fixed');
                cell.textContent = val;
            } else if (val !== 0) {
                cell.textContent = val;
                if (val !== state.solution[i]) cell.classList.add('error');
            } else {
                const noteGrid = document.createElement('div');
                noteGrid.className = 'note-grid';
                for (let n = 1; n <= 9; n++) {
                    const noteItem = document.createElement('div');
                    noteItem.className = 'note-item';
                    if (state.notes[i].has(n)) noteItem.textContent = n;
                    noteGrid.appendChild(noteItem);
                }
                cell.appendChild(noteGrid);
            }

            // Highlights
            if (state.selectedIdx === i) cell.classList.add('selected');
            else if (selectedVal && selectedVal !== 0 && val === selectedVal) cell.classList.add('highlight');
            else if (row === sRow || col === sCol || box === sBox) cell.classList.add('peer-highlight');

            if (specialHighlights.includes(i)) cell.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
            if (eliminations.includes(i)) cell.style.backgroundColor = 'rgba(244, 63, 94, 0.1)';

            cell.addEventListener('click', () => { state.selectedIdx = i; render(); });
            elements.board.appendChild(cell);
        }
    }

    // --- Systems ---
    function switchMode(mode) {
        state.mode = mode;
        document.body.className = `mode-${mode}`;
        document.getElementById('btn-focus').classList.toggle('active', mode === 'focus');
        document.getElementById('btn-pressure').classList.toggle('active', mode === 'pressure');
        elements.pressureInfo.classList.toggle('hidden', mode === 'focus');
        startNewGame();
    }

    function addMP(amount) {
        state.mastery.mp = Math.max(0, state.mastery.mp + amount);
        localStorage.setItem('sudoku_mp', state.mastery.mp);
        updateMasteryUI();
    }

    function updateMasteryUI() {
        const mp = state.mastery.mp;
        state.mastery.level = Math.floor(mp / 1000) + 1;
        const levelProgress = mp % 1000;
        
        elements.masteryLevel.textContent = state.mastery.level;
        elements.currentMp.textContent = mp;
        elements.nextLevelMp.textContent = state.mastery.level * 1000;
        elements.mpBar.style.width = `${(levelProgress / 1000) * 100}%`;
        
        const ranks = ["Novice", "Apprentice", "Scholar", "Adept", "Master", "Grandmaster", "Zen Master"];
        elements.masteryRank.textContent = ranks[Math.min(state.mastery.level - 1, ranks.length - 1)];

        // Unlock logic
        state.mastery.unlocked = ['Naked Single', 'Hidden Single'];
        if (state.mastery.level >= 2) state.mastery.unlocked.push('Pointing Pairs');
        
        elements.unlockedTechs.innerHTML = state.mastery.unlocked.map(t => `<span class="tech-badge">${t}</span>`).join('');
    }

    function updateAnalysisUI() {
        elements.statGuesses.textContent = state.analysis.guesses;
        elements.statLogicMisses.textContent = state.analysis.logicMisses;
        const noteUsage = Math.min(100, Math.floor((state.analysis.notesUsed / (state.analysis.totalMoves || 1)) * 100));
        elements.statNoteOveruse.textContent = `${noteUsage}%`;
    }

    function resetTimer() {
        clearInterval(state.timerInterval);
        let sec = 0;
        state.timerInterval = setInterval(() => {
            sec++;
            const m = Math.floor(sec / 60).toString().padStart(2, '0');
            const s = (sec % 60).toString().padStart(2, '0');
            elements.timer.textContent = `${m}:${s}`;
        }, 1000);
    }

    function checkWin() {
        if (!state.board.includes(0) && state.board.every((v, i) => v === state.solution[i])) {
            clearInterval(state.timerInterval);
            const bonus = state.mode === 'pressure' ? 200 : 50;
            addMP(bonus);
            if (state.mode === 'pressure') {
                state.pressure.streak++;
                elements.streakCount.textContent = state.pressure.streak;
            }
            elements.hintText.textContent = `Victory! Earned ${bonus} Mastery Points.`;
        }
    }

    function gameOver() {
        clearInterval(state.timerInterval);
        elements.hintText.innerHTML = "<span style='color: #f43f5e'>GAME OVER! You ran out of lives.</span>";
        state.board = state.initialBoard.map(v => v); // Reset
        render();
    }

    function handleKeyDown(e) {
        if (e.key >= '1' && e.key <= '9') handleInput(parseInt(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete') handleInput(0);
        else if (e.key.startsWith('Arrow')) {
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
