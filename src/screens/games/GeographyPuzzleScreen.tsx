import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

interface Question {
  text: string;
  options: string[];
  answer: string;
}

interface QuestionSet {
  title: string;
  questions: Question[];
}

const QUESTION_SETS: QuestionSet[] = [
  {
    title: 'World Geography',
    questions: [
      { text: 'Which is the largest continent?', options: ['Africa', 'Asia', 'Europe', 'Antarctica'], answer: 'Asia' },
      { text: 'Which is the smallest continent?', options: ['Europe', 'Australia', 'Antarctica', 'South America'], answer: 'Australia' },
      { text: 'Which ocean is the largest in the world?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 'Pacific' },
      { text: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], answer: 'Nile' },
      { text: 'Which is the tallest mountain in the world?', options: ['K2', 'Kangchenjunga', 'Mount Everest', 'Makalu'], answer: 'Mount Everest' },
      { text: 'Which desert is the largest hot desert in the world?', options: ['Thar', 'Gobi', 'Sahara', 'Kalahari'], answer: 'Sahara' },
      { text: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'Japan', 'Thailand', 'Korea'], answer: 'Japan' },
      { text: 'Which country has the largest population in the world?', options: ['USA', 'China', 'India', 'Russia'], answer: 'India' },
      { text: 'Which is the largest country in the world by area?', options: ['China', 'USA', 'Canada', 'Russia'], answer: 'Russia' },
      { text: 'Which line divides the Earth into Northern and Southern Hemispheres?', options: ['Prime Meridian', 'Tropic of Cancer', 'Equator', 'International Date Line'], answer: 'Equator' },
    ],
  },
  {
    title: 'Indian Geography',
    questions: [
      { text: 'What is the capital of India?', options: ['Mumbai', 'Kolkata', 'New Delhi', 'Chennai'], answer: 'New Delhi' },
      { text: 'Which is the longest river in India?', options: ['Yamuna', 'Godavari', 'Ganga', 'Narmada'], answer: 'Ganga' },
      { text: 'Which mountain range separates India from China?', options: ['Aravalli', 'Western Ghats', 'Himalayas', 'Vindhya'], answer: 'Himalayas' },
      { text: 'Which is the smallest state in India by area?', options: ['Goa', 'Sikkim', 'Tripura', 'Kerala'], answer: 'Goa' },
      { text: 'Which desert is located in Rajasthan?', options: ['Thar Desert', 'Sahara Desert', 'Gobi Desert', 'Kalahari Desert'], answer: 'Thar Desert' },
      { text: 'Which is the southernmost point of India?', options: ['Kanyakumari', 'Chennai', 'Rameswaram', 'Kochi'], answer: 'Kanyakumari' },
      { text: 'Which Indian state is known as the "Spice Garden of India"?', options: ['Kerala', 'Goa', 'Tamil Nadu', 'Karnataka'], answer: 'Kerala' },
      { text: 'How many states does India currently have?', options: ['26', '28', '29', '31'], answer: '28' },
      { text: 'Which is the highest mountain peak in India?', options: ['Nanda Devi', 'Kangchenjunga', 'K2', 'Annapurna'], answer: 'Kangchenjunga' },
      { text: 'Which river is known as the "Sorrow of Bihar"?', options: ['Ganga', 'Kosi', 'Yamuna', 'Son'], answer: 'Kosi' },
    ],
  },
  {
    title: 'Maharashtra & States',
    questions: [
      { text: 'What is the capital of Maharashtra?', options: ['Pune', 'Nagpur', 'Mumbai', 'Nashik'], answer: 'Mumbai' },
      { text: 'Which is the winter capital of Maharashtra?', options: ['Pune', 'Nagpur', 'Aurangabad', 'Kolhapur'], answer: 'Nagpur' },
      { text: 'Which hill station is known as the "Queen of Hill Stations" in Maharashtra?', options: ['Lonavala', 'Mahabaleshwar', 'Matheran', 'Panchgani'], answer: 'Mahabaleshwar' },
      { text: 'What is the capital of Karnataka?', options: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru'], answer: 'Bengaluru' },
      { text: 'What is the capital of Gujarat?', options: ['Ahmedabad', 'Surat', 'Gandhinagar', 'Vadodara'], answer: 'Gandhinagar' },
      { text: 'What is the capital of West Bengal?', options: ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri'], answer: 'Kolkata' },
      { text: 'Which river flows through Nashik and Pune region?', options: ['Krishna', 'Godavari', 'Tapi', 'Bhima'], answer: 'Godavari' },
      { text: 'Which is the largest city in Maharashtra by population?', options: ['Pune', 'Nagpur', 'Mumbai', 'Thane'], answer: 'Mumbai' },
      { text: 'Which caves, a UNESCO World Heritage Site, are located in Maharashtra?', options: ['Ellora Caves', 'Elephanta Caves', 'Ajanta Caves', 'All of these'], answer: 'All of these' },
      { text: 'What is the state language of Maharashtra?', options: ['Hindi', 'Gujarati', 'Marathi', 'Konkani'], answer: 'Marathi' },
    ],
  },
  {
    title: 'Rivers & Mountains',
    questions: [
      { text: 'Which river is called the "Ganges of the South"?', options: ['Krishna', 'Godavari', 'Kaveri', 'Tungabhadra'], answer: 'Godavari' },
      { text: 'The Western Ghats run along which coast of India?', options: ['East Coast', 'West Coast', 'North Coast', 'South Coast'], answer: 'West Coast' },
      { text: 'Which river originates from Triyambakeshwar, Maharashtra?', options: ['Krishna', 'Godavari', 'Narmada', 'Tapi'], answer: 'Godavari' },
      { text: 'Which mountain range is located in South India?', options: ['Himalayas', 'Aravalli', 'Western Ghats', 'Vindhya'], answer: 'Western Ghats' },
      { text: 'Which river flows through Gujarat and forms the Gulf of Khambhat?', options: ['Narmada', 'Tapi', 'Sabarmati', 'Mahi'], answer: 'Narmada' },
      { text: 'Which is the highest waterfall in India?', options: ['Jog Falls', 'Dudhsagar Falls', 'Nohkalikai Falls', 'Athirapally Falls'], answer: 'Nohkalikai Falls' },
      { text: 'The Aravalli Range is mainly located in which state?', options: ['Punjab', 'Rajasthan', 'Haryana', 'Gujarat'], answer: 'Rajasthan' },
      { text: 'Which sea lies to the west of the Indian Peninsula?', options: ['Bay of Bengal', 'Arabian Sea', 'Andaman Sea', 'Laccadive Sea'], answer: 'Arabian Sea' },
      { text: 'Which bay lies to the east of the Indian Peninsula?', options: ['Arabian Sea', 'Bay of Bengal', 'Persian Gulf', 'Gulf of Mannar'], answer: 'Bay of Bengal' },
      { text: 'Which strait separates India and Sri Lanka?', options: ['Bering Strait', 'Palk Strait', 'Malacca Strait', 'Torres Strait'], answer: 'Palk Strait' },
    ],
  },
  {
    title: 'Capitals & Countries',
    questions: [
      { text: 'What is the capital of France?', options: ['Lyon', 'Paris', 'Marseille', 'Nice'], answer: 'Paris' },
      { text: 'What is the capital of Japan?', options: ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], answer: 'Tokyo' },
      { text: 'What is the capital of Egypt?', options: ['Alexandria', 'Cairo', 'Giza', 'Luxor'], answer: 'Cairo' },
      { text: 'What is the capital of Russia?', options: ['St. Petersburg', 'Moscow', 'Kazan', 'Sochi'], answer: 'Moscow' },
      { text: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 'Canberra' },
      { text: 'What is the capital of the United States?', options: ['New York', 'Los Angeles', 'Washington D.C.', 'Chicago'], answer: 'Washington D.C.' },
      { text: 'What is the capital of the United Kingdom?', options: ['Manchester', 'London', 'Liverpool', 'Birmingham'], answer: 'London' },
      { text: 'What is the capital of China?', options: ['Shanghai', 'Beijing', 'Hong Kong', 'Guangzhou'], answer: 'Beijing' },
      { text: 'What is the capital of Nepal?', options: ['Pokhara', 'Kathmandu', 'Lalitpur', 'Biratnagar'], answer: 'Kathmandu' },
      { text: 'What is the capital of Sri Lanka?', options: ['Colombo', 'Kandy', 'Sri Jayawardenepura Kotte', 'Galle'], answer: 'Sri Jayawardenepura Kotte' },
    ],
  },
];

