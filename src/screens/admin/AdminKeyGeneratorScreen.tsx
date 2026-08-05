// src/screens/admin/AdminKeyGeneratorScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { executeQuery } from '../../database/database';
import { UserModel } from '../../database/models/User';
import { generateLicenseForStudent } from '../../services/licenseService';
import { COLORS } from '../../constants/colors';

const AdminKeyGeneratorScreen = ({ navigation, route }: any) => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      const studentData = await UserModel.findByRole('student');
      setStudents(studentData);

      const classData = await executeQuery(
        `SELECT id, class_number, name_english FROM classes ORDER BY class_number ASC`,
        []
      );
      setClasses(classData);

      const preselected = route?.params?.preselectedStudentId;
      if (preselected) setSelectedStudentId(preselected);

      setIsLoadingData(false);
    })();
  }, [route?.params?.preselectedStudentId]);

  const handleGenerateKey = async () => {
    if (!selectedStudentId) {
      Alert.alert('Error', 'Please select a student.');
      return;
    }
    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class.');
      return;
    }

    const cls = classes.find((c) => c.id === selectedClassId);
    if (!cls) return;

    setIsLoading(true);
    try {
      const newKey = await generateLicenseForStudent(selectedStudentId, selectedClassId, cls.class_number);
      await executeQuery(`UPDATE users SET class_id = ? WHERE id = ?`, [selectedClassId, selectedStudentId]);

      setGeneratedKey(newKey);
      Alert.alert('Success 🎉', 'License key generated and saved successfully!');
    } catch (error) {
      console.error('Generation Error:', error);
      Alert.alert('Error', 'Failed to generate license key.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin: Generate Key 🔑</Text>
        <Text style={styles.subtitle}>Create offline activation keys for students.</Text>

        <Text style={styles.label}>Select Student</Text>
        <View style={styles.chipWrap}>
          {students.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedStudentId(s.id)}
              style={[styles.chip, selectedStudentId === s.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedStudentId === s.id && styles.chipTextSelected]}>
                {s.full_name}
              </Text>
            </TouchableOpacity>
          ))}
          {students.length === 0 && <Text style={styles.emptyText}>No students registered yet.</Text>}
        </View>

        <Text style={styles.label}>Select Class</Text>
        <View style={styles.chipWrap}>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedClassId(c.id)}
              style={[styles.chip, selectedClassId === c.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedClassId === c.id && styles.chipTextSelected]}>
                {c.name_english}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleGenerateKey} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Generate Key</Text>}
        </TouchableOpacity>

        {generatedKey !== '' && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Generated Key:</Text>
            <Text style={styles.resultKey}>{generatedKey}</Text>
            <Text style={styles.hintText}>Share this with the student to activate offline.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.surface, padding: 24, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginTop: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
  button: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resultContainer: { marginTop: 20, padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center' },
  resultLabel: { fontSize: 12, color: COLORS.primary, marginBottom: 4 },
  resultKey: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1, textAlign: 'center' },
  hintText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
});

export default AdminKeyGeneratorScreen;