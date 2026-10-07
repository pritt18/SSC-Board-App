// src/screens/admin/EditSubjectScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AdminStackParamList, 'EditSubject'>;

const ICONS = ['📚', '📖', '🔬', '🧮', '🌍', '📝', '🎨', '🎵', '🏛️', '💡', '🧪', '📊'];

const EditSubjectScreen: React.FC<Props> = ({ navigation, route }) => {
  const { subjectId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameMarathi: '',
    icon: '📚',
  });
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await executeQuery(
        `SELECT 
          name_english,
          name_marathi,
          icon
        FROM subjects 
        WHERE id = ?`,
        [subjectId]
      );
      
      if (result.length > 0) {
        const subject = result[0];
        setFormData({
          name: subject.name_english || '',
          nameMarathi: subject.name_marathi || '',
          icon: subject.icon || '📚',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading subject:', {
        error: errorMessage,
        subjectId,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });
      Alert.alert('Error', `Failed to load subject: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Subject name is required');
      return;
    }

    setSaving(true);
    try {
      await executeQuery(
        `UPDATE subjects SET 
          name_english = ?,
          name_marathi = ?,
          icon = ?
        WHERE id = ?`,
        [
          formData.name,
          formData.nameMarathi || formData.name,
          formData.icon || '📚',
          subjectId
        ]
      );
      
      Alert.alert('Success', 'Subject updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error updating subject:', {
        error: errorMessage,
        subjectId,
        platform: typeof window !== 'undefined' ? 'web' : 'native'
      });
      Alert.alert('Error', `Failed to update subject: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading subject...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Subject</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Subject Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject Name (English) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject Name (Marathi)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject name in Marathi"
              value={formData.nameMarathi}
              onChangeText={(text) => setFormData({ ...formData, nameMarathi: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon</Text>
            <TouchableOpacity 
              style={styles.iconPicker}
              onPress={() => setShowIconPicker(!showIconPicker)}
            >
              <Text style={styles.iconDisplay}>{formData.icon || '📚'}</Text>
              <Text style={styles.iconPickerText}>Tap to select icon</Text>
              <Ionicons name={showIconPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#94A3B8" />
            </TouchableOpacity>

            {showIconPicker && (
              <View style={styles.iconGrid}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formData.icon === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, icon });
                      setShowIconPicker(false);
                    }}
                  >
                    <Text style={styles.iconOptionText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Update Subject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  iconPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  iconDisplay: {
    fontSize: 24,
    marginRight: 12,
  },
  iconPickerText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  iconOptionText: {
    fontSize: 24,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default EditSubjectScreen;