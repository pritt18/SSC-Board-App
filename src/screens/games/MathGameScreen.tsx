import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface Question {
  text: string;
  options: number[];
  answer: number;
}

const TOTAL_QUESTIONS = 5;

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const buildOptions = (answer: number): number[] => {
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = randInt(-5, 5);
    const wrong = answer + offset;
    if (wrong !== answer && wrong >= 0) options.add(wrong);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
};

interface MathMode {
  title: string;
  generate: () => Question;
}

const MATH_MODES: MathMode[] = [
  {
    title: 'Addition',
    generate: () => {
      const a = randInt(1, 50);
      const b = randInt(1, 50);
      const answer = a + b;
      return { text: `${a} + ${b} = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Subtraction',
    generate: () => {
      let a = randInt(1, 50);
      let b = randInt(1, 50);
      if (b > a) [a, b] = [b, a];
      const answer = a - b;
      return { text: `${a} - ${b} = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Multiplication',
    generate: () => {
      const a = randInt(1, 12);
      const b = randInt(1, 12);
      const answer = a * b;
      return { text: `${a} × ${b} = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Division',
    generate: () => {
      const b = randInt(1, 10);
      const answer = randInt(1, 10);
      const a = b * answer;
      return { text: `${a} ÷ ${b} = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Mixed Operations',
    generate: () => {
      const ops = ['+', '-', '×'];
      const op = ops[randInt(0, 2)];
      let a = randInt(1, 20);
      let b = randInt(1, 20);
      if (op === '-' && b > a) [a, b] = [b, a];
      if (op === '×') {
        a = randInt(1, 10);
        b = randInt(1, 10);
      }
      const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
      return { text: `${a} ${op} ${b} = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Squares',
    generate: () => {
      const a = randInt(2, 15);
      const answer = a * a;
      return { text: `${a}² = ?`, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Doubles & Halves',
    generate: () => {
      const isDouble = Math.random() > 0.5;
      const a = randInt(2, 40);
      if (isDouble) {
        return { text: `Double of ${a} = ?`, options: buildOptions(a * 2), answer: a * 2 };
      }
      const even = a % 2 === 0 ? a : a + 1;
      return { text: `Half of ${even} = ?`, options: buildOptions(even / 2), answer: even / 2 };
    },
  },
  {
    title: 'Word Problems',
    generate: () => {
      const items = ['apples', 'pencils', 'toys', 'books', 'marbles'];
      const item = items[randInt(0, items.length - 1)];
      const a = randInt(5, 30);
      const b = randInt(1, 15);
      const isAdd = Math.random() > 0.5;
      const answer = isAdd ? a + b : Math.max(a, b) - Math.min(a, b);
      const text = isAdd
        ? `You have ${a} ${item}. A friend gives you ${b} more. Total = ?`
        : `You have ${Math.max(a, b)} ${item}. You give away ${Math.min(a, b)}. Left = ?`;
      return { text, options: buildOptions(answer), answer };
    },
  },
  {
    title: 'Money Problems',
    generate: () => {
      const price = randInt(5, 90);
      const paid = price + randInt(5, 50);
      const answer = paid - price;
      return {
        text: `An item costs ₹${price}. You pay ₹${paid}. Change = ?`,
        options: buildOptions(answer),
        answer,
      };
    },
  },
  {
    title: 'Time Problems',
    generate: () => {
      const start = randInt(1, 10);
      const add = randInt(1, 6);
      const answer = (start + add) > 12 ? (start + add - 12) : (start + add);
      return {
        text: `If it is ${start} o'clock, what time will it be in ${add} hours?`,
        options: buildOptions(answer),
        answer,
      };
    },
  },
];

const generateSet = (): { title: string; questions: Question[] } => {
  const mode = MATH_MODES[Math.floor(Math.random() * MATH_MODES.length)];
  return {
    title: mode.title,
    questions: Array.from({ length: TOTAL_QUESTIONS }, mode.generate),
  };
};

const MathGameScreen: React.FC<any> = ({ navigation }) => {
  const [round, setRound] = useState(generateSet());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const current = round.questions[index];
  const finished = index >= TOTAL_QUESTIONS;

  const handleSelect = (option: number) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === current.answer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setAnswered(false);
    setIndex((i) => i + 1);
  };

  const handleRestart = () => {
    setRound(generateSet());
    setIndex(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Math Game</Text>
        {!finished && (
          <Text style={styles.progress}>
            {round.title} • Question {index + 1} of {TOTAL_QUESTIONS} • Score: {score}
          </Text>
        )}
      </View>

      {finished ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🏆</Text>
          <Text style={styles.winTitle}>
            You scored {score}/{TOTAL_QUESTIONS}
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleRestart}>
            <Text style={styles.actionButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{current.text}</Text>
          </View>

          <View style={styles.optionsGrid}>
            {current.options.map((option) => {
              const isCorrect = option === current.answer;
              const isPicked = option === selected;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    answered && isCorrect && styles.optionCorrect,
                    answered && isPicked && !isCorrect && styles.optionWrong,
                  ]}
                  onPress={() => handleSelect(option)}
                  disabled={answered}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {answered && (
            <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
              <Text style={styles.actionButtonText}>
                {index === TOTAL_QUESTIONS - 1 ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default MathGameScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  progress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  content: { padding: 20 },
  questionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  questionText: { fontSize: 30, fontWeight: '800', color: COLORS.white },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  optionCorrect: { backgroundColor: '#DCFCE7', borderColor: COLORS.success },
  optionWrong: { backgroundColor: '#FEE2E2', borderColor: COLORS.error },
  optionText: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  actionButton: {
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
  },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  winBox: { alignItems: 'center', padding: 40 },
  winEmoji: { fontSize: 60 },
  winTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10, marginBottom: 10 },
});
