import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useParentChild } from '../../context/ParentChildContext';

const ChildSwitcher: React.FC = () => {
  const { children, selectedChildId, setSelectedChildId, loading } =
    useParentChild();

  if (loading || children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return (
      <View style={styles.singleWrap}>
        <Text style={styles.singleText}>
          Viewing: {children[0].full_name}
          {children[0].class_number ? ` (Class ${children[0].class_number})` : ''}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children.map((child) => {
        const active = child.id === selectedChildId;
        return (
          <TouchableOpacity
            key={child.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setSelectedChildId(child.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {child.full_name}
              {child.class_number ? ` • C${child.class_number}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default ChildSwitcher;

const styles = StyleSheet.create({
  singleWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  singleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  row: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