const TOTAL_QUESTIONS = 10;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickSet = (): QuestionSet => {
  const set = QUESTION_SETS[Math.floor(Math.random() * QUESTION_SETS.length)];
  return { title: set.title, questions: shuffle(set.questions) };
};

const GeographyPuzzleScreen: React.FC<any> = ({ navigation }) => {
  const [round, setRound] = useState(pickSet());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const current = round.questions[index];
  const finished = index >= TOTAL_QUESTIONS;

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === current.answer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    setAnswered(false);
    setIndex((i) => i + 1);
  };

  const handleRestart = () => {
    setRound(pickSet());
    setIndex(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Geography Puzzle</Text>
        {!finished && (
          <Text style={styles.progress}>
            {round.title} • Question {index + 1} of {TOTAL_QUESTIONS} • Score: {score}
          </Text>
        )}
      </View>

      {finished ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🌍</Text>
          <Text style={styles.winTitle}>
            You scored {score}/{TOTAL_QUESTIONS}
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleRestart}>
            <Text style={styles.actionButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{current.text}</Text>
          </View>

          {current.options.map((option) => {
            const isCorrect = option === current.answer;
            const isPicked = option === selected;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answered && isCorrect && styles.optionCorrect,
                  answered && isPicked && !isCorrect && styles.optionWrong,
                ]}
                onPress={() => handleSelect(option)}
                disabled={answered}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}

          {answered && (
            <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
              <Text style={styles.actionButtonText}>
                {index === TOTAL_QUESTIONS - 1 ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default GeographyPuzzleScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  progress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  content: { padding: 20 },
  questionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  questionText: { fontSize: 18, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  optionButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionCorrect: { backgroundColor: '#DCFCE7', borderColor: COLORS.success },
  optionWrong: { backgroundColor: '#FEE2E2', borderColor: COLORS.error },
  optionText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  actionButton: {
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
  },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  winBox: { alignItems: 'center', padding: 40 },
  winEmoji: { fontSize: 60 },
  winTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10, marginBottom: 10 },
});
