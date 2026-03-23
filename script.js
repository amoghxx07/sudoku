document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const newGameBtn = document.getElementById('new-game');
    const checkSolutionBtn = document.getElementById('check-solution');
    const solveGameBtn = document.getElementById('solve-game');
    const clearBoardBtn = document.getElementById('clear-board');
    const messageElement = document.getElementById('message');

    let board = [];
    let initialBoard = [];

    // Initialize the board
    function init() {
        createBoard();
        newGame();
    }

    // Create the board in HTML
    function createBoard() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.dataset.index = i;
            
            // Allow only numbers 1-9
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (!/^[1-9]$/.test(val)) {
                    e.target.value = '';
                }
            });

            cell.appendChild(input);
            boardElement.appendChild(cell);
        }
    }

    // New Game logic
    function newGame() {
        // Clear board first
        board = Array(81).fill(0);
        
        // Generate a full valid board
        solve(board);
        
        // Remove some numbers to create a puzzle (difficulty)
        const puzzle = [...board];
        const cellsToRemove = 40; // Moderate difficulty
        let removed = 0;
        while (removed < cellsToRemove) {
            const idx = Math.floor(Math.random() * 81);
            if (puzzle[idx] !== 0) {
                puzzle[idx] = 0;
                removed++;
            }
        }
        
        initialBoard = [...puzzle];
        renderBoard(puzzle);
        messageElement.textContent = '';
    }

    function renderBoard(puzzle) {
        const inputs = boardElement.querySelectorAll('input');
        inputs.forEach((input, i) => {
            const val = puzzle[i];
            input.value = val === 0 ? '' : val;
            input.disabled = val !== 0;
            const cell = input.parentElement;
            if (val !== 0) {
                cell.classList.add('fixed');
            } else {
                cell.classList.remove('fixed');
            }
        });
    }

    // Check Solution
    function checkSolution() {
        const currentBoard = getCurrentBoard();
        
        // Check if full
        if (currentBoard.includes(0)) {
            messageElement.textContent = 'Board is not full!';
            messageElement.className = 'message invalid';
            return;
        }

        if (isValidSudoku(currentBoard)) {
            messageElement.textContent = 'Congratulations! Correct Solution!';
            messageElement.className = 'message success';
        } else {
            messageElement.textContent = 'Sorry, there is an error in the board.';
            messageElement.className = 'message invalid';
        }
    }

    function getCurrentBoard() {
        const inputs = boardElement.querySelectorAll('input');
        return Array.from(inputs).map(input => parseInt(input.value) || 0);
    }

    // Sudoku Solver (Backtracking)
    function solve(b) {
        for (let i = 0; i < 81; i++) {
            if (b[i] === 0) {
                const row = Math.floor(i / 9);
                const col = i % 9;
                
                // Shuffle numbers to get different boards each time
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                
                for (let num of nums) {
                    if (isValidPlacement(b, row, col, num)) {
                        b[i] = num;
                        if (solve(b)) return true;
                        b[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    function isValidPlacement(b, row, col, num) {
        // Row check
        for (let i = 0; i < 9; i++) {
            if (b[row * 9 + i] === num) return false;
        }
        // Col check
        for (let i = 0; i < 9; i++) {
            if (b[i * 9 + col] === num) return false;
        }
        // Box check
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (b[(startRow + r) * 9 + (startCol + c)] === num) return false;
            }
        }
        return true;
    }

    function isValidSudoku(b) {
        // Validate each row, col, box
        for (let i = 0; i < 9; i++) {
            if (!isValidSet(getRow(b, i))) return false;
            if (!isValidSet(getCol(b, i))) return false;
            if (!isValidSet(getBox(b, i))) return false;
        }
        return true;
    }

    function isValidSet(arr) {
        const seen = new Set();
        for (let num of arr) {
            if (num === 0) return false;
            if (seen.has(num)) return false;
            seen.add(num);
        }
        return true;
    }

    function getRow(b, r) { return b.slice(r * 9, r * 9 + 9); }
    function getCol(b, c) {
        const col = [];
        for (let i = 0; i < 9; i++) col.push(b[i * 9 + c]);
        return col;
    }
    function getBox(b, i) {
        const box = [];
        const startRow = Math.floor(i / 3) * 3;
        const startCol = (i % 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                box.push(b[(startRow + r) * 9 + (startCol + c)]);
            }
        }
        return box;
    }

    function solveBoard() {
        const b = getCurrentBoard();
        if (solve(b)) {
            renderBoard(b);
            messageElement.textContent = 'Solved!';
            messageElement.className = 'message success';
        } else {
            messageElement.textContent = 'No solution found!';
            messageElement.className = 'message invalid';
        }
    }

    function clearBoard() {
        renderBoard(initialBoard);
        messageElement.textContent = '';
    }

    newGameBtn.addEventListener('click', newGame);
    checkSolutionBtn.addEventListener('click', checkSolution);
    solveGameBtn.addEventListener('click', solveBoard);
    clearBoardBtn.addEventListener('click', clearBoard);

    init();
});
