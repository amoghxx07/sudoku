/**
 * Sudoku Logic Engine
 * Includes human-like solver strategies and logical puzzle generation.
 */

const SudokuLogic = (() => {
    const SIZE = 9;
    const BOX_SIZE = 3;

    // Helper to get row, col, box indices
    const getRow = (i) => Math.floor(i / SIZE);
    const getCol = (i) => i % SIZE;
    const getBox = (i) => Math.floor(getRow(i) / BOX_SIZE) * BOX_SIZE + Math.floor(getCol(i) / BOX_SIZE);

    const getIndicesInRow = (r) => Array.from({length: SIZE}, (_, i) => r * SIZE + i);
    const getIndicesInCol = (c) => Array.from({length: SIZE}, (_, i) => i * SIZE + c);
    const getIndicesInBox = (b) => {
        const indices = [];
        const startRow = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const startCol = (b % BOX_SIZE) * BOX_SIZE;
        for (let r = 0; r < BOX_SIZE; r++) {
            for (let c = 0; c < BOX_SIZE; c++) {
                indices.push((startRow + r) * SIZE + (startCol + c));
            }
        }
        return indices;
    };

    /**
     * Human-like Solver
     * Returns a step-by-step logical solution or null if stuck.
     */
    function solveLogically(board) {
        let currentBoard = [...board];
        const steps = [];
        let changed = true;

        while (changed) {
            changed = false;
            const candidates = calculateCandidates(currentBoard);

            // 1. Naked Single
            for (let i = 0; i < 81; i++) {
                if (currentBoard[i] === 0 && candidates[i].size === 1) {
                    const val = Array.from(candidates[i])[0];
                    currentBoard[i] = val;
                    steps.push({ type: 'Naked Single', index: i, value: val, reason: `Only possible number for this cell.` });
                    changed = true;
                    break; 
                }
            }
            if (changed) continue;

            // 2. Hidden Single
            for (let val = 1; val <= 9; val++) {
                for (let houseType of ['row', 'col', 'box']) {
                    for (let houseIdx = 0; houseIdx < 9; houseIdx++) {
                        const indices = houseType === 'row' ? getIndicesInRow(houseIdx) :
                                        houseType === 'col' ? getIndicesInCol(houseIdx) : getIndicesInBox(houseIdx);
                        
                        const possibleIndices = indices.filter(i => currentBoard[i] === 0 && candidates[i].has(val));
                        if (possibleIndices.length === 1) {
                            const idx = possibleIndices[0];
                            currentBoard[idx] = val;
                            steps.push({ type: 'Hidden Single', index: idx, value: val, reason: `${val} can only go here in this ${houseType}.` });
                            changed = true;
                            break;
                        }
                    }
                    if (changed) break;
                }
                if (changed) break;
            }
        }

        return { 
            solved: currentBoard.every(v => v !== 0), 
            board: currentBoard, 
            steps 
        };
    }

    function calculateCandidates(board) {
        const candidates = Array.from({length: 81}, () => new Set([1,2,3,4,5,6,7,8,9]));
        for (let i = 0; i < 81; i++) {
            if (board[i] !== 0) {
                candidates[i] = new Set();
                continue;
            }
            const r = getRow(i), c = getCol(i), b = getBox(i);
            const peers = new Set([...getIndicesInRow(r), ...getIndicesInCol(c), ...getIndicesInBox(b)]);
            for (let peerIdx of peers) {
                if (board[peerIdx] !== 0) {
                    candidates[i].delete(board[peerIdx]);
                }
            }
        }
        return candidates;
    }

    /**
     * Logical Generator
     * Generates a puzzle that is guaranteed to be solvable via the logical solver.
     */
    function generate(difficulty = 'medium') {
        // 1. Generate full valid board using backtracking
        let fullBoard = Array(81).fill(0);
        backtrackSolve(fullBoard);

        // 2. Remove cells while ensuring logical solvability
        let puzzle = [...fullBoard];
        let indices = Array.from({length: 81}, (_, i) => i).sort(() => Math.random() - 0.5);
        
        const targetEmpty = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 52;
        let emptyCount = 0;

        for (let idx of indices) {
            const temp = puzzle[idx];
            puzzle[idx] = 0;
            
            // Check if still logically solvable
            const result = solveLogically(puzzle);
            if (result.solved) {
                emptyCount++;
            } else {
                puzzle[idx] = temp; // Put it back
            }

            if (emptyCount >= targetEmpty) break;
        }

        return { puzzle, fullBoard };
    }

    // Standard backtracking for internal use
    function backtrackSolve(b) {
        for (let i = 0; i < 81; i++) {
            if (b[i] === 0) {
                const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (isValid(b, i, num)) {
                        b[i] = num;
                        if (backtrackSolve(b)) return true;
                        b[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    function isValid(b, idx, num) {
        const r = getRow(idx), c = getCol(idx), box = getBox(idx);
        for (let i = 0; i < 9; i++) {
            if (b[r * 9 + i] === num) return false;
            if (b[i * 9 + c] === num) return false;
        }
        const startRow = Math.floor(box / 3) * 3;
        const startCol = (box % 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (b[(startRow + i) * 9 + (startCol + j)] === num) return false;
            }
        }
        return true;
    }

    return { generate, solveLogically, calculateCandidates };
})();
