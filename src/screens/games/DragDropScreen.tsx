// src/screens/games/DragDropScreen.tsx

import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface RoundSet {
  title: string;
  zoneA: string;
  zoneB: string;
  items: {
    label: string;
    zone: 'A' | 'B';
  }[];
}

/*
 * All existing game rounds are kept.
 */
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

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

const buildRound = (): RoundSet => {
  const randomIndex = Math.floor(
    Math.random() * ROUND_SETS.length
  );

  const selectedRound = ROUND_SETS[randomIndex];

  return {
    ...selectedRound,
    items: shuffle(selectedRound.items),
  };
};

interface ZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* -------------------------------------------------------
   Draggable Item
------------------------------------------------------- */

const DraggableItem: React.FC<{
  label: string;
  zone: 'A' | 'B';
  zoneLayouts: React.MutableRefObject<{
    A?: ZoneLayout;
    B?: ZoneLayout;
  }>;
  onPlaced: (label: string, correct: boolean) => void;
}> = ({
  label,
  zone,
  zoneLayouts,
  onPlaced,
}) => {
  const pan = useRef(
    new Animated.ValueXY({ x: 0, y: 0 })
  ).current;

  const [placed, setPlaced] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [dragging, setDragging] = useState(false);

  const returnToOrigin = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const flashWrongAndReturn = () => {
    setWrongFlash(true);

    setTimeout(() => {
      setWrongFlash(false);
    }, 400);

    returnToOrigin();
  };

  const panResponder = useRef(
    PanResponder.create({
      /*
       * IMPORTANT FOR MOBILE + WEB
       */
      onStartShouldSetPanResponderCapture: () => !placed,

      onMoveShouldSetPanResponderCapture: () => !placed,

      onStartShouldSetPanResponder: () => !placed,

      onMoveShouldSetPanResponder: () => !placed,

      onPanResponderGrant: () => {
        if (placed) return;

        setDragging(true);

        pan.stopAnimation();

        pan.setValue({
          x: 0,
          y: 0,
        });
      },

      onPanResponderMove: (_event, gestureState) => {
        if (placed) return;

        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },

      onPanResponderRelease: (event, gestureState) => {
        if (placed) return;

        setDragging(false);

        /*
         * Use gestureState first.
         *
         * moveX / moveY works better across
         * React Native Web and native.
         *
         * nativeEvent pageX/pageY is used as fallback.
         */
        const nativeEvent = event.nativeEvent as any;

        const releaseX =
          typeof gestureState.moveX === 'number'
            ? gestureState.moveX
            : nativeEvent.pageX;

        const releaseY =
          typeof gestureState.moveY === 'number'
            ? gestureState.moveY
            : nativeEvent.pageY;

        console.log(
          'DROP:',
          label,
          'x:',
          releaseX,
          'y:',
          releaseY,
          'A:',
          zoneLayouts.current.A,
          'B:',
          zoneLayouts.current.B
        );

        /*
         * Check whether the released pointer/finger
         * is inside a zone.
         */
        const isInside = (
          pointX: number,
          pointY: number,
          layout?: ZoneLayout
        ) => {
          if (!layout) return false;

          return (
            pointX >= layout.x &&
            pointX <= layout.x + layout.width &&
            pointY >= layout.y &&
            pointY <= layout.y + layout.height
          );
        };

        const droppedInA = isInside(
          releaseX,
          releaseY,
          zoneLayouts.current.A
        );

        const droppedInB = isInside(
          releaseX,
          releaseY,
          zoneLayouts.current.B
        );

        /*
         * Nothing found.
         */
        if (!droppedInA && !droppedInB) {
          console.log('DROP: outside both zones');

          returnToOrigin();
          return;
        }

        /*
         * Determine destination.
         */
        const droppedZone: 'A' | 'B' =
          droppedInA ? 'A' : 'B';

        console.log(
          'DROP ZONE:',
          droppedZone,
          'CORRECT:',
          zone === droppedZone
        );

        /*
         * CORRECT
         */
        if (droppedZone === zone) {
          pan.stopAnimation();

          pan.setValue({
            x: 0,
            y: 0,
          });

          setPlaced(true);

          onPlaced(label, true);

          return;
        }

        /*
         * WRONG
         */
        flashWrongAndReturn();
      },

      onPanResponderTerminate: () => {
        setDragging(false);
        returnToOrigin();
      },
    })
  ).current;

  /*
   * Correctly placed item.
   */
  if (placed) {
    return (
      <View
        style={[
          styles.item,
          styles.itemPlaced,
        ]}
      >
        <Text
          style={[
            styles.itemText,
            styles.itemPlacedText,
          ]}
        >
          {label} ✓
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.item,

        wrongFlash && styles.itemWrong,

        dragging && styles.itemDragging,

        {
          transform: pan.getTranslateTransform(),
        },

        /*
         * React Native Web specific.
         */
        Platform.OS === 'web'
          ? ({
              touchAction: 'none',
              userSelect: 'none',
              cursor: dragging
                ? 'grabbing'
                : 'grab',
            } as any)
          : {},
      ]}
    >
      <Text style={styles.itemText}>
        {label}
      </Text>
    </Animated.View>
  );
};
/* -------------------------------------------------------
   Main Screen
------------------------------------------------------- */

