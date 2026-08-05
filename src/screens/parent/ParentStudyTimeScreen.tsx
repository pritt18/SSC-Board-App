import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useParentChild } from '../../context/ParentChildContext';
import ChildSwitcher from '../../components/parent/ChildSwitcher';

interface SubjectTime {
  subject_name: string;
  total_millis: number;
}

const formatDuration = (millis: number): string => {
  const totalMinutes = Math.round(millis / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return '< 1 min';
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
};

const ParentStudyTimeScreen: React.FC = () => {
  const { selectedChild, loading: childrenLoading } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [bySubject, setBySubject] = useState<SubjectTime[]>([]);
  const [totalMillis, setTotalMillis] = useState(0);

  const loadStudyTime = async () => {
    if (!selectedChild) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Video watch position is the best available proxy for study time
      // in this schema (there's no separate per-session time log yet).
      const rows = await executeQuery(
        `SELECT
           s.name_english as subject_name,
           SUM(vp.position_millis) as total_millis
         FROM video_progress vp
         JOIN videos v ON vp.video_id = v.id
         JOIN subjects s ON v.subject_id = s.id
         WHERE vp.user_id = ?
         GROUP BY s.id
         ORDER BY total_millis DESC`,
        [selectedChild.id]
      );
      const list = rows as SubjectTime[];
      setBySubject(list);
      setTotalMillis(list.reduce((sum, r) => sum + (r.total_millis || 0), 0));
    } catch (error) {
      console.error('Error loading study time:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudyTime();
    }, [selectedChild?.id])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Time</Text>
        <Text style={styles.subtitle}>Based on video watch activity</Text>
      </View>

      <ChildSwitcher />

      {childrenLoading || loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{formatDuration(totalMillis)}</Text>
            <Text style={styles.totalLabel}>Total time spent watching videos</Text>
          </View>

          <Text style={styles.sectionTitle}>By Subject</Text>

          {bySubject.length === 0 ? (
            <Text style={styles.emptyText}>
              No video activity recorded yet for this child.
            </Text>
          ) : (
            bySubject.map((row) => (
              <View key={row.subject_name} style={styles.subjectRow}>
                <Text style={styles.subjectName}>{row.subject_name}</Text>
                <Text style={styles.subjectTime}>
                  {formatDuration(row.total_millis)}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.footnote}>
            Note: this reflects time spent within video lessons only. PDF
            reading and quiz time aren't tracked yet.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ParentStudyTimeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalValue: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
  },
  totalLabel: {
    fontSize: 12,
    color: '#DBEAFE',
    marginTop: 6,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subjectTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footnote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
