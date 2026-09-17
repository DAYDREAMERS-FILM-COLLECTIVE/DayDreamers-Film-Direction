/**
 * src/menu/components/MenuFooter.tsx
 * Pinned bottom metadata: Daydreamers Film Society tagline, and socials.
 * Styled in Screening Deep Plum and Rosé Gold tokens.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useLayoutStore } from '../../core/store/useLayoutStore';

interface MenuFooterProps {
  isRevealed?: boolean;
}

export const MenuFooter: React.FC<MenuFooterProps> = ({ isRevealed = true }) => {
  const { setRoute, hideMenu, setTransitioning, setCursor, resetCursor } = useLayoutStore();

  const navigateTo = (route: 'screening' | 'admin') => {
    hideMenu();
    setTransitioning(true);
    setTimeout(() => {
      setRoute(route);
    }, 800);
  };

  return (
    <View style={[styles.footerRow, isRevealed && styles.footerRevealed]}>
      {/* Left: Film Society Tagline */}
      <View style={styles.leftCol}>
        <Text style={styles.tagline}>Daydreamers Film Society</Text>
      </View>

      {/* Right: Social & Navigation Links */}
      <View style={styles.rightContent}>
        <View style={styles.socialRow}>
          <Pressable
            onPress={() => Linking.openURL('mailto:hello@daydreamers.club').catch(() => {})}
            onHoverIn={() => setCursor('OPEN', 'EMAIL')}
            onHoverOut={resetCursor}
          >
            <Text style={styles.socialText}>Email</Text>
          </Pressable>
          <Text style={styles.separator}>/</Text>
          <Pressable
            onPress={() => navigateTo('admin')}
            onHoverIn={() => setCursor('OPEN', 'ADMIN')}
            onHoverOut={resetCursor}
          >
            <Text style={styles.socialText}>Admin</Text>
          </Pressable>
          <Text style={styles.separator}>/</Text>
          <Pressable
            onPress={() => navigateTo('screening')}
            onHoverIn={() => setCursor('GO', 'RESERVE')}
            onHoverOut={resetCursor}
          >
            <Text style={styles.socialText}>Reserve</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerRow: {
    position: 'absolute',
    left: 45,
    right: 45,
    bottom: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    opacity: 0,
    transform: [{ translateY: 40 }]
  },
  footerRevealed: {
    opacity: 1,
    transform: [{ translateY: 0 }]
  },
  leftCol: {
    justifyContent: 'flex-end'
  },
  tagline: {
    color: 'rgba(200, 155, 178, 0.55)',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase'
  },
  rightContent: {
    alignItems: 'flex-end'
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  socialText: {
    color: 'rgba(200, 155, 178, 0.55)',
    fontSize: 11,
    letterSpacing: 0.8
  },
  separator: {
    color: 'rgba(200, 155, 178, 0.22)',
    fontSize: 11
  }
});
