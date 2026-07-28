import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Pdf from 'react-native-pdf';
import { Asset } from 'expo-asset'; 

import { COLORS } from '../../constants/colors';
import { LearningStackParamList } from '../../navigation/navigationTypes';

type Props = NativeStackScreenProps<LearningStackParamList, 'PdfDisplay'>;

// --------------------------------------------------------
// LOCAL PDFs 
// --------------------------------------------------------
const LOCAL_PDFS: Record<number, any> = {
  1: require('../../../assets/pdfs/sample.pdf'), 
};

const PdfDisplayScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pdfId, title } = route.params;
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  useEffect(() => {
    const loadPdfAsset = async () => {
      try {
        const sourceFile = LOCAL_PDFS[pdfId];
        if (sourceFile) {
          const asset = await Asset.loadAsync(sourceFile);
          setPdfPath(asset[0].localUri || asset[0].uri);
        }
      } catch (error) {
        console.log("Asset load error:", error);
      }
    };
    
    loadPdfAsset();
  }, [pdfId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {/* PDF Content Area */}
      {!pdfPath ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Study Material...</Text>
        </View>
      ) : (
        <View style={styles.pdfContainer}>
          <Pdf
            source={{ uri: pdfPath, cache: true }}
            onLoadComplete={(numberOfPages) => console.log(`Loaded ${numberOfPages} pages`)}
            onError={(error) => {
              console.log('PDF Render Error ===>', error);
              Alert.alert('Error', 'PDF render nahi ho paayi.');
            }}
            trustAllCerts={false}
            style={styles.pdfViewer}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default PdfDisplayScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white, elevation: 2 
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backText: { fontSize: 32, color: COLORS.textPrimary, marginTop: -4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '500' },
  pdfContainer: { flex: 1, backgroundColor: '#ececec' },
  pdfViewer: { flex: 1, width: '100%', height: '100%' }
});