/**
 * src/home/components/ManifestoSection.tsx
 * Split-layout manifesto on cinema culture and collective vision.
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { THEME } from '../../screening/constants/theme';

export const ManifestoSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  return (
    <View style={[styles.manifestoContainer, isDesktop ? styles.rowLayout : styles.colLayout]}>
      {/* Left Column */}
      <View style={styles.leftCol}>
        <Text style={styles.tag}>THE MANIFESTO</Text>
        <Text style={styles.heading}>
          Cinema is not a spectator sport.{'\n'}It is a shared pulse.
        </Text>
      </View>

      {/* Right Column */}
      <View style={styles.rightCol}>
        <Text style={styles.bodyText}>
          We are student directors, writers, cinematographers, sound designers, and cinephiles.
          Daydreamers exists to dismantle the barrier between watching a film and creating one.
        </Text>
        <Text style={styles.bodyText}>
          From midnight guerrilla shoots to high-contrast 35mm projection sessions in D Block,
          every frame is an inquiry into light, narrative, and human frequency.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  manifestoContainer: {
    paddingVertical: 80,
    paddingHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    gap: 40
  },
  rowLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  colLayout: {
    flexDirection: 'column'
  },
  leftCol: {
    flex: 1,
    maxWidth: 480
  },
  tag: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12
  },
  heading: {
    color: THEME.colors.cream,
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont
  },
  rightCol: {
    flex: 1,
    maxWidth: 520,
    gap: 16
  },
  bodyText: {
    color: THEME.colors.cream,
    fontSize: 15,
    lineHeight: 26,
    opacity: 0.85
  }
});
