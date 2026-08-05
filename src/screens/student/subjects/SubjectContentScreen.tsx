import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { executeQuery } from '../../../database/database';
import { COLORS } from '../../../constants/colors';

const SubjectContentScreen = ({ route }: any) => {
  // मागच्या स्क्रीनवरून आलेली subject_id आणि subjectName
  const { subjectId, subjectName } = route.params || { subjectId: 1, subjectName: 'Subject' };
  
  const [activeTab, setActiveTab] = useState<'videos' | 'pdfs'>('videos');
  const [videoList, setVideoList] = useState<any[]>([]);
  const [pdfList, setPdfList] = useState<any[]>([]);

  useEffect(() => {
    fetchSubjectContent();
  }, [subjectId]);

  // डेटाबेस मधून डेटा आणण्याची क्वेरी
  const fetchSubjectContent = async () => {
    try {
      // १. व्हिडिओ फेच करणे
      const videos = await executeQuery(
        `SELECT * FROM videos WHERE subject_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
        [subjectId]
      );
      setVideoList(videos || []);

      // २. पीडीएफ फेच करणे
      const pdfs = await executeQuery(
        `SELECT * FROM pdfs WHERE subject_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
        [subjectId]
      );
      setPdfList(pdfs || []);

    } catch (error) {
      console.log('Error fetching content:', error);
    }
  };

  // व्हिडिओ किंवा पीडीएफ ओपन करण्यासाठी
  const handleOpenItem = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    } else {
      alert('File link available nahi hai.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{subjectName}</Text>
      </View>

      {/* Tab Switcher (Videos / PDFs) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]} 
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>🎬 Videos ({videoList.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pdfs' && styles.activeTab]} 
          onPress={() => setActiveTab('pdfs')}
        >
          <Text style={[styles.tabText, activeTab === 'pdfs' && styles.activeTabText]}>📄 PDFs ({pdfList.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {activeTab === 'videos' ? (
          videoList.length === 0 ? (
            <Text style={styles.noDataText}>No videos available for this subject.</Text>
          ) : (
            videoList.map((item, index) => (
              <TouchableOpacity key={index} style={styles.card} onPress={() => handleOpenItem(item.video_url)}>
                <Text style={styles.cardIcon}>▶️</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{item.title_english}</Text>
                  {item.title_marathi ? <Text style={styles.cardSubTitle}>{item.title_marathi}</Text> : null}
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          pdfList.length === 0 ? (
            <Text style={styles.noDataText}>No PDFs available for this subject.</Text>
          ) : (
            pdfList.map((item, index) => (
              <TouchableOpacity key={index} style={styles.card} onPress={() => handleOpenItem(item.pdf_url)}>
                <Text style={styles.cardIcon}>📥</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{item.title_english}</Text>
                  {item.title_marathi ? <Text style={styles.cardSubTitle}>{item.title_marathi}</Text> : null}
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.white, gap: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  activeTabText: { color: COLORS.white },
  listContainer: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  cardSubTitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  noDataText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 15 }
});

export default SubjectContentScreen;