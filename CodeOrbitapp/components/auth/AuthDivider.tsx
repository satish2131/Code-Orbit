import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AUTH_COLORS } from '../../constants';

interface AuthDividerProps {
  label?: string;
  style?: object;
}

export const AuthDivider: React.FC<AuthDividerProps> = ({ label = 'OR', style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  text: {
    color: AUTH_COLORS.textMuted || '#a3a3a3',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
});
