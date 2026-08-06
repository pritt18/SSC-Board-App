import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// A small pool of easy 9x9 puzzles. 0 = blank cell.
const PUZZLES: { puzzle: number[][]; solution: number[][] }[] = [
  {
    puzzle: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
];

const clonePuzzle = (grid: number[][]) => grid.map((row) => [...row]);

const SudokuScreen: React.FC<any> = ({ navigation }) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [board, setBoard] = useState<number[][]>(
    clonePuzzle(PUZZLES[0].puzzle)
  );
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null
  );
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());

  const original = PUZZLES[puzzleIndex].puzzle;
  const solution = PUZZLES[puzzleIndex].solution;

  const isFixed = (r: number, c: number) => original[r][c] !== 0;

  const handleSelect = (r: number, c: number) => {
    if (isFixed(r, c)) return;
    setSelected({ r, c });
  };

  const handleNumberPress = (num: number) => {
    if (!selected) return;
    const { r, c } = selected;
    const newBoard = clonePuzzle(board);
    newBoard[r][c] = num;
    setBoard(newBoard);
    const key = `${r}-${c}`;
    const nextWrong = new Set(wrongCells);
    nextWrong.delete(key);
    setWrongCells(nextWrong);
  };

  const handleClear = () => {
    if (!selected) return;
    handleNumberPress(0);
  };

  const handleCheck = () => {
    const wrong = new Set<string>();
    let complete = true;
    let allCorrect = true;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          complete = false;
          continue;
        }
        if (board[r][c] !== solution[r][c]) {
          wrong.add(`${r}-${c}`);
          allCorrect = false;
        }
      }
    }
    setWrongCells(wrong);

    if (!complete) {
      Alert.alert('Not finished yet', 'Fill in all the cells first.');
    } else if (allCorrect) {
      Alert.alert('🎉 Correct!', 'You solved the Sudoku puzzle!');
    } else {
      Alert.alert('Almost there', `${wrong.size} cell(s) are incorrect — they're highlighted in red.`);
    }
  };

  const handleNewPuzzle = () => {
    const nextIndex = (puzzleIndex + 1) % PUZZLES.length;
    setPuzzleIndex(nextIndex);
    setBoard(clonePuzzle(PUZZLES[nextIndex].puzzle));
    setSelected(null);
    setWrongCells(new Set());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sudoku</Text>
        <Text style={styles.subtitle}>Fill every row, column and 3×3 box with 1-9</Text>
      </View>

      <View style={styles.board}>
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((value, c) => {
              const fixed = isFixed(r, c);
              const isSelected = selected?.r === r && selected?.c === c;
              const isWrong = wrongCells.has(`${r}-${c}`);
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    c % 3 === 0 && styles.thickLeft,
                    r % 3 === 0 && styles.thickTop,
                    c === 8 && styles.thickRight,
                    r === 8 && styles.thickBottom,
                    fixed && styles.cellFixed,
                    isSelected && styles.cellSelected,
                    isWrong && styles.cellWrong,
                  ]}
                  onPress={() => handleSelect(r, c)}
                  disabled={fixed}
                >
                  <Text
                    style={[
                      styles.cellText,
                      fixed && styles.cellTextFixed,
                      isWrong && styles.cellTextWrong,
                    ]}
                  >
                    {value !== 0 ? value : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.numberPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            style={styles.numberButton}
            onPress={() => handleNumberPress(n)}
          >
            <Text style={styles.numberText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.numberButton} onPress={handleClear}>
          <Text style={styles.numberText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCheck}>
          <Text style={styles.actionButtonText}>Check</Text>
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
    </SafeAreaView>
  );
};

export default SudokuScreen;

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
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  board: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    backgroundColor: COLORS.white,
  },
  cellFixed: {
    backgroundColor: '#F1F5F9',
  },
  cellSelected: {
    backgroundColor: '#DBEAFE',
  },
  cellWrong: {
    backgroundColor: '#FEE2E2',
  },
  thickLeft: { borderLeftWidth: 2, borderLeftColor: COLORS.textPrimary },
  thickTop: { borderTopWidth: 2, borderTopColor: COLORS.textPrimary },
  thickRight: { borderRightWidth: 2, borderRightColor: COLORS.textPrimary },
  thickBottom: { borderBottomWidth: 2, borderBottomColor: COLORS.textPrimary },
  cellText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cellTextFixed: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  cellTextWrong: {
    color: COLORS.error,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
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