const DragDropScreen: React.FC<any> = ({
  navigation,
}) => {
  const [round, setRound] = useState<RoundSet>(
    buildRound()
  );

  const [placedCount, setPlacedCount] =
    useState(0);

  const [roundKey, setRoundKey] =
    useState(0);

  /*
   * Zone screen coordinates.
   */
  const zoneLayouts = useRef<{
    A?: ZoneLayout;
    B?: ZoneLayout;
  }>({});

  const total = round.items.length;

  const won =
    placedCount >= total && total > 0;

  /* -------------------------------------------------------
     Correct item placed
  ------------------------------------------------------- */

  const handlePlaced = (
    _label: string,
    correct: boolean
  ) => {
    if (!correct) {
      return;
    }

    setPlacedCount((current) => {
      const next = current + 1;

      return Math.min(next, total);
    });
  };

  /* -------------------------------------------------------
     New Round
  ------------------------------------------------------- */

  const handleNewRound = () => {
    setRound(buildRound());

    setPlacedCount(0);

    setRoundKey((current) => current + 1);

    /*
     * Clear old coordinates.
     * New zone coordinates will be measured
     * after the new layout renders.
     */
    zoneLayouts.current = {};
  };

  /* -------------------------------------------------------
     Measure zone
  ------------------------------------------------------- */

  const measureZone = (
    zone: 'A' | 'B',
    target: any
  ) => {
    if (!target) {
      return;
    }

    /*
     * measureInWindow gives coordinates in the
     * same screen/window coordinate system used
     * by gestureState.moveX / moveY.
     *
     * This fixes the old measure() coordinate
     * mismatch on Web.
     */
    target.measureInWindow(
      (
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        zoneLayouts.current[zone] = {
          x,
          y,
          width,
          height,
        };
      }
    );
  };

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Drag & Drop
        </Text>

        <Text style={styles.subtitle}>
          {round.title} • Drag each item to the
          right box • {placedCount}/{total}
        </Text>
      </View>

      {/* Game */}

      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>
            🎉
          </Text>

          <Text style={styles.winTitle}>
            All items sorted!
          </Text>

          <Text style={styles.winSubtitle}>
            Great job! You sorted all {total}{' '}
            items correctly.
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleNewRound}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              New Round
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Draggable Items */}

          <View
            style={styles.itemsWrap}
            key={roundKey}
          >
            {round.items.map((item) => (
              <DraggableItem
                key={`${roundKey}-${item.label}`}
                label={item.label}
                zone={item.zone}
                zoneLayouts={zoneLayouts}
                onPlaced={handlePlaced}
              />
            ))}
          </View>

          {/* Drop Zones */}

          <View style={styles.zonesRow}>
            {/* Zone A */}

            <View
              style={[
                styles.zone,
                styles.zoneA,
              ]}
              onLayout={(event) => {
                /*
                 * onLayout ensures the component
                 * has been rendered.
                 */
                const target =
                  event.target;

                setTimeout(() => {
                  measureZone(
                    'A',
                    target
                  );
                }, 0);
              }}
              onStartShouldSetResponder={() =>
                false
              }
              pointerEvents="box-only"
            >
              <Text style={styles.zoneLabel}>
                {round.zoneA}
              </Text>

              <Text style={styles.zoneHint}>
                Drop Here
              </Text>
            </View>

            {/* Zone B */}

            <View
              style={[
                styles.zone,
                styles.zoneB,
              ]}
              onLayout={(event) => {
                const target =
                  event.target;

                setTimeout(() => {
                  measureZone(
                    'B',
                    target
                  );
                }, 0);
              }}
              onStartShouldSetResponder={() =>
                false
              }
              pointerEvents="box-only"
            >
              <Text style={styles.zoneLabel}>
                {round.zoneB}
              </Text>

              <Text style={styles.zoneHint}>
                Drop Here
              </Text>
            </View>
          </View>

          {/* Restart */}

          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleNewRound}
            activeOpacity={0.8}
          >
            <Text style={styles.restartText}>
              New Round
            </Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

