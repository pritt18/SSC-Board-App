import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'LinkChild'>;

interface StudentRow {
  id: number;
  full_name: string;
  email: string;
  class_number: number | null;
  parent_id: number | null;
  parent_name: string | null;
}

const LinkChildScreen: React.FC<Props> = ({ navigation, route }) => {
  const { parentId } = route.params;

  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<number | null>(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT
           s.id,
           s.full_name,
           s.email,
           c.class_number,
           s.parent_id,
           p.full_name as parent_name
         FROM users s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN users p ON s.parent_id = p.id
         WHERE s.role = 'student'
           AND (s.full_name LIKE ? OR s.email LIKE ?)
         ORDER BY s.full_name ASC`,
        [`%${search}%`, `%${search}%`]
      );
      setStudents(rows as StudentRow[]);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [search])
  );

  const handleLink = async (student: StudentRow) => {
    const proceed = async () => {
      setLinkingId(student.id);
      try {
        await executeQuery(`UPDATE users SET parent_id = ? WHERE id = ?`, [
          parentId,
          student.id,
        ]);
        Alert.alert('Linked', `${student.full_name} is now linked to this parent.`);
        loadStudents();
      } catch (error) {
        Alert.alert('Error', 'Failed to link student.');
      } finally {
        setLinkingId(null);
      }
    };

    if (student.parent_id && student.parent_id !== parentId) {
      Alert.alert(
        'Already Linked',
        `${student.full_name} is already linked to ${student.parent_name || 'another parent'}. Re-link to this parent instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-link', onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Link Child</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name or email..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students found.</Text>
          }
          renderItem={({ item }) => {
            const alreadyLinkedHere = item.parent_id === parentId;
            return (
              <View style={styles.studentCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{item.full_name}</Text>
                  <Text style={styles.studentMeta}>
                    {item.email}
                    {item.class_number ? ` • Class ${item.class_number}` : ''}
                  </Text>
                  {item.parent_id && (
                    <Text style={styles.linkedMeta}>
                      {alreadyLinkedHere
                        ? '✓ Linked to this parent'
                        : `Linked to: ${item.parent_name || 'another parent'}`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.linkButton,
                    alreadyLinkedHere && styles.linkButtonDisabled,
                  ]}
                  disabled={alreadyLinkedHere || linkingId === item.id}
                  onPress={() => handleLink(item)}
                >
                  <Text style={styles.linkButtonText}>
                    {alreadyLinkedHere
                      ? 'Linked'
                      : linkingId === item.id
                      ? '...'
                      : 'Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default LinkChildScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    marginTop: -4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  searchWrap: {
    padding: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    padding: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 30,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  studentMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  linkedMeta: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  linkButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  linkButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
