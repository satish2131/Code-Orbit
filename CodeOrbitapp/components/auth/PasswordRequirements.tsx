import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_COLORS } from '../../constants';

interface PasswordRequirementsProps {
  password: string;
  visible?: boolean;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  visible = true,
}) => {
  if (!visible) return null;

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const rules = [
    { label: '8+ characters', valid: hasMinLength },
    { label: 'Upper & lowercase letter', valid: hasUpper && hasLower },
    { label: 'At least one number', valid: hasNumber },
  ];

  return (
    <View style={styles.container}>
      {rules.map((rule, idx) => (
        <View key={idx} style={styles.ruleItem}>
          <Ionicons
            name={rule.valid ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={rule.valid ? '#10B981' : '#6B7280'}
            style={styles.ruleIcon}
          />
          <Text style={[styles.ruleText, rule.valid && styles.ruleTextValid]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIcon: {
    marginRight: 6,
  },
  ruleText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ruleTextValid: {
    color: '#10B981',
    fontWeight: '500',
  },
});
