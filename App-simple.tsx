import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Productivity Scheduler</Text>
      <Text style={styles.subtitle}>App is working!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
});

export default App;