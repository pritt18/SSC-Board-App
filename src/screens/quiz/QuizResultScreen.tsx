import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

const QuizResultScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        🏆 Quiz Result
      </Text>

      <Text style={styles.subtitle}>
        Your quiz result will be displayed here.
      </Text>
    </View>
  );
};

export default QuizResultScreen;

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