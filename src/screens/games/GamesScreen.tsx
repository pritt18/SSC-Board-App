import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

const GamesScreen: React.FC = () => {
  const { t } = useLanguage();

  const games = [
    { id: 1, name: 'Crossword', icon: '🧩', description: 'Solve educational crosswords' },
    { id: 2, name: 'Memory Match', icon: '🧠', description: 'Test your memory skills' },
    { id: 3, name: 'Word Search', icon: '🔍', description: 'Find hidden words' },
    { id: 4, name: 'Math Game', icon: '➕', description: 'Practice math skills' },
    { id: 5, name: 'Science Quiz', icon: '🔬', description: 'Test science knowledge' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Educational Games</Text>
        <Text style={styles.subtitle}>Learn while having fun!</Text>
      </View>

      <View style={styles.gamesGrid}>
        {games.map((game) => (
          <TouchableOpacity key={game.id} style={styles.gameCard}>
            <Text style={styles.gameIcon}>{game.icon}</Text>
            <Text style={styles.gameName}>{game.name}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>More games coming soon!</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
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
    backgroundColor: 'white',
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
  },
  gameIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  comingSoon: {
    padding: 20,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default GamesScreen;