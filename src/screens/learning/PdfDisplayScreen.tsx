import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

// -----------------------------------------------------------------
// NOTE: Android's WebView has no built-in PDF plugin, so rendering a
// PDF inline via <embed>/<iframe> inside a WebView shows a BLANK
// white screen on most Android devices (a well-known limitation).
// The reliable, Expo-Go-compatible fix is to hand the local file off
// to the device's own PDF viewer using expo-sharing — Android shows
// an "Open with" chooser, iOS shows a native Quick Look preview.
// -----------------------------------------------------------------

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfUrl, title } = route.params;
  const [opening, setOpening] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openPdf = async () => {
    if (!pdfUrl) {
      setError('No PDF file was found for this item.');
      setOpening(false);
      return;
    }
    try {
      setOpening(true);
      setError(null);

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setError('Opening PDFs is not supported on this device.');
        return;
      }

      await Sharing.shareAsync(pdfUrl, {
        mimeType: 'application/pdf',
        dialogTitle: title || 'PDF Document',
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      console.error('Error opening PDF:', err);
      setError('Failed to open the PDF. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    openPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title || 'PDF Document'}</Text>
      </View>

      <View style={styles.content}>
        {opening ? (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.statusText}>Opening PDF viewer...</Text>
          </>
        ) : error ? (
          <>
            <Text style={styles.errorIcon}>📄</Text>
            <Text style={styles.errorTitle}>Unable to Open PDF</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={openPdf}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
              <Text style={styles.backLinkText}>Go Back</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>📄</Text>
            <Text style={styles.errorTitle}>PDF Opened</Text>
            <Text style={styles.errorText}>
              If a viewer app opened, you can read the PDF there. You can also
              tap below to open it again.
            </Text>
            <Pressable style={styles.retryButton} onPress={openPdf}>
              <Text style={styles.retryButtonText}>Open Again</Text>
            </Pressable>
            <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
              <Text style={styles.backLinkText}>Go Back</Text>
            </Pressable>
          </>
        )}
      </View>
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
  content: {
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
  backLink: { marginTop: 14, padding: 8 },
  backLinkText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
});
