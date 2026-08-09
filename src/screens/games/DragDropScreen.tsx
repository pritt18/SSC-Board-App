import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface RoundSet {
  title: string;
  zoneA: string;
  zoneB: string;
  items: { label: string; zone: 'A' | 'B' }[];
}

const ROUND_SETS: RoundSet[] = [
  {
    title: 'Sort by Type',
    zoneA: 'Living',
    zoneB: 'Non-Living',
    items: [
      { label: 'Dog', zone: 'A' },
      { label: 'Tree', zone: 'A' },
      { label: 'Chair', zone: 'B' },
      { label: 'Fish', zone: 'A' },
      { label: 'Stone', zone: 'B' },
      { label: 'Book', zone: 'B' },
    ],
  },
  {
    title: 'Sort the Numbers',
    zoneA: 'Even',
    zoneB: 'Odd',
    items: [
      { label: '4', zone: 'A' },
      { label: '7', zone: 'B' },
      { label: '10', zone: 'A' },
      { label: '3', zone: 'B' },
      { label: '18', zone: 'A' },
      { label: '9', zone: 'B' },
    ],
  },
  {
    title: 'Sort by Category',
    zoneA: 'Fruit',
    zoneB: 'Vegetable',
    items: [
      { label: 'Mango', zone: 'A' },
      { label: 'Potato', zone: 'B' },
      { label: 'Apple', zone: 'A' },
      { label: 'Onion', zone: 'B' },
      { label: 'Banana', zone: 'A' },
      { label: 'Carrot', zone: 'B' },
    ],
  },
  {
    title: 'Sort the Animals',
    zoneA: 'Wild',
    zoneB: 'Domestic',
    items: [
      { label: 'Lion', zone: 'A' },
      { label: 'Dog', zone: 'B' },
      { label: 'Tiger', zone: 'A' },
      { label: 'Cow', zone: 'B' },
      { label: 'Wolf', zone: 'A' },
      { label: 'Cat', zone: 'B' },
    ],
  },
  {
    title: 'Sort by State of Matter',
    zoneA: 'Solid',
    zoneB: 'Liquid',
    items: [
      { label: 'Stone', zone: 'A' },
      { label: 'Water', zone: 'B' },
      { label: 'Wood', zone: 'A' },
      { label: 'Milk', zone: 'B' },
      { label: 'Ice', zone: 'A' },
      { label: 'Oil', zone: 'B' },
    ],
  },
  {
    title: 'Sort the Shapes',
    zoneA: '3 Sides',
    zoneB: '4 Sides',
    items: [
      { label: 'Triangle', zone: 'A' },
      { label: 'Square', zone: 'B' },
      { label: 'Scalene', zone: 'A' },
      { label: 'Rectangle', zone: 'B' },
      { label: 'Isosceles', zone: 'A' },
      { label: 'Rhombus', zone: 'B' },
    ],
  },
  {
    title: 'Sort by Body Part Function',
    zoneA: 'Sense Organ',
    zoneB: 'Internal Organ',
    items: [
      { label: 'Eye', zone: 'A' },
      { label: 'Heart', zone: 'B' },
      { label: 'Ear', zone: 'A' },
      { label: 'Liver', zone: 'B' },
      { label: 'Nose', zone: 'A' },
      { label: 'Kidney', zone: 'B' },
    ],
  },
  {
    title: 'Sort by Transport',
    zoneA: 'Land',
    zoneB: 'Water',
    items: [
      { label: 'Car', zone: 'A' },
      { label: 'Boat', zone: 'B' },
      { label: 'Bus', zone: 'A' },
      { label: 'Ship', zone: 'B' },
      { label: 'Train', zone: 'A' },
      { label: 'Submarine', zone: 'B' },
    ],
  },
  {
    title: 'Sort the Seasons',
    zoneA: 'Hot',
    zoneB: 'Cold',
    items: [
      { label: 'Summer', zone: 'A' },
      { label: 'Winter', zone: 'B' },
      { label: 'May', zone: 'A' },
      { label: 'December', zone: 'B' },
      { label: 'April', zone: 'A' },
      { label: 'January', zone: 'B' },
    ],
  },
  {
    title: 'Sort by Food Type',
    zoneA: 'Sweet',
    zoneB: 'Spicy',
    items: [
      { label: 'Ladoo', zone: 'A' },
      { label: 'Chilli', zone: 'B' },
      { label: 'Jalebi', zone: 'A' },
      { label: 'Pepper', zone: 'B' },
      { label: 'Halwa', zone: 'A' },
      { label: 'Pickle', zone: 'B' },
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

interface ZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DraggableItem: React.FC<{
  label: string;
  zone: 'A' | 'B';
  zoneLayouts: React.MutableRefObject<{ A?: ZoneLayout; B?: ZoneLayout }>;
  onPlaced: (label: string, correct: boolean) => void;
}> = ({ label, zone, zoneLayouts, onPlaced }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [placed, setPlaced] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !placed,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt) => {
        pan.flattenOffset();
        const { pageX, pageY } = evt.nativeEvent;

        const inZone = (z?: ZoneLayout) =>
          z &&
          pageX >= z.x &&
          pageX <= z.x + z.width &&
          pageY >= z.y &&
          pageY <= z.y + z.height;

        if (inZone(zoneLayouts.current.A)) {
          const correct = zone === 'A';
          if (correct) {
            setPlaced(true);
            onPlaced(label, true);
          } else {
            flashWrongAndReturn();
          }
        } else if (inZone(zoneLayouts.current.B)) {
          const correct = zone === 'B';
          if (correct) {
            setPlaced(true);
            onPlaced(label, true);
          } else {
            flashWrongAndReturn();
          }
        } else {
          returnToOrigin();
        }
      },
    })
  ).current;

  const flashWrongAndReturn = () => {
    setWrongFlash(true);
    setTimeout(() => setWrongFlash(false), 400);
    returnToOrigin();
  };

  const returnToOrigin = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  if (placed) {
    return (
      <View style={[styles.item, styles.itemPlaced]}>
        <Text style={styles.itemText}>{label} ✓</Text>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.item,
        wrongFlash && styles.itemWrong,
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <Text style={styles.itemText}>{label}</Text>
    </Animated.View>
  );
};

