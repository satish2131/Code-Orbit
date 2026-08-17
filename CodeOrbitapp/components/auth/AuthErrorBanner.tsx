import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthErrorBannerProps {
  title?: string;
  message?: string;
  onDismiss?: () => void;
  style?: object;
}

export const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({
  title = 'Unable to proceed',
  message,
  onDismiss,
  style,
}) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={20} color="#EF4444" />
      </View>
      <View style={styles.textContainer}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  iconContainer: {
    marginRight: 10,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: '#FCA5A5',
    fontSize: 12.5,
    lineHeight: 17,
  },
});
