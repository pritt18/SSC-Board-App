import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface SentNotification {
  title_english: string;
  message_english: string;
  created_at: string;
  recipient_count: number;
}

const TeacherNotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SentNotification[]>([]);

  const loadHistory = async () => {
    if (!user?.class_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Group past sends by title+timestamp so a broadcast to many students
      // shows as one entry with a recipient count.
      const rows = await executeQuery(
        `SELECT n.title_english, n.message_english, n.created_at, COUNT(*) as recipient_count
         FROM notifications n
         JOIN users u ON n.user_id = u.id
         WHERE u.class_id = ? AND u.role = 'student'
         GROUP BY n.title_english, n.message_english, n.created_at
         ORDER BY n.created_at DESC
         LIMIT 20`,
        [user.class_id]
      );
      setHistory(rows as SentNotification[]);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user?.class_id])
  );

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing Info', 'Please enter both a title and a message.');
      return;
    }
    if (!user?.class_id) {
      Alert.alert('No Class', 'You need to be assigned a class first.');
      return;
    }

    setSending(true);
    try {
      const students = await executeQuery(
        `SELECT id FROM users WHERE role = 'student' AND class_id = ?`,
        [user.class_id]
      );

      if (students.length === 0) {
        Alert.alert('No Students', 'There are no students in your class yet.');
        setSending(false);
        return;
      }

      for (const s of students as { id: number }[]) {
        await executeQuery(
          `INSERT INTO notifications (user_id, title_english, title_marathi, message_english, message_marathi, type, is_read)
           VALUES (?, ?, ?, ?, ?, 'info', 0)`,
          [s.id, title.trim(), title.trim(), message.trim(), message.trim()]
        );
      }

      Alert.alert('Sent!', `Notification sent to ${students.length} student(s).`);
      setTitle('');
      setMessage('');
      loadHistory();
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Send Notification</Text>
        <Text style={styles.subtitle}>Broadcast a message to your entire class</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.title_english}-${item.created_at}-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.composeBox}>
            <Input label="Title" placeholder="e.g. Test tomorrow" value={title} onChangeText={setTitle} />
            <Input
              label="Message"
              placeholder="Write your message to the class..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
            <Button
              title={sending ? 'Sending...' : 'Send to Class'}
              onPress={handleSend}
              disabled={sending}
              loading={sending}
            />
            <Text style={styles.historyLabel}>Recently Sent</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 10 }} color={COLORS.primary} />
          ) : (
            <Text style={styles.emptyText}>No notifications sent yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.title_english}</Text>
            <Text style={styles.historyMessage}>{item.message_english}</Text>
            <Text style={styles.historyMeta}>
              Sent to {item.recipient_count} student(s) •{' '}
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default TeacherNotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 40 },
  composeBox: { marginBottom: 10 },
  historyLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 26, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 10 },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  historyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  historyMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },
  historyMeta: { fontSize: 11, color: COLORS.primary, marginTop: 6, fontWeight: '600' },
});
