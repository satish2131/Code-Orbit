import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APP_COLORS } from '../../constants';

interface ParticipantAvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export const ParticipantAvatar: React.FC<ParticipantAvatarProps> = React.memo(({
  name,
  size = 48,
  color = APP_COLORS.primary,
}) => {
  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
});
