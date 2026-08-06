import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface WordClue {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

interface Puzzle {
  title: string;
  size: number;
  words: WordClue[];
}

const PUZZLES: Puzzle[] = [
  {
    title: 'General Knowledge',
    size: 7,
    words: [
      { answer: 'SUN', clue: '1-Across: Star at the center of our solar system', row: 0, col: 0, direction: 'across' },
      { answer: 'MOON', clue: '2-Down: Earth\'s only natural satellite', row: 0, col: 2, direction: 'down' },
      { answer: 'EARTH', clue: '3-Across: The planet we live on', row: 3, col: 0, direction: 'across' },
    ],
  },
  {
    title: 'Basic Science',
    size: 7,
    words: [
      { answer: 'CELL', clue: '1-Across: Basic unit of life', row: 0, col: 0, direction: 'across' },
      { answer: 'LEAF', clue: '2-Down: Green part of a plant', row: 0, col: 3, direction: 'down' },
      { answer: 'WATER', clue: '3-Across: H2O, essential for life', row: 3, col: 0, direction: 'across' },
    ],
  },
];

type Cell = { letter: string; number: number | null; active: boolean };

const buildGrid = (puzzle: Puzzle): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: puzzle.size }, () =>
    Array.from({ length: puzzle.size }, () => ({
      letter: '',
      number: null,
      active: false,
    }))
  );

  let numberCounter = 1;
  const numberedCells = new Map<string, number>();

  puzzle.words.forEach((word) => {
    const key = `${word.row}-${word.col}`;
    if (!numberedCells.has(key)) {
      numberedCells.set(key, numberCounter++);
    }
  });

  puzzle.words.forEach((word) => {
    for (let i = 0; i < word.answer.length; i++) {
      const r = word.direction === 'down' ? word.row + i : word.row;
      const c = word.direction === 'across' ? word.col + i : word.col;
      grid[r][c].active = true;
      if (i === 0) {
        grid[r][c].number = numberedCells.get(`${word.row}-${word.col}`) || null;
      }
    }
  });

  return grid;
};

const CrosswordScreen: React.FC<any> = ({ navigation }) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = PUZZLES[puzzleIndex];
  const grid = useMemo(() => buildGrid(puzzle), [puzzle]);

  const [answers, setAnswers] = useState<string[][]>(
    Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(''))
  );
  const [checked, setChecked] = useState(false);

  const solutionGrid = useMemo(() => {
    const sol: string[][] = Array.from({ length: puzzle.size }, () =>
      Array(puzzle.size).fill('')
    );
    puzzle.words.forEach((word) => {
      for (let i = 0; i < word.answer.length; i++) {
        const r = word.direction === 'down' ? word.row + i : word.row;
        const c = word.direction === 'across' ? word.col + i : word.col;
        sol[r][c] = word.answer[i];
      }
    });
    return sol;
  }, [puzzle]);

  const handleChange = (r: number, c: number, text: string) => {
    const letter = text.toUpperCase().slice(-1).replace(/[^A-Z]/g, '');
    const next = answers.map((row) => [...row]);
    next[r][c] = letter;
    setAnswers(next);
    setChecked(false);
  };

  const handleCheck = () => {
    let allFilled = true;
    let allCorrect = true;
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (!grid[r][c].active) continue;
        if (!answers[r][c]) allFilled = false;
        if (answers[r][c] !== solutionGrid[r][c]) allCorrect = false;
      }
    }
    setChecked(true);
    if (!allFilled) {
      Alert.alert('Not finished', 'Fill in all the boxes first.');
    } else if (allCorrect) {
      Alert.alert('🎉 Correct!', 'You solved the crossword!');
    } else {
      Alert.alert('Almost there', 'Some letters are wrong — check the highlighted boxes.');
    }
  };

  const handleNewPuzzle = () => {
    const nextIndex = (puzzleIndex + 1) % PUZZLES.length;
    setPuzzleIndex(nextIndex);
    setAnswers(
      Array.from({ length: PUZZLES[nextIndex].size }, () =>
        Array(PUZZLES[nextIndex].size).fill('')
      )
    );
    setChecked(false);
  };

  const acrossClues = puzzle.words.filter((w) => w.direction === 'across');
  const downClues = puzzle.words.filter((w) => w.direction === 'down');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Crossword</Text>
          <Text style={styles.subtitle}>{puzzle.title}</Text>
        </View>

        <View style={styles.grid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => {
                const isWrong =
                  checked &&
                  cell.active &&
                  answers[r][c] !== '' &&
                  answers[r][c] !== solutionGrid[r][c];
                return (
                  <View
                    key={c}
                    style={[styles.cell, !cell.active && styles.cellBlocked]}
                  >
                    {cell.active && (
                      <>
                        {cell.number && (
                          <Text style={styles.cellNumber}>{cell.number}</Text>
                        )}
                        <TextInput
                          style={[styles.cellInput, isWrong && styles.cellInputWrong]}
                          maxLength={1}
                          value={answers[r][c]}
                          onChangeText={(text) => handleChange(r, c, text)}
                          autoCapitalize="characters"
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.cluesSection}>
          <Text style={styles.cluesHeading}>Across</Text>
          {acrossClues.map((w) => (
            <Text key={w.clue} style={styles.clueText}>
              {w.clue}
            </Text>
          ))}

          <Text style={[styles.cluesHeading, { marginTop: 14 }]}>Down</Text>
          {downClues.map((w) => (
            <Text key={w.clue} style={styles.clueText}>
              {w.clue}
            </Text>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCheck}>
            <Text style={styles.actionButtonText}>Check Answers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleNewPuzzle}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              New Puzzle
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CrosswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  grid: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 40,
    height: 40,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBlocked: {
    backgroundColor: COLORS.textPrimary,
  },
  cellNumber: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: 8,
    color: COLORS.textSecondary,
  },
  cellInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cellInputWrong: {
    color: COLORS.error,
  },
  cluesSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  cluesHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  clueText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
  },
});
