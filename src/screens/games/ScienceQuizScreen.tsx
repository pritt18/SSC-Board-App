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
    title: 'General Science',
    questions: [
      { text: 'What gas do plants absorb from the air?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], answer: 'Carbon Dioxide' },
      { text: 'What is the boiling point of water?', options: ['90°C', '100°C', '110°C', '120°C'], answer: '100°C' },
      { text: 'What is the chemical symbol for water?', options: ['O2', 'CO2', 'H2O', 'NaCl'], answer: 'H2O' },
      { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 'Mars' },
      { text: 'What force pulls objects toward Earth?', options: ['Magnetism', 'Friction', 'Gravity', 'Tension'], answer: 'Gravity' },
      { text: 'What is the freezing point of water?', options: ['0°C', '10°C', '-10°C', '5°C'], answer: '0°C' },
      { text: 'Which gas do we breathe in to survive?', options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Helium'], answer: 'Oxygen' },
      { text: 'What is the closest star to Earth?', options: ['Sirius', 'Proxima Centauri', 'The Sun', 'Polaris'], answer: 'The Sun' },
      { text: 'How many planets are in our solar system?', options: ['7', '8', '9', '10'], answer: '8' },
      { text: 'What natural satellite orbits the Earth?', options: ['Mars', 'The Sun', 'The Moon', 'Venus'], answer: 'The Moon' },
    ],
  },
  {
    title: 'Human Body',
    questions: [
      { text: 'How many bones are in the human body?', options: ['186', '206', '226', '246'], answer: '206' },
      { text: 'Which organ pumps blood in the body?', options: ['Lungs', 'Liver', 'Heart', 'Kidney'], answer: 'Heart' },
      { text: 'Which organ helps us breathe?', options: ['Heart', 'Lungs', 'Stomach', 'Kidney'], answer: 'Lungs' },
      { text: 'Which organ filters waste from the blood?', options: ['Liver', 'Kidney', 'Heart', 'Lungs'], answer: 'Kidney' },
      { text: 'What is the largest organ in the human body?', options: ['Heart', 'Liver', 'Skin', 'Brain'], answer: 'Skin' },
      { text: 'Which part of the body controls all our actions?', options: ['Heart', 'Brain', 'Lungs', 'Stomach'], answer: 'Brain' },
      { text: 'How many chambers does the human heart have?', options: ['2', '3', '4', '5'], answer: '4' },
      { text: 'What carries oxygen in our blood?', options: ['White blood cells', 'Platelets', 'Red blood cells', 'Plasma'], answer: 'Red blood cells' },
      { text: 'How many teeth does an adult human normally have?', options: ['28', '30', '32', '34'], answer: '32' },
      { text: 'Which sense organ helps us to see?', options: ['Ear', 'Nose', 'Eye', 'Tongue'], answer: 'Eye' },
    ],
  },
  {
    title: 'Plants & Animals',
    questions: [
      { text: 'Which part of the plant makes food?', options: ['Root', 'Stem', 'Leaf', 'Flower'], answer: 'Leaf' },
      { text: 'What is the process by which plants make food called?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Germination'], answer: 'Photosynthesis' },
      { text: 'Which part of the plant absorbs water from soil?', options: ['Leaf', 'Flower', 'Root', 'Stem'], answer: 'Root' },
      { text: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 'Lion' },
      { text: 'Which animal is the tallest in the world?', options: ['Elephant', 'Giraffe', 'Camel', 'Horse'], answer: 'Giraffe' },
      { text: 'Which is the largest mammal on Earth?', options: ['Elephant', 'Blue Whale', 'Shark', 'Giraffe'], answer: 'Blue Whale' },
      { text: 'What do we call animals that eat only plants?', options: ['Carnivores', 'Herbivores', 'Omnivores', 'Predators'], answer: 'Herbivores' },
      { text: 'What do bees collect from flowers?', options: ['Water', 'Nectar', 'Leaves', 'Soil'], answer: 'Nectar' },
      { text: 'Which gas do plants release during photosynthesis?', options: ['Carbon Dioxide', 'Nitrogen', 'Oxygen', 'Hydrogen'], answer: 'Oxygen' },
      { text: 'What is a baby dog called?', options: ['Cub', 'Kitten', 'Puppy', 'Calf'], answer: 'Puppy' },
    ],
  },
  {
    title: 'Physics Basics',
    questions: [
      { text: 'What instrument is used to measure temperature?', options: ['Barometer', 'Thermometer', 'Speedometer', 'Odometer'], answer: 'Thermometer' },
      { text: 'What force keeps us stuck to the ground?', options: ['Friction', 'Magnetism', 'Gravity', 'Tension'], answer: 'Gravity' },
      { text: 'What do we call the study of matter and energy?', options: ['Biology', 'Chemistry', 'Physics', 'Geography'], answer: 'Physics' },
      { text: 'Which of these is a source of light?', options: ['Moon', 'Sun', 'Mirror', 'Table'], answer: 'Sun' },
      { text: 'Sound cannot travel through which of these?', options: ['Air', 'Water', 'Vacuum', 'Solid'], answer: 'Vacuum' },
      { text: 'What is the unit used to measure electric current?', options: ['Volt', 'Watt', 'Ampere', 'Ohm'], answer: 'Ampere' },
      { text: 'A magnet attracts which type of material?', options: ['Wood', 'Plastic', 'Iron', 'Glass'], answer: 'Iron' },
      { text: 'What do we call a push or pull on an object?', options: ['Energy', 'Force', 'Work', 'Power'], answer: 'Force' },
      { text: 'Which simple machine is a see-saw an example of?', options: ['Pulley', 'Lever', 'Wheel', 'Screw'], answer: 'Lever' },
      { text: 'What travels faster: sound or light?', options: ['Sound', 'Light', 'Both equal', 'Neither'], answer: 'Light' },
    ],
  },
  {
    title: 'Chemistry Basics',
    questions: [
      { text: 'What is the chemical symbol for common salt?', options: ['H2O', 'NaCl', 'CO2', 'O2'], answer: 'NaCl' },
      { text: 'What is the chemical symbol for Oxygen?', options: ['O', 'Ox', 'O2', 'On'], answer: 'O2' },
      { text: 'Which gas makes up most of the Earth\'s atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer: 'Nitrogen' },
      { text: 'What do we call a substance that cannot be broken into simpler substances?', options: ['Compound', 'Mixture', 'Element', 'Solution'], answer: 'Element' },
      { text: 'What is formed when two or more elements combine chemically?', options: ['Mixture', 'Compound', 'Solution', 'Alloy'], answer: 'Compound' },
      { text: 'Which of these is an example of a mixture?', options: ['Water', 'Salt', 'Sand and water', 'Oxygen'], answer: 'Sand and water' },
      { text: 'What is the pH of pure water?', options: ['5', '7', '9', '3'], answer: '7' },
      { text: 'Rusting of iron is an example of which change?', options: ['Physical change', 'Chemical change', 'No change', 'Temporary change'], answer: 'Chemical change' },
      { text: 'What is the process of a liquid turning into gas called?', options: ['Condensation', 'Evaporation', 'Freezing', 'Melting'], answer: 'Evaporation' },
      { text: 'What do we call substances used to speed up a reaction?', options: ['Reactants', 'Catalysts', 'Products', 'Solvents'], answer: 'Catalysts' },
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

const ScienceQuizScreen: React.FC<any> = ({ navigation }) => {
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
        <Text style={styles.title}>Science Quiz</Text>
        {!finished && (
          <Text style={styles.progress}>
            {round.title} • Question {index + 1} of {TOTAL_QUESTIONS} • Score: {score}
          </Text>
        )}
      </View>

      {finished ? (
        <View style={styles.winBox}>
          <Text style={styles.winEmoji}>🔬</Text>
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

export default ScienceQuizScreen;

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
