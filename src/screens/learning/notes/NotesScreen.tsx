import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../../constants/colors';
import { executeQuery } from '../../../database/database';

import {
  LearningStackParamList,
} from '../../../navigation/navigationTypes';

type Props = NativeStackScreenProps<
  LearningStackParamList,
  'Notes'
>;

interface NoteItem {
  id: number;
  subject_id: number;
  chapter_number: number;
  name_english: string;
  name_marathi: string;
  notes_url: string | null;
}

const NotesScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { subjectId } = route.params;

  const [notes, setNotes] =
    useState<NoteItem[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const loadNotes = async () => {
    try {
      setIsLoading(true);

      const noteData = await executeQuery(
        `
        SELECT
          id,
          subject_id,
          chapter_number,
          name_english,
          name_marathi,
          notes_url
        FROM chapters
        WHERE subject_id = ?
          AND is_active = ?
          AND notes_url IS NOT NULL
        ORDER BY chapter_number ASC
        `,
        [subjectId, 1],
      );

      console.log(
        'Notes loaded for subject:',
        subjectId,
        noteData,
      );

      setNotes(noteData as NoteItem[]);
    } catch (error) {
      console.error(
        'Error loading notes:',
        error,
      );

      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [subjectId]),
  );

  const handleNotePress = (
    note: NoteItem,
  ) => {
    console.log(
      'Selected note:',
      note.notes_url,
    );

    // Offline/local note opening will be added here.
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading notes...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>
              Subject Learning
            </Text>

            <Text style={styles.title}>
              Notes
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Study Notes
        </Text>

        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              📒
            </Text>

            <Text style={styles.emptyTitle}>
              No Notes Available
            </Text>

            <Text style={styles.emptyText}>
              Notes for this subject have not been added yet.
            </Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map(note => (
              <Pressable
                key={note.id}
                onPress={() =>
                  handleNotePress(note)
                }
                style={({ pressed }) => [
                  styles.noteCard,
                  pressed &&
                    styles.pressedCard,
                ]}
              >
                <View
                  style={styles.iconContainer}
                >
                  <Text style={styles.noteIcon}>
                    📒
                  </Text>
                </View>

                <View style={styles.noteInfo}>
                  <Text
                    style={styles.chapterLabel}
                  >
                    Chapter {note.chapter_number}
                  </Text>

                  <Text style={styles.noteTitle}>
                    {note.name_english}
                  </Text>

                  <Text style={styles.openText}>
                    Open Notes →
                  </Text>
                </View>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    marginTop: -4,
  },

  headerContent: {
    flex: 1,
  },

  headerLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 18,
  },

  notesList: {
    gap: 14,
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pressedCard: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteIcon: {
    fontSize: 27,
  },

  noteInfo: {
    flex: 1,
    marginLeft: 15,
  },

  chapterLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  noteTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },

  openText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  arrow: {
    fontSize: 28,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 45,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 15,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
});