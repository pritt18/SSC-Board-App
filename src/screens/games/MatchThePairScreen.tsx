import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface PairSet {
  title: string;
  pairs: { left: string; right: string }[];
}

const PAIR_SETS: PairSet[] = [
  {
    title: 'Animal Sounds',
    pairs: [
      { left: 'Dog', right: 'Bark' },
      { left: 'Cat', right: 'Meow' },
      { left: 'Cow', right: 'Moo' },
      { left: 'Lion', right: 'Roar' },
      { left: 'Duck', right: 'Quack' },
    ],
  },
  {
    title: 'Capitals',
    pairs: [
      { left: 'India', right: 'New Delhi' },
      { left: 'France', right: 'Paris' },
      { left: 'Japan', right: 'Tokyo' },
      { left: 'Egypt', right: 'Cairo' },
      { left: 'Russia', right: 'Moscow' },
    ],
  },
  {
    title: 'Fruits (Marathi)',
    pairs: [
      { left: 'Mango', right: 'आंबा' },
      { left: 'Banana', right: 'केळे' },
      { left: 'Apple', right: 'सफरचंद' },
      { left: 'Grapes', right: 'द्राक्षे' },
      { left: 'Guava', right: 'पेरू' },
    ],
  },
  {
    title: 'Units of Measurement',
    pairs: [
      { left: 'Length', right: 'Meter' },
      { left: 'Weight', right: 'Kilogram' },
      { left: 'Time', right: 'Second' },
      { left: 'Temperature', right: 'Celsius' },
      { left: 'Volume', right: 'Litre' },
    ],
  },
  {
    title: 'Baby Animals',
    pairs: [
      { left: 'Dog', right: 'Puppy' },
      { left: 'Cat', right: 'Kitten' },
      { left: 'Cow', right: 'Calf' },
      { left: 'Horse', right: 'Foal' },
      { left: 'Sheep', right: 'Lamb' },
    ],
  },
  {
    title: 'Occupations & Tools',
    pairs: [
      { left: 'Doctor', right: 'Stethoscope' },
      { left: 'Farmer', right: 'Plough' },
      { left: 'Carpenter', right: 'Hammer' },
      { left: 'Barber', right: 'Scissors' },
      { left: 'Chef', right: 'Knife' },
    ],
  },
  {
    title: 'Festivals & States',
    pairs: [
      { left: 'Diwali', right: 'India' },
      { left: 'Onam', right: 'Kerala' },
      { left: 'Bihu', right: 'Assam' },
      { left: 'Pongal', right: 'Tamil Nadu' },
      { left: 'Baisakhi', right: 'Punjab' },
    ],
  },
  {
    title: 'Shapes & Sides',
    pairs: [
      { left: 'Triangle', right: '3 sides' },
      { left: 'Square', right: '4 sides' },
      { left: 'Pentagon', right: '5 sides' },
      { left: 'Hexagon', right: '6 sides' },
      { left: 'Octagon', right: '8 sides' },
    ],
  },
  {
    title: 'Planets & Order',
    pairs: [
      { left: 'Mercury', right: '1st from Sun' },
      { left: 'Venus', right: '2nd from Sun' },
      { left: 'Earth', right: '3rd from Sun' },
      { left: 'Mars', right: '4th from Sun' },
      { left: 'Jupiter', right: '5th from Sun' },
    ],
  },
  {
    title: 'Sports & Equipment',
    pairs: [
      { left: 'Cricket', right: 'Bat' },
      { left: 'Football', right: 'Ball' },
      { left: 'Badminton', right: 'Racket' },
      { left: 'Boxing', right: 'Gloves' },
      { left: 'Swimming', right: 'Goggles' },
    ],
  },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildRound = () => {
  const set = PAIR_SETS[Math.floor(Math.random() * PAIR_SETS.length)];
  return {
    title: set.title,
    left: shuffle(set.pairs.map((p) => p.left)),
    right: shuffle(set.pairs.map((p) => p.right)),
    answerMap: Object.fromEntries(set.pairs.map((p) => [p.left, p.right])),
  };
};

const MatchThePairScreen: React.FC<any> = ({ navigation }) => {
  const [round, setRound] = useState(buildRound());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null);
  const [attempts, setAttempts] = useState(0);

  const totalPairs = round.left.length;
  const matchedCount = Object.keys(matched).length;
  const won = matchedCount === totalPairs;

  const handleLeftPress = (left: string) => {
    if (matched[left]) return;
    setSelectedLeft(left);
  };

  const handleRightPress = (right: string) => {
    if (!selectedLeft) return;
    if (Object.values(matched).includes(right)) return;

    setAttempts((a) => a + 1);

    if (round.answerMap[selectedLeft] === right) {
      setMatched((prev) => ({ ...prev, [selectedLeft]: right }));
      setSelectedLeft(null);
    } else {
      setWrongFlash({ left: selectedLeft, right });
      setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
      }, 500);
    }
  };

  const handleNewRound = () => {
    setRound(buildRound());
    setSelectedLeft(null);
    setMatched({});
    setWrongFlash(null);
    setAttempts(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match the Pair</Text>
        <Text style={styles.subtitle}>
          {round.title} • {matchedCount}/{totalPairs} matched • {attempts} attempts
        </Text>
      </View>

      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🎉</Text>
          <Text style={styles.winTitle}>All pairs matched!</Text>
          <Text style={styles.winText}>Done in {attempts} attempts</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleNewRound}>
            <Text style={styles.actionButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.columnsRow}>
            <View style={styles.column}>
              {round.left.map((item) => {
                const isMatched = !!matched[item];
                const isSelected = selectedLeft === item;
                const isWrong = wrongFlash?.left === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.pill,
                      isSelected && styles.pillSelected,
                      isMatched && styles.pillMatched,
                      isWrong && styles.pillWrong,
                    ]}
                    disabled={isMatched}
                    onPress={() => handleLeftPress(item)}
                  >
                    <Text style={styles.pillText}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.column}>
              {round.right.map((item) => {
                const isMatched = Object.values(matched).includes(item);
                const isWrong = wrongFlash?.right === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.pill,
                      isMatched && styles.pillMatched,
                      isWrong && styles.pillWrong,
                    ]}
                    disabled={isMatched}
                    onPress={() => handleRightPress(item)}
                  >
                    <Text style={styles.pillText}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.restartButton} onPress={handleNewRound}>
            <Text style={styles.restartText}>New Round</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

export default MatchThePairScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  pill: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#DBEAFE',
  },
  pillMatched: {
    backgroundColor: '#DCFCE7',
    borderColor: COLORS.success,
  },
  pillWrong: {
    backgroundColor: '#FEE2E2',
    borderColor: COLORS.error,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  restartButton: {
    alignSelf: 'center',
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  restartText: { color: COLORS.textPrimary, fontWeight: '600' },
  winBox: { alignItems: 'center', padding: 40 },
  winEmoji: { fontSize: 60 },
  winTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10 },
  winText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
  actionButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
  },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
