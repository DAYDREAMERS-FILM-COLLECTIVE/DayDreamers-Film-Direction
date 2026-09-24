/**
 * src/core/components/Footer.tsx
 * Society footer with emblem and membership manifesto.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../screening/constants/theme';

export const Footer: React.FC = () => {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerLogo}>DAYDREAMERS</Text>
      <Text style={styles.footerText}>
        An initiative of The Daydreamers Society. Screened by members, for members.
      </Text>
      <Text style={styles.footerSub}>
        D Block &bull; Campus Cinema &bull; 21:00 Showtimes
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    alignItems: 'center',
    backgroundColor: THEME.colors.bg
  },
  footerLogo: {
    color: THEME.colors.gold,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8
  },
  footerText: {
    color: THEME.colors.cream,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
    opacity: 0.8
  },
  footerSub: {
    color: THEME.colors.muted,
    fontSize: 11,
    letterSpacing: 1
  }
});
