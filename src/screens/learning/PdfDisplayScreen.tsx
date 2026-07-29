import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfId, pdfUrl, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert local PDF to base64 for WebView
  const [pdfData, setPdfData] = useState<string | null>(null);

  React.useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If it's a local file (starts with file://)
        if (pdfUrl && pdfUrl.startsWith('file://')) {
          const base64 = await FileSystem.readAsStringAsync(pdfUrl, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setPdfData(base64);
        } else if (pdfUrl) {
          // For web URLs, use the URL directly
          setPdfData(null);
        }
      } catch (err) {
        setError('Failed to load PDF');
        console.error('PDF load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Generate HTML for PDF viewing
  const getPdfHtml = (base64Data: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #f5f5f5; }
            embed { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <embed src="data:application/pdf;base64,${base64Data}" type="application/pdf" />
        </body>
      </html>
    `;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title || 'PDF Document'}</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>Unable to Load PDF</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      ) : pdfData ? (
        // Local PDF with base64
        <WebView
          source={{ html: getPdfHtml(pdfData) }}
          style={styles.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState={true}
        />
      ) : pdfUrl ? (
        // Online PDF or local URL
        <WebView
          source={{ uri: pdfUrl }}
          style={styles.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState={true}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>No PDF Found</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    marginTop: -4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});