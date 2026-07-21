import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

const QuizScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        ❓ Quiz
      </Text>

      <Text style={styles.subtitle}>
        Quiz questions will be displayed here.
      </Text>
    </View>
  );
};

export default QuizScreen;

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