export default DragDropScreen;

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
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
    marginTop: 5,
  },

  /* ---------------------------------------------------
     Items
  --------------------------------------------------- */

  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    alignItems: 'center',

    gap: 10,

    paddingHorizontal: 20,

    marginTop: 4,
    marginBottom: 30,

    /*
     * Allows dragged items to appear above
     * other content.
     */
    zIndex: 20,

    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          touchAction: 'none',
        } as any)
      : {}),
  },

  item: {
    backgroundColor: COLORS.primary,

    minHeight: 46,

    paddingHorizontal: 18,
    paddingVertical: 12,

    borderRadius: 12,

    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 100,

    elevation: 5,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,

    /*
     * Prevent browser from selecting text
     * instead of dragging.
     */
    ...(Platform.OS === 'web'
      ? ({
          touchAction: 'none',
          userSelect: 'none',
          cursor: 'grab',
        } as any)
      : {}),
  },

  itemDragging: {
    zIndex: 1000,
    elevation: 15,

    transform: [
      {
        scale: 1.08,
      },
    ],

    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grabbing',
        } as any)
      : {}),
  },

  itemPlaced: {
    backgroundColor: '#DCFCE7',

    borderWidth: 1,
    borderColor: COLORS.success,

    minHeight: 46,

    paddingHorizontal: 18,
    paddingVertical: 12,

    borderRadius: 12,

    justifyContent: 'center',
    alignItems: 'center',
  },

  itemWrong: {
    backgroundColor: COLORS.error,
  },

  itemText: {
    color: COLORS.white,

    fontWeight: '700',

    fontSize: 14,

    textAlign: 'center',

    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
        } as any)
      : {}),
  },

  itemPlacedText: {
    color: '#166534',
  },

  /* ---------------------------------------------------
     Zones
  --------------------------------------------------- */

  zonesRow: {
    flexDirection: 'row',

    gap: 12,

    paddingHorizontal: 20,

    zIndex: 1,
  },

  zone: {
    flex: 1,

    minHeight: 150,

    borderRadius: 16,

    borderWidth: 2,

    borderStyle: 'dashed',

    alignItems: 'center',
    justifyContent: 'center',

    padding: 20,
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
    fontSize: 17,

    fontWeight: '700',

    color: COLORS.textPrimary,

    textAlign: 'center',
  },

  zoneHint: {
    marginTop: 7,

    fontSize: 11,

    color: COLORS.textSecondary,
  },

  /* ---------------------------------------------------
     New Round
  --------------------------------------------------- */

  restartButton: {
    alignSelf: 'center',

    marginTop: 24,

    backgroundColor: COLORS.white,

    borderWidth: 1,

    borderColor: COLORS.border,

    paddingHorizontal: 26,

    paddingVertical: 11,

    borderRadius: 22,

    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as any)
      : {}),
  },

  restartText: {
    color: COLORS.textPrimary,

    fontWeight: '600',

    fontSize: 14,
  },

  /* ---------------------------------------------------
     Win
  --------------------------------------------------- */

  winBox: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
    paddingVertical: 50,
  },

  winEmoji: {
    fontSize: 60,

    marginBottom: 12,
  },

  winTitle: {
    fontSize: 24,

    fontWeight: '700',

    color: COLORS.textPrimary,

    textAlign: 'center',
  },

  winSubtitle: {
    fontSize: 14,

    color: COLORS.textSecondary,

    textAlign: 'center',

    marginTop: 8,

    marginBottom: 24,
  },

  actionButton: {
    backgroundColor: COLORS.primary,

    paddingHorizontal: 28,

    paddingVertical: 12,

    borderRadius: 22,

    minWidth: 130,

    alignItems: 'center',
  },

  actionButtonText: {
    color: COLORS.white,

    fontSize: 14,

    fontWeight: '700',
  },
});