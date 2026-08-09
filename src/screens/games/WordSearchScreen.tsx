import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const SIZE = 10;

const PUZZLES: { title: string; words: string[] }[] = [
  { title: 'Animals', words: ['LION', 'TIGER', 'ZEBRA', 'GOAT', 'CAMEL'] },
  { title: 'Fruits', words: ['MANGO', 'GRAPE', 'GUAVA', 'APPLE', 'LEMON'] },
  { title: 'Colors', words: ['BLACK', 'GREEN', 'WHITE', 'BROWN', 'PINK'] },
  { title: 'School', words: ['CHALK', 'BOARD', 'PENCIL', 'BOOK', 'DESK'] },
  { title: 'Planets', words: ['EARTH', 'VENUS', 'MARS', 'PLUTO', 'MOON'] },
  { title: 'Birds', words: ['CROW', 'PARROT', 'EAGLE', 'SPARROW', 'PEACOCK'] },
  { title: 'Vegetables', words: ['POTATO', 'ONION', 'CARROT', 'PEAS', 'BRINJAL'] },
  { title: 'Rivers', words: ['GANGA', 'YAMUNA', 'GODAVARI', 'KAVERI', 'NARMADA'] },
  { title: 'Sports', words: ['CRICKET', 'HOCKEY', 'KABADDI', 'CHESS', 'TENNIS'] },
  { title: 'Body Parts', words: ['HEART', 'BRAIN', 'LUNGS', 'LIVER', 'SKIN'] },
  { title: 'Weather', words: ['RAIN', 'CLOUD', 'STORM', 'BREEZE', 'FOG'] },
  { title: 'Insects', words: ['ANT', 'BEE', 'MOTH', 'WASP', 'CRICKET'] },
  { title: 'Musical Instruments', words: ['TABLA', 'FLUTE', 'DRUM', 'VEENA', 'SITAR'] },
  { title: 'Occupations', words: ['DOCTOR', 'FARMER', 'TEACHER', 'NURSE', 'PILOT'] },
  { title: 'Festivals', words: ['DIWALI', 'HOLI', 'EID', 'ONAM', 'LOHRI'] },
];

const DIRECTIONS = [
  { dr: 0, dc: 1 },  // across
  { dr: 1, dc: 0 },  // down
];

const randLetter = () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26));

const buildGrid = (words: string[]) => {
  const grid: string[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill('')
  );
  const placements: { word: string; cells: [number, number][] }[] = [];

  words.forEach((word) => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 60) {
      attempts++;
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const maxRow = dir.dr ? SIZE - word.length : SIZE - 1;
      const maxCol = dir.dc ? SIZE - word.length : SIZE - 1;
      const row = Math.floor(Math.random() * (maxRow + 1));
      const col = Math.floor(Math.random() * (maxCol + 1));

      let fits = true;
      const cells: [number, number][] = [];
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dr * i;
        const c = col + dir.dc * i;
        const existing = grid[r][c];
        if (existing && existing !== word[i]) {
          fits = false;
          break;
        }
        cells.push([r, c]);
      }
      if (fits) {
        cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
        placements.push({ word, cells });
        placed = true;
      }
    }
  });

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = randLetter();
    }
  }

  return { grid, placements };
};

const cellKey = (r: number, c: number) => `${r}-${c}`;

const WordSearchScreen: React.FC<any> = ({ navigation }) => {
  const [puzzleIndex, setPuzzleIndex] = useState(() =>
    Math.floor(Math.random() * PUZZLES.length)
  );
  const { grid, placements } = useMemo(
    () => buildGrid(PUZZLES[puzzleIndex].words),
    [puzzleIndex]
  );

  const [selection, setSelection] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());

  const won = foundWords.size === PUZZLES[puzzleIndex].words.length;

  const handleCellPress = (r: number, c: number) => {
    if (selection.length === 0) {
      setSelection([[r, c]]);
      return;
    }
    const [startR, startC] = selection[0];
    const cells: [number, number][] = [];

    if (startR === r) {
      const step = c > startC ? 1 : -1;
      for (let cc = startC; cc !== c + step; cc += step) cells.push([r, cc]);
    } else if (startC === c) {
      const step = r > startR ? 1 : -1;
      for (let rr = startR; rr !== r + step; rr += step) cells.push([rr, c]);
    } else {
      setSelection([[r, c]]);
      return;
    }

    const word = cells.map(([rr, cc]) => grid[rr][cc]).join('');
    const reversed = word.split('').reverse().join('');

    const match = placements.find(
      (p) => p.word === word || p.word === reversed
    );

    if (match && !foundWords.has(match.word)) {
      setFoundWords((prev) => new Set(prev).add(match.word));
      setFoundCells((prev) => {
        const next = new Set(prev);
        match.cells.forEach(([rr, cc]) => next.add(cellKey(rr, cc)));
        return next;
      });
    }
    setSelection([]);
  };

  const isSelected = (r: number, c: number) =>
    selection.some(([sr, sc]) => sr === r && sc === c);

  const handleNewPuzzle = () => {
    let next = puzzleIndex;
    if (PUZZLES.length > 1) {
      while (next === puzzleIndex) {
        next = Math.floor(Math.random() * PUZZLES.length);
      }
    }
    setPuzzleIndex(next);
    setSelection([]);
    setFoundWords(new Set());
    setFoundCells(new Set());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Word Search</Text>
          <Text style={styles.subtitle}>
            {PUZZLES[puzzleIndex].title} • Tap start letter, then end letter
          </Text>
        </View>

        <View style={styles.grid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((letter, c) => {
                const key = cellKey(r, c);
                const found = foundCells.has(key);
                const selected = isSelected(r, c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.cell,
                      found && styles.cellFound,
                      selected && styles.cellSelected,
                    ]}
                    onPress={() => handleCellPress(r, c)}
                  >
                    <Text
                      style={[styles.cellText, found && styles.cellTextFound]}
                    >
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.wordList}>
          {PUZZLES[puzzleIndex].words.map((word) => (
            <Text
              key={word}
              style={[
                styles.wordChip,
                foundWords.has(word) && styles.wordChipFound,
              ]}
            >
              {word}
            </Text>
          ))}
        </View>

        {won && (
          <View style={styles.winBox}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>All words found!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleNewPuzzle}>
          <Text style={styles.actionButtonText}>New Puzzle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WordSearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  grid: { alignSelf: 'center' },
  row: { flexDirection: 'row' },
  cell: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cellSelected: { backgroundColor: '#DBEAFE' },
  cellFound: { backgroundColor: '#DCFCE7' },
  cellText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  cellTextFound: { color: COLORS.success },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  wordChip: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  wordChipFound: {
    color: COLORS.success,
    backgroundColor: '#DCFCE7',
    borderColor: COLORS.success,
    textDecorationLine: 'line-through',
  },
  winBox: { alignItems: 'center', marginTop: 20 },
  winEmoji: { fontSize: 44 },
  winTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  actionButton: {
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  actionButtonText: { color: COLORS.white, fontWeight: '700' },
});
