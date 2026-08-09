import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const EMOJI_SETS = [
  ['🐘', '🦁', '🐒', '🐢', '🦋', '🐬', '🦉', '🐝'],
  ['⚽', '🏀', '🎾', '🏸', '🏏', '⛳', '🥇', '🎯'],
  ['🍎', '🍌', '🍇', '🥭', '🍊', '🍉', '🍓', '🥕'],
  ['🚗', '🚌', '🚲', '✈️', '🚂', '🚢', '🛵', '🚀'],
  ['🌞', '🌧️', '⛈️', '❄️', '🌈', '☁️', '🌪️', '⭐'],
  ['🐶', '🐱', '🐮', '🐷', '🐔', '🐑', '🐴', '🐰'],
  ['🎸', '🥁', '🎹', '🎺', '🎻', '🪕', '📯', '🎷'],
  ['🍕', '🍔', '🍟', '🌮', '🍩', '🍦', '🍪', '🧁'],
  ['📚', '✏️', '📐', '🎒', '🖍️', '📏', '🧮', '🗂️'],
  ['🌸', '🌻', '🌹', '🌷', '🌼', '🌺', '🍁', '🌿'],
  ['🏔️', '🏖️', '🏜️', '🌋', '🏞️', '🗻', '🏝️', '🌊'],
  ['🐍', '🦅', '🐺', '🦊', '🐿️', '🦔', '🦇', '🦎'],
  ['⭐', '🌙', '☀️', '🪐', '🌍', '🛰️', '🌌', '☄️'],
];

interface Card {
  key: string;
  value: string;
  flipped: boolean;
  matched: boolean;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildDeck = (): Card[] => {
  const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
  const pairValues = shuffle([...set, ...set]);
  return pairValues.map((value, index) => ({
    key: `${value}-${index}`,
    value,
    flipped: false,
    matched: false,
  }));
};

const MemoryMatchScreen: React.FC<any> = ({ navigation }) => {
  const [cards, setCards] = useState<Card[]>(buildDeck());
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  const matchedCount = cards.filter((c) => c.matched).length;
  const won = matchedCount === cards.length;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (won) setRunning(false);
  }, [won]);

  const handleFlip = (index: number) => {
    if (!running) return;
    if (selected.length === 2) return;
    if (cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index] = { ...newCards[index], flipped: true };
    setCards(newCards);

    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newSelected;
      if (newCards[a].value === newCards[b].value) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, matched: true } : c
            )
          );
          setSelected([]);
        }, 400);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, flipped: false } : c
            )
          );
          setSelected([]);
        }, 700);
      }
    }
  };

  const restart = () => {
    setCards(buildDeck());
    setSelected([]);
    setMoves(0);
    setSeconds(0);
    setRunning(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory Match</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>⏱ {formatTime(seconds)}</Text>
          <Text style={styles.statText}>🔁 {moves} moves</Text>
          <Text style={styles.statText}>
            ✅ {matchedCount / 2}/{cards.length / 2}
          </Text>
        </View>
      </View>

      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🎉</Text>
          <Text style={styles.winTitle}>Well Done!</Text>
          <Text style={styles.winText}>
            Completed in {moves} moves and {formatTime(seconds)}
          </Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={restart}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={card.key}
              style={[
                styles.card,
                (card.flipped || card.matched) && styles.cardFlipped,
                card.matched && styles.cardMatched,
              ]}
              activeOpacity={0.8}
              onPress={() => handleFlip(index)}
            >
              <Text style={styles.cardText}>
                {card.flipped || card.matched ? card.value : '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!won && (
        <TouchableOpacity style={styles.restartButton} onPress={restart}>
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default MemoryMatchScreen;

const CARD_SIZE = '22%';

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
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: CARD_SIZE,
    aspectRatio: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardFlipped: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cardMatched: {
    backgroundColor: '#DCFCE7',
    borderColor: COLORS.success,
  },
  cardText: {
    fontSize: 28,
  },
  restartButton: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  restartText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  winBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  winEmoji: {
    fontSize: 60,
  },
  winTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  winText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  playAgainButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
  },
  playAgainText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
