// Prints the legend time of every puzzle of the path (the crown's limit).
import { PUZZLE_COUNT, legendTime, pathPuzzle } from '../src/core/puzzles/puzzles';
console.log(Array.from({ length: PUZZLE_COUNT }, (_, i) => `${i + 1}:${legendTime(pathPuzzle(i))}s`).join(' '));
