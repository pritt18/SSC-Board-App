import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { LicenseService } from '../../services/licenseService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'GenerateLicense'>;

interface ClassItem {
  id: number;
  class_number: number;
  name_english: string;
}

type Mode = 'single' | 'bulk';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const GenerateLicenseScreen: React.FC<Props> = ({ navigation }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [mode, setMode] = useState<Mode>('single');
  const [quantity, setQuantity] = useState('10');
  const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD, blank = lifetime
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const rows = await executeQuery(
        `SELECT id, class_number, name_english FROM classes WHERE is_active = 1 ORDER BY class_number ASC`,
        []
      );
      setClasses(rows as ClassItem[]);
      if (rows.length > 0 && selectedClassId === null) {
        setSelectedClassId((rows[0] as ClassItem).id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [])
  );

  const validateExpiry = (): string | null | 'invalid' => {
    if (!expiryDate.trim()) return null; // lifetime license
    if (!DATE_REGEX.test(expiryDate.trim())) return 'invalid';
    const parsed = new Date(expiryDate.trim());
    if (isNaN(parsed.getTime())) return 'invalid';
    return expiryDate.trim();
  };

  const handleGenerate = async () => {
    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class first.');
      return;
    }

    const expiry = validateExpiry();
    if (expiry === 'invalid') {
      Alert.alert('Invalid Date', 'Please enter expiry date as YYYY-MM-DD, e.g. 2027-04-30, or leave blank for a lifetime license.');
      return;
    }

    setGenerating(true);
    setGeneratedKeys([]);
    try {
      if (mode === 'single') {
        const key = await LicenseService.createLicense(selectedClassId, expiry);
        setGeneratedKeys([key]);
        Alert.alert('Success', 'License generated successfully.');
      } else {
        const qty = parseInt(quantity, 10);
        if (!qty || qty < 1 || qty > 100) {
          Alert.alert('Invalid Quantity', 'Please enter a quantity between 1 and 100.');
          setGenerating(false);
          return;
        }
        const keys = await LicenseService.createBulkLicenses(selectedClassId, qty, expiry);
        setGeneratedKeys(keys);
        Alert.alert('Success', `${keys.length} licenses generated successfully.`);
      }
    } catch (error) {
      console.error('Error generating license(s):', error);
      Alert.alert('Error', 'Failed to generate license(s). Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedKeys([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Generate Licenses</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class selection */}
        <Text style={styles.sectionLabel}>Select Class</Text>
        {loadingClasses ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : classes.length === 0 ? (
          <Text style={styles.emptyText}>No classes found. Please add a class first.</Text>
        ) : (
          <View style={styles.chipRow}>
            {classes.map((cls) => (
              <Pressable
                key={cls.id}
                onPress={() => setSelectedClassId(cls.id)}
                style={[
                  styles.chip,
                  selectedClassId === cls.id && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedClassId === cls.id && styles.chipTextSelected,
                  ]}
                >
                  Class {cls.class_number}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Mode selection */}
        <Text style={styles.sectionLabel}>Generation Mode</Text>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('single')}
            style={[styles.modeButton, mode === 'single' && styles.modeButtonSelected]}
          >
            <Text style={[styles.modeButtonText, mode === 'single' && styles.modeButtonTextSelected]}>
              Single License
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('bulk')}
            style={[styles.modeButton, mode === 'bulk' && styles.modeButtonSelected]}
          >
            <Text style={[styles.modeButtonText, mode === 'bulk' && styles.modeButtonTextSelected]}>
              Bulk Licenses
            </Text>
          </Pressable>
        </View>

        {mode === 'bulk' && (
          <Input
            label="Quantity (1-100)"
            placeholder="e.g. 10"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
        )}

        <Input
          label="Expiry Date (YYYY-MM-DD, leave blank for lifetime)"
          placeholder="e.g. 2027-04-30"
          value={expiryDate}
          onChangeText={setExpiryDate}
          autoCapitalize="none"
        />

        <Button
          title={generating ? 'Generating...' : mode === 'single' ? 'Generate License' : 'Generate Licenses'}
          onPress={handleGenerate}
          disabled={generating || !selectedClassId}
          loading={generating}
        />

        {/* Generated keys */}
        {generatedKeys.length > 0 && (
          <View style={styles.resultBox}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {generatedKeys.length} License{generatedKeys.length > 1 ? 's' : ''} Generated
              </Text>
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.resultHint}>Long-press a code to select and copy it.</Text>
            {generatedKeys.map((key, index) => (
              <View key={key} style={styles.keyRow}>
                <Text style={styles.keyIndex}>{index + 1}.</Text>
                <Text style={styles.keyText} selectable>
                  {key}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GenerateLicenseScreen;

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
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  modeButtonSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  modeButtonTextSelected: {
    color: COLORS.primary,
  },
  resultBox: {
    marginTop: 26,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  resultHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  keyIndex: {
    width: 28,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  keyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
});
