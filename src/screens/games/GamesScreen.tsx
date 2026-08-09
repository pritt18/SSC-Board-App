import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../constants/colors';

interface Game {
  id: number;
  name: string;
  icon: string;
  description: string;
  type: 'crossword' | 'memory' | 'wordsearch' | 'math' | 'science' | 'sudoku' | 'geography' | 'matchpair' | 'dragdrop';
}

const GamesScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [games] = useState<Game[]>([
    { 
      id: 1, 
      name: 'Crossword', 
      icon: '🧩', 
      description: 'Solve educational crosswords',
      type: 'crossword'
    },
    { 
      id: 2, 
      name: 'Memory Match', 
      icon: '🧠', 
      description: 'Test your memory skills',
      type: 'memory'
    },
    { 
      id: 3, 
      name: 'Word Search', 
      icon: '🔍', 
      description: 'Find hidden words',
      type: 'wordsearch'
    },
    { 
      id: 4, 
      name: 'Math Challenge', 
      icon: '➕', 
      description: 'Practice math skills',
      type: 'math'
    },
    { 
      id: 5, 
      name: 'Science Quiz', 
      icon: '🔬', 
      description: 'Test science knowledge',
      type: 'science'
    },
    { 
      id: 6, 
      name: 'Sudoku', 
      icon: '🔢', 
      description: 'Classic number puzzle',
      type: 'sudoku'
    },
    { 
      id: 7, 
      name: 'Geography Puzzle', 
      icon: '🌍', 
      description: 'Explore geography facts',
      type: 'geography'
    },
    { 
      id: 8, 
      name: 'Match the Pair', 
      icon: '🔗', 
      description: 'Match items with their pairs',
      type: 'matchpair'
    },
    { 
      id: 9, 
      name: 'Drag & Drop', 
      icon: '🖐️', 
      description: 'Sort items into the right box',
      type: 'dragdrop'
    },
  ]);

  const handleGamePress = (game: Game) => {
    if (game.type === 'memory') {
      navigation.navigate('MemoryMatch');
      return;
    }
    if (game.type === 'crossword') {
      navigation.navigate('Crossword');
      return;
    }
    if (game.type === 'sudoku') {
      navigation.navigate('Sudoku');
      return;
    }
    if (game.type === 'wordsearch') {
      navigation.navigate('WordSearch');
      return;
    }
    if (game.type === 'math') {
      navigation.navigate('MathGame');
      return;
    }
    if (game.type === 'science') {
      navigation.navigate('ScienceQuiz');
      return;
    }
    if (game.type === 'geography') {
      navigation.navigate('GeographyPuzzle');
      return;
    }
    if (game.type === 'matchpair') {
      navigation.navigate('MatchThePair');
      return;
    }
    if (game.type === 'dragdrop') {
      navigation.navigate('DragDrop');
      return;
    }

    Alert.alert(
      'Coming Soon!',
      `${game.name} will be available soon. Stay tuned!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Educational Games</Text>
          <Text style={styles.subtitle}>Learn while having fun!</Text>
        </View>

        {/* Games Grid */}
        <View style={styles.gamesGrid}>
          {games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGamePress(game)}
              activeOpacity={0.7}
            >
              <Text style={styles.gameIcon}>{game.icon}</Text>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDescription}>{game.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming Soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>More games coming soon!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  gamesGrid: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  gameDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  comingSoon: {
    padding: 20,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

export default GamesScreen;