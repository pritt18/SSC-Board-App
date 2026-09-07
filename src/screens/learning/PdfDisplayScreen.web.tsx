import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';
import { resolveFileUri } from '../../utils/fileStorage';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

// Web build: the PDF's stored reference may be an "idb://..." pointer
// (see src/utils/fileStorage.ts) rather than a real file:// path, so
// it first needs to be resolved into a blob: URL the browser can
// actually load, which the browser can then render natively inside
// an <iframe>.
const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfUrl, title } = route.params;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!pdfUrl) {
        setError('No PDF file was found for this item.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const uri = await resolveFileUri(pdfUrl);
        objectUrl = uri;
        if (!cancelled) setResolvedUrl(uri);
      } catch (err) {
        console.error('Error resolving PDF for web:', err);
        if (!cancelled) {
          setError(
            (err as any)?.message ||
              'Could not load this PDF from browser storage.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      // Release the blob URL once we navigate away from this PDF.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title || 'PDF Document'}</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading PDF...</Text>
        </View>
      ) : error || !resolvedUrl ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        // @ts-ignore -- react-native-web passes plain DOM tags straight through
        <iframe
          src={resolvedUrl}
          title={title || 'PDF Document'}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        />
      )}
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backText: { fontSize: 32, color: COLORS.textPrimary, marginTop: -4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  statusText: { marginTop: 14, color: COLORS.textSecondary, fontSize: 14 },
  errorIcon: { fontSize: 50, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  errorText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
});
