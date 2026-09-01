export const BINGO_SQUARES: string[] = [
  "100km week", "Retire a pair of shoes", "Run a marathon", "2000m elevation", "Recovery time >100hrs",
  "Run Blue Mountains", "Rope in a friend (min 10km)", "Run up Mount Coot-tha", "Run Royal National Park", "50,000 step count",
  "90g carb/hr x3, no shit pant", "Run Glasshouse Mountains", "FREE SPOT", "Get lost on a trail", "Consume eggs bene mid run",
  "3x cafe crawl", "Work day (8hrs elapsed)", "Shit in the woods", "Snake sighting", "50km weekend",
  "Trickle in pants", "Lose a toe nail", "3200m elevation (race sim)", "Stack it bad", "Run all 7 days in a week",
];

export const FREE_INDEX = 12;

// 5 rows, 5 columns, 2 diagonals — each a list of cell indices.
export const BINGO_LINES: number[][] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export function countCompletedLines(ticks: boolean[]): number {
  return BINGO_LINES.filter((line) => line.every((i) => ticks[i])).length;
}

export function defaultTicks(): boolean[] {
  const t = Array(25).fill(false);
  t[FREE_INDEX] = true;
  return t;
}