const buildRound = () => {
  const set = ROUND_SETS[Math.floor(Math.random() * ROUND_SETS.length)];
  return { ...set, items: shuffle(set.items) };
};

const DragDropScreen: React.FC<any> = ({ navigation }) => {
  const [round, setRound] = useState(buildRound());
  const [placedCount, setPlacedCount] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const zoneLayouts = useRef<{ A?: ZoneLayout; B?: ZoneLayout }>({});

  const total = round.items.length;
  const won = placedCount === total;

  const handlePlaced = (_label: string, correct: boolean) => {
    if (correct) setPlacedCount((c) => c + 1);
  };

  const handleNewRound = () => {
    setRound(buildRound());
    setPlacedCount(0);
    setRoundKey((k) => k + 1);
    zoneLayouts.current = {};
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Drag & Drop</Text>
        <Text style={styles.subtitle}>
          {round.title} • Drag each item to the right box • {placedCount}/{total}
        </Text>
      </View>

      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🎉</Text>
          <Text style={styles.winTitle}>All items sorted!</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleNewRound}>
            <Text style={styles.actionButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.itemsWrap} key={roundKey}>
            {round.items.map((item) => (
              <DraggableItem
                key={item.label}
                label={item.label}
                zone={item.zone}
                zoneLayouts={zoneLayouts}
                onPlaced={handlePlaced}
              />
            ))}
          </View>

          <View style={styles.zonesRow}>
            <View
              style={[styles.zone, styles.zoneA]}
              onLayout={(e) => {
                e.target.measure((x, y, width, height, pageX, pageY) => {
                  zoneLayouts.current.A = { x: pageX, y: pageY, width, height };
                });
              }}
            >
              <Text style={styles.zoneLabel}>{round.zoneA}</Text>
            </View>
            <View
              style={[styles.zone, styles.zoneB]}
              onLayout={(e) => {
                e.target.measure((x, y, width, height, pageX, pageY) => {
                  zoneLayouts.current.B = { x: pageX, y: pageY, width, height };
                });
              }}
            >
              <Text style={styles.zoneLabel}>{round.zoneB}</Text>
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

export default DragDropScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  item: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 10,
  },
  itemPlaced: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  itemWrong: {
    backgroundColor: COLORS.error,
  },
  itemText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  zonesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  zone: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneA: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  zoneB: {
    borderColor: COLORS.secondary,
    backgroundColor: '#FFFBEB',
  },
  zoneLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
  winTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10, marginBottom: 10 },
  actionButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
  },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
