import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

const QuizListScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        📝 Quiz List
      </Text>

      <Text style={styles.subtitle}>
        Chapter quizzes will be displayed here.
      </Text>
    </View>
  );
};

export default QuizListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});