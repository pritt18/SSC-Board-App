import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { executeQuery } from '../../database/database';
import { useAuth } from '../../context/AuthContext';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfViewer'>;

interface PdfItem {
  id: number;
  subject_id: number;
  title_english: string;
  description_english: string | null;
  pdf_url: string;
  sort_order: number;
}

const PdfViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { subjectId } = route.params;
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // -----------------------------------------
  // LOAD PDFs FROM LOCAL DATABASE
  // (filtered by the student's medium — 'both' PDFs always show)
  // -----------------------------------------
  const loadPdfs = async () => {
    try {
      setIsLoading(true);
      const studentMedium = user?.medium || 'english';
      const pdfData = await executeQuery(
        `SELECT id, subject_id, title_english, description_english, pdf_url, sort_order 
         FROM pdfs 
         WHERE subject_id = ? AND is_active = 1 
           AND (medium = ? OR medium = 'both' OR medium IS NULL)
         ORDER BY sort_order ASC, id ASC`,
        [subjectId, studentMedium]
      );
      
      setPdfs(pdfData as PdfItem[]);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPdfs();
    }, [subjectId])
  );

  // -----------------------------------------
  // NAVIGATE TO IN-APP PDF VIEWER
  // -----------------------------------------
  const handlePdfPress = (pdf: PdfItem) => {
    if (!pdf.pdf_url) {
      Alert.alert('Not Available', 'The URL for this PDF is missing.');
      return;
    }

    navigation.navigate('PdfDisplay', {
      pdfId: pdf.id,
      pdfUrl: pdf.pdf_url,
      title: pdf.title_english,
    });
  };

  // -----------------------------------------
  // LOADING UI
  // -----------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Study Materials...</Text>
      </SafeAreaView>
    );
  }

  // -----------------------------------------
  // MAIN UI
  // -----------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>Subject Learning</Text>
            <Text style={styles.title}>PDF Materials</Text>
          </View>
        </View>

        {/* PDF List or Empty State */}
        {pdfs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No PDFs Available</Text>
            <Text style={styles.emptyText}>Materials will be added soon.</Text>
          </View>
        ) : (
          <View style={styles.pdfList}>
            {pdfs.map((pdf) => (
              <Pressable
                key={pdf.id}
                onPress={() => handlePdfPress(pdf)}
                style={({ pressed }) => [
                  styles.pdfCard,
                  pressed && styles.pressedCard,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.pdfIcon}>📄</Text>
                </View>

                <View style={styles.pdfInfo}>
                  <Text style={styles.pdfLabel}>Study Material</Text>
                  <Text style={styles.pdfTitle}>{pdf.title_english}</Text>
                  
                  {pdf.description_english && (
                    <Text style={styles.description} numberOfLines={2}>
                      {pdf.description_english}
                    </Text>
                  )}
                  
                  <Text style={styles.openText}>Read Now →</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PdfViewerScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.background 
  },
  loadingText: { 
    marginTop: 12, 
    color: COLORS.textSecondary 
  },
  content: { 
    padding: 20, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  backText: { 
    fontSize: 32, 
    color: COLORS.textPrimary, 
    marginTop: -4 
  },
  headerContent: { 
    flex: 1 
  },
  headerLabel: { 
    color: COLORS.primary, 
    fontSize: 13, 
    fontWeight: '600' 
  },
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginTop: 3 
  },
  pdfList: { 
    gap: 14 
  },
  pdfCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    borderRadius: 18, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  pressedCard: { 
    opacity: 0.75 
  },
  iconContainer: { 
    width: 58, 
    height: 58, 
    borderRadius: 16, 
    backgroundColor: COLORS.primaryLight, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  pdfIcon: { 
    fontSize: 27 
  },
  pdfInfo: { 
    flex: 1, 
    marginLeft: 15 
  },
  pdfLabel: { 
    color: COLORS.primary, 
    fontSize: 11, 
    fontWeight: '600' 
  },
  pdfTitle: { 
    color: COLORS.textPrimary, 
    fontSize: 16, 
    fontWeight: '700', 
    marginTop: 3 
  },
  description: { 
    color: COLORS.textSecondary, 
    fontSize: 11, 
    lineHeight: 16, 
    marginTop: 4 
  },
  openText: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 6 
  },
  emptyContainer: { 
    backgroundColor: COLORS.white, 
    borderRadius: 18, 
    padding: 35, 
    alignItems: 'center' 
  },
  emptyIcon: { 
    fontSize: 45 
  },
  emptyTitle: { 
    color: COLORS.textPrimary, 
    fontSize: 18, 
    fontWeight: '700', 
    marginTop: 15 
  },
  emptyText: { 
    color: COLORS.textSecondary, 
    fontSize: 13, 
    textAlign: 'center', 
    marginTop: 6 
  },
});