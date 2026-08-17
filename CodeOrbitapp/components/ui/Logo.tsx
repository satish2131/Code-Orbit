import React from 'react';
import { View, StyleSheet } from 'react-native';
import { APP_COLORS } from '../../constants';

interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = React.memo(({ size = 80 }) => {
  const iconSize = size * 0.4;
  const bracketHeight = iconSize * 0.75;
  const slashHeight = iconSize;
  const bracketWidth = size * 0.03;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.2 }]}>
      <View style={styles.icon}>
        <View style={[styles.bracket1, { height: bracketHeight, width: bracketWidth }]} />
        <View style={[styles.slash, { height: slashHeight, width: bracketWidth }]} />
        <View style={[styles.bracket2, { height: bracketHeight, width: bracketWidth }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bracket1: {
    backgroundColor: '#fff',
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  slash: {
    backgroundColor: '#fff',
    borderRadius: 2,
    marginHorizontal: 4,
  },
  bracket2: {
    backgroundColor: '#fff',
    borderRadius: 2,
    transform: [{ rotate: '-15deg' }],
  },
});